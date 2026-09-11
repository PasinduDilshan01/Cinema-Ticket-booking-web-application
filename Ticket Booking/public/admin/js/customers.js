// Admin Customer Directory Logic

let allCustomers = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAdmin('/login.html')) return;

    setupEventListeners();
    await loadCustomers();
});

async function loadCustomers() {
    try {
        const search = document.getElementById('customerSearchInput').value.trim();
        let endpoint = '/admin/customers';
        if (search) endpoint += `?search=${encodeURIComponent(search)}`;

        const res = await API.get(endpoint);
        allCustomers = res.customers || [];

        document.getElementById('customerCountLabel').textContent = `Total: ${allCustomers.length} Customers`;
        renderTable(allCustomers);

    } catch (err) {
        console.error('Failed to load customers:', err);
        Toast.error('Failed to fetch customers.');
    }
}

function renderTable(customers) {
    const tbody = document.getElementById('customersTbody');

    if (customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No customers found.</td></tr>`;
        return;
    }

    tbody.innerHTML = customers.map(c => {
        const isActive = c.status === 'active';
        const statusBadge = isActive 
            ? `<span class="badge-status active"><i class="fa-solid fa-circle-check"></i>Active</span>`
            : `<span class="badge-status suspended"><i class="fa-solid fa-ban"></i>Suspended</span>`;

        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="rounded-circle bg-dark border border-secondary text-primary d-flex align-items-center justify-content-center fw-bold" style="width: 36px; height: 36px;">
                            ${c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="fw-bold text-white small">${c.name}</div>
                            <small class="text-muted">ID: #CUST-${c.id}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="text-light small">${c.email}</div>
                    <small class="text-muted">${c.phone || 'No phone provided'}</small>
                </td>
                <td><small class="text-light">${formatDate(c.created_at)}</small></td>
                <td><span class="badge bg-secondary">${c.total_bookings} Bookings</span></td>
                <td><strong class="text-success">${formatCurrency(c.total_spent)}</strong></td>
                <td>${statusBadge}</td>
                <td class="text-end">
                    ${isActive ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="toggleStatus(${c.id}, 'suspended', '${c.name.replace(/'/g, "\\'")}')" title="Suspend Account">
                            <i class="fa-solid fa-user-slash me-1"></i>Suspend
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-outline-success" onclick="toggleStatus(${c.id}, 'active', '${c.name.replace(/'/g, "\\'")}')" title="Activate Account">
                            <i class="fa-solid fa-user-check me-1"></i>Activate
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

function setupEventListeners() {
    let debounceTimer;
    document.getElementById('customerSearchInput').addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadCustomers, 300);
    });
}

async function toggleStatus(id, newStatus, name) {
    Swal.fire({
        title: `${newStatus === 'suspended' ? 'Suspend' : 'Activate'} ${name}?`,
        text: `Are you sure you want to mark this account as ${newStatus}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: newStatus === 'suspended' ? '#EF4444' : '#10B981',
        cancelButtonColor: '#4B5563',
        confirmButtonText: `Yes, ${newStatus.toUpperCase()}`,
        background: '#161c2e',
        color: '#fff'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await API.put(`/admin/customers/${id}/status`, { status: newStatus });
                Toast.success(`Customer ${newStatus} successfully.`);
                await loadCustomers();
            } catch (err) {
                Toast.error(err.message || 'Failed to update account.');
            }
        }
    });
}
