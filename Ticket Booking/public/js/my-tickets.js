// My Tickets Page Logic

let allBookings = [];
let activeTab = 'upcoming';

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication or prompt guest
    if (!Auth.isLoggedIn()) {
        const demoLoginLink = `<button class="btn btn-cinema-primary btn-sm mt-3" onclick="quickCustomerLogin()">Sign In as Demo Customer</button>`;
        document.getElementById('ticketsListContainer').innerHTML = `
            <div class="col-12 text-center py-5 glass-panel">
                <i class="fa-solid fa-lock text-warning fs-1 mb-3"></i>
                <h4 class="text-white">Sign In to View Tickets</h4>
                <p class="text-muted">Please log in to manage your active bookings and access digital QR passes.</p>
                <div class="d-flex justify-content-center gap-2">
                    <a href="/login.html" class="btn btn-cinema-primary">Sign In</a>
                    <a href="/login.html?tab=register" class="btn btn-cinema-secondary">Register</a>
                </div>
                ${demoLoginLink}
            </div>
        `;
        return;
    }

    setupTabs();
    await loadMyBookings();
});

async function quickCustomerLogin() {
    try {
        const res = await API.post('/auth/login', {
            email: 'customer@cinema.com',
            password: 'customer123'
        });
        Auth.setSession(res.token, res.user);
        window.location.reload();
    } catch (e) {
        window.location.href = '/login.html';
    }
}

async function loadMyBookings() {
    try {
        const res = await API.get('/bookings/my-bookings');
        allBookings = res.bookings || [];
        updateCountsAndRender();
    } catch (err) {
        console.error('Failed to load tickets:', err);
        document.getElementById('ticketsListContainer').innerHTML = `
            <div class="col-12 text-center py-5 text-danger">
                <p>Failed to load bookings. Please try again later.</p>
            </div>
        `;
    }
}

function updateCountsAndRender() {
    const todayStr = new Date().toISOString().split('T')[0];

    const upcoming = allBookings.filter(b => b.booking_status === 'Confirmed' && b.show_date >= todayStr);
    const past = allBookings.filter(b => b.booking_status !== 'Confirmed' || b.show_date < todayStr);

    document.getElementById('upcomingCount').textContent = upcoming.length;
    document.getElementById('pastCount').textContent = past.length;

    renderBookingList(activeTab === 'upcoming' ? upcoming : past);
}

function renderBookingList(bookings) {
    const container = document.getElementById('ticketsListContainer');

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 glass-panel text-muted">
                <i class="fa-solid fa-ticket-simple fs-1 text-secondary mb-3"></i>
                <h5 class="text-white">No ${activeTab} tickets found</h5>
                <p class="mb-3">Explore our latest movie releases and book seats with ease.</p>
                <a href="/movies.html" class="btn btn-cinema-primary">Browse Now Showing</a>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(b => {
        const isConfirmed = b.booking_status === 'Confirmed';
        const statusBadge = isConfirmed 
            ? `<span class="badge-status confirmed"><i class="fa-solid fa-circle-check"></i>Confirmed</span>`
            : (b.booking_status === 'Cancelled' 
                ? `<span class="badge-status cancelled"><i class="fa-solid fa-circle-xmark"></i>Cancelled</span>`
                : `<span class="badge-status paid">${b.booking_status}</span>`);

        return `
            <div class="col-lg-6">
                <div class="glass-panel p-4 h-100 d-flex flex-column animate-fade-in">
                    
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <span class="text-muted small">REF ID:</span>
                            <span class="fw-bold text-warning font-monospace ms-1">${b.booking_code}</span>
                        </div>
                        <div>${statusBadge}</div>
                    </div>

                    <div class="d-flex gap-3 mb-3">
                        <img src="${b.poster_url}" alt="${b.movie_title}" class="rounded shadow" style="width: 80px; height: 110px; object-fit: cover;">
                        <div class="flex-grow-1">
                            <h5 class="fw-bold text-white mb-1">${b.movie_title}</h5>
                            <div class="text-muted small mb-2"><i class="fa-solid fa-film text-danger me-1"></i>${b.hall_name} • ${b.hall_type}</div>
                            
                            <div class="row g-2 text-light small">
                                <div class="col-6">
                                    <div class="text-muted small">DATE & TIME</div>
                                    <div class="fw-semibold">${formatDate(b.show_date)} - ${formatTime(b.start_time)}</div>
                                </div>
                                <div class="col-6">
                                    <div class="text-muted small">SEATS (${b.total_seats})</div>
                                    <div class="fw-bold text-accent">${b.seatList}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="border-top border-secondary pt-3 mt-auto d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div>
                            <span class="text-muted small">Amount:</span>
                            <span class="fw-bold text-success ms-1">${formatCurrency(b.total_amount)}</span>
                            <span class="text-muted small ms-1">(${b.payment_method})</span>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-cinema-secondary btn-sm" onclick="showTicketModal('${b.booking_code}')">
                                <i class="fa-solid fa-qrcode me-1"></i>Digital Pass
                            </button>
                            ${isConfirmed ? `
                                <button class="btn btn-outline-danger btn-sm" onclick="cancelBookingPrompt(${b.id}, '${b.booking_code}')">
                                    <i class="fa-solid fa-ban me-1"></i>Cancel
                                </button>
                            ` : ''}
                        </div>
                    </div>

                </div>
            </div>
        `;
    }).join('');
}

function setupTabs() {
    const buttons = document.querySelectorAll('#ticketTabs button');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            updateCountsAndRender();
        });
    });
}

function showTicketModal(code) {
    const booking = allBookings.find(b => b.booking_code === code);
    if (!booking) return;

    const modalBody = document.getElementById('modalTicketBody');
    modalBody.innerHTML = `
        <div class="digital-ticket-card">
            <div class="ticket-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-2">
                    <i class="fa-solid fa-film text-danger fs-4"></i>
                    <div>
                        <h6 class="fw-bold text-white mb-0">CINEVERSE E-TICKET</h6>
                        <small class="text-muted">Digital Admission Pass</small>
                    </div>
                </div>
                <div class="text-end">
                    <div class="text-muted small">BOOKING ID</div>
                    <div class="fw-bold text-warning">${booking.booking_code}</div>
                </div>
            </div>
            <div class="ticket-body">
                <div class="row g-3 align-items-center">
                    <div class="col-sm-8">
                        <h5 class="fw-bold text-white mb-1">${booking.movie_title}</h5>
                        <div class="text-muted small mb-2">${booking.hall_name} (${booking.hall_type})</div>
                        <div class="text-light small mb-1"><i class="fa-regular fa-calendar me-1"></i>${formatDate(booking.show_date)} at ${formatTime(booking.start_time)}</div>
                        <div class="text-light small mb-2"><i class="fa-solid fa-couch me-1 text-primary"></i>Seats: <strong class="text-accent">${booking.seatList}</strong></div>
                        <div class="text-muted small">Guest: <span class="text-white">${booking.customer_name}</span></div>
                    </div>
                    <div class="col-sm-4 text-center">
                        <div class="ticket-qr-box shadow mb-1" id="modalQrBox"></div>
                        <small class="text-muted" style="font-size: 0.7rem;">Scan at entrance</small>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Render QR Code
    setTimeout(() => {
        const qrBox = document.getElementById('modalQrBox');
        if (qrBox && window.QRCode) {
            new QRCode(qrBox, {
                text: JSON.stringify({ code: booking.booking_code, seats: booking.seatList, movie: booking.movie_title }),
                width: 110,
                height: 110,
                colorDark: '#000',
                colorLight: '#fff'
            });
        }
    }, 100);

    const modal = new bootstrap.Modal(document.getElementById('ticketModal'));
    modal.show();
}

function cancelBookingPrompt(id, code) {
    Swal.fire({
        title: 'Cancel Booking?',
        text: `Are you sure you want to cancel booking ${code}? Your reserved seats will be released immediately and refund initiated.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#4B5563',
        confirmButtonText: 'Yes, Cancel Booking',
        background: '#161c2e',
        color: '#fff'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await API.post(`/bookings/${id}/cancel`, {});
                Toast.success(res.message || 'Booking cancelled.');
                await loadMyBookings();
            } catch (err) {
                Toast.error(err.message || 'Cancellation failed.');
            }
        }
    });
}
