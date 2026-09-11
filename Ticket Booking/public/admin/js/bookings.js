// Admin Booking Management Logic

let allBookings = [];
let detailModal = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAdmin('/login.html')) return;

    detailModal = new bootstrap.Modal(document.getElementById('bookingDetailModal'));

    setupEventListeners();
    await loadBookings();
});

async function loadBookings() {
    try {
        const search = document.getElementById('bookingSearchInput').value.trim();
        const status = document.getElementById('bookingStatusFilter').value;
        const date = document.getElementById('bookingDateFilter').value;

        let endpoint = '/admin/bookings?';
        if (status !== 'all') endpoint += `status=${status}&`;
        if (date) endpoint += `date=${date}&`;
        if (search) endpoint += `search=${encodeURIComponent(search)}&`;

        const res = await API.get(endpoint);
        allBookings = res.bookings || [];

        document.getElementById('bookingCountLabel').textContent = `Total: ${allBookings.length} Bookings`;
        renderTable(allBookings);

    } catch (err) {
        console.error('Failed to load bookings:', err);
        Toast.error('Failed to fetch bookings.');
    }
}

function renderTable(bookings) {
    const tbody = document.getElementById('bookingsTbody');

    if (bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No booking records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = bookings.map(b => {
        const isConfirmed = b.booking_status === 'Confirmed';
        const isCancelled = b.booking_status === 'Cancelled';
        const isCompleted = b.booking_status === 'Completed';

        let badgeClass = 'confirmed';
        if (isCancelled) badgeClass = 'cancelled';
        if (isCompleted) badgeClass = 'now_showing';

        return `
            <tr>
                <td>
                    <strong class="text-warning font-monospace">${b.booking_code}</strong>
                    <small class="text-muted d-block" style="font-size: 0.7rem;">${formatDate(b.created_at)}</small>
                </td>
                <td>
                    <div class="fw-bold text-white small">${b.customer_name}</div>
                    <small class="text-muted">${b.customer_email}</small>
                </td>
                <td>
                    <div class="text-light fw-semibold small">${b.movie_title}</div>
                    <small class="text-muted">${b.hall_name} • ${formatDate(sToDate(b.show_date))} ${formatTime(b.start_time)}</small>
                </td>
                <td>
                    <span class="badge bg-secondary mb-1">${b.total_seats} Seats</span>
                    <small class="text-accent d-block font-monospace" style="font-size: 0.75rem;">${b.seatList || 'N/A'}</small>
                </td>
                <td>
                    <strong class="text-success">${formatCurrency(b.total_amount)}</strong>
                    <small class="text-muted d-block" style="font-size: 0.7rem;">${b.payment_method}</small>
                </td>
                <td>
                    <span class="badge-status ${badgeClass}">${b.booking_status}</span>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-cinema-secondary me-1" onclick="openDetailsModal(${b.id})" title="View Details">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    ${!isCancelled ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="cancelBookingPrompt(${b.id}, '${b.booking_code}')" title="Cancel Booking">
                            <i class="fa-solid fa-ban"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function sToDate(d) {
    return d || new Date().toISOString().split('T')[0];
}

function setupEventListeners() {
    let debounceTimer;
    document.getElementById('bookingSearchInput').addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadBookings, 300);
    });

    document.getElementById('bookingStatusFilter').addEventListener('change', loadBookings);
    document.getElementById('bookingDateFilter').addEventListener('change', loadBookings);
}

function openDetailsModal(id) {
    const b = allBookings.find(item => item.id === id);
    if (!b) return;

    const content = document.getElementById('bookingDetailContent');
    content.innerHTML = `
        <div class="row g-4">
            <div class="col-md-7">
                <h6 class="text-muted text-uppercase small fw-bold mb-2">Customer & Screening</h6>
                <div class="p-3 rounded mb-3" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
                    <div class="mb-2"><strong class="text-white">Customer:</strong> ${b.customer_name} (${b.customer_email} / ${b.customer_phone || 'No phone'})</div>
                    <div class="mb-2"><strong class="text-white">Movie:</strong> ${b.movie_title}</div>
                    <div class="mb-2"><strong class="text-white">Cinema Hall:</strong> ${b.hall_name}</div>
                    <div class="mb-2"><strong class="text-white">Schedule:</strong> ${formatDate(b.show_date)} at ${formatTime(b.start_time)}</div>
                    <div><strong class="text-white">Assigned Seats:</strong> <span class="text-accent fw-bold font-monospace">${b.seatList}</span></div>
                </div>

                <h6 class="text-muted text-uppercase small fw-bold mb-2">Financial Breakdown</h6>
                <div class="p-3 rounded" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
                    <div class="d-flex justify-content-between small mb-1"><span class="text-muted">Subtotal:</span><span>${formatCurrency(b.subtotal)}</span></div>
                    <div class="d-flex justify-content-between small mb-1 text-success"><span class="text-muted">Discount:</span><span>-${formatCurrency(b.discount)}</span></div>
                    <div class="d-flex justify-content-between small mb-1"><span class="text-muted">Convenience Fee:</span><span>${formatCurrency(b.tax_fee)}</span></div>
                    <div class="d-flex justify-content-between fw-bold text-white fs-6 border-top border-secondary pt-2 mt-1">
                        <span>Total Paid:</span><span class="text-success">${formatCurrency(b.total_amount)}</span>
                    </div>
                </div>
            </div>

            <div class="col-md-5 text-center">
                <h6 class="text-muted text-uppercase small fw-bold mb-2">Digital Pass Preview</h6>
                <div class="p-3 bg-white rounded shadow-sm d-inline-block mb-2" id="modalAdminQr"></div>
                <div class="small font-monospace text-warning">${b.booking_code}</div>
                <div class="mt-3">
                    <label class="form-label text-muted small">Update Status</label>
                    <select class="form-select form-select-sm bg-dark text-white border-secondary" id="updateStatusSelect" onchange="updateBookingStatus(${b.id}, this.value)">
                        <option value="Confirmed" ${b.booking_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Completed" ${b.booking_status === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Cancelled" ${b.booking_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const qrBox = document.getElementById('modalAdminQr');
        if (qrBox && window.QRCode) {
            new QRCode(qrBox, {
                text: JSON.stringify({ code: b.booking_code, movie: b.movie_title, seats: b.seatList }),
                width: 120,
                height: 120,
                colorDark: '#000',
                colorLight: '#fff'
            });
        }
    }, 100);

    detailModal.show();
}

async function updateBookingStatus(id, newStatus) {
    try {
        await API.put(`/admin/bookings/${id}/status`, { status: newStatus });
        Toast.success(`Status updated to ${newStatus}`);
        detailModal.hide();
        await loadBookings();
    } catch (err) {
        Toast.error(err.message || 'Failed to update status.');
    }
}

function cancelBookingPrompt(id, code) {
    Swal.fire({
        title: `Cancel Booking ${code}?`,
        text: 'This will release the seats and mark the payment as refunded.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#4B5563',
        confirmButtonText: 'Yes, Cancel',
        background: '#161c2e',
        color: '#fff'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await API.post(`/bookings/${id}/cancel`, {});
                Toast.success('Booking cancelled and seats released.');
                await loadBookings();
            } catch (err) {
                Toast.error(err.message || 'Failed to cancel.');
            }
        }
    });
}
