// Admin Dashboard Logic

let revenueChart = null;
let genreChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Check admin authentication
    if (!Auth.requireAdmin('/login.html')) {
        return;
    }

    const user = Auth.getUser();
    if (user) {
        document.getElementById('adminUserName').textContent = user.name;
    }

    setupSidebarToggle();
    await loadMetrics();
    await loadSalesCharts();
});

function setupSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('adminSidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

async function loadMetrics() {
    try {
        const res = await API.get('/admin/metrics');
        const m = res.metrics;

        document.getElementById('statRevenue').textContent = formatCurrency(m.totalRevenue);
        document.getElementById('statBookings').textContent = m.totalBookings;
        document.getElementById('statCustomers').textContent = m.totalCustomers;
        document.getElementById('statTodayBookings').textContent = m.todayBookingsCount;
        document.getElementById('statTodayRevenue').textContent = formatCurrency(m.todayRevenue);

        renderRecentBookings(res.recentBookings || []);
        renderTopMovies(res.popularMovies || []);

    } catch (err) {
        console.error('Failed to load admin metrics:', err);
        Toast.error('Failed to load metrics.');
    }
}

function renderRecentBookings(bookings) {
    const tbody = document.getElementById('recentBookingsTbody');
    if (!tbody) return;

    if (bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No bookings recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = bookings.map(b => {
        const isConfirmed = b.booking_status === 'Confirmed';
        const badge = isConfirmed 
            ? `<span class="badge-status confirmed">Confirmed</span>` 
            : `<span class="badge-status cancelled">${b.booking_status}</span>`;

        return `
            <tr>
                <td><strong class="text-warning font-monospace small">${b.booking_code}</strong></td>
                <td>
                    <div class="fw-semibold text-white small">${b.customer_name}</div>
                    <small class="text-muted">${b.customer_email}</small>
                </td>
                <td><span class="text-light small text-truncate d-inline-block" style="max-width: 140px;">${b.movie_title}</span></td>
                <td><small class="text-muted">${formatDate(b.show_date)} ${formatTime(b.start_time)}</small></td>
                <td><strong class="text-success small">${formatCurrency(b.total_amount)}</strong></td>
                <td>${badge}</td>
            </tr>
        `;
    }).join('');
}

function renderTopMovies(movies) {
    const container = document.getElementById('topMoviesList');
    if (!container) return;

    if (movies.length === 0) {
        container.innerHTML = `<div class="text-muted text-center py-4 small">No sales data available yet.</div>`;
        return;
    }

    container.innerHTML = movies.map((m, idx) => `
        <div class="d-flex align-items-center gap-3 p-2 rounded" style="background: rgba(255,255,255,0.03);">
            <div class="fw-bold fs-5 ${idx === 0 ? 'text-warning' : 'text-muted'}" style="width: 20px;">${idx + 1}</div>
            <img src="${m.poster_url}" alt="${m.title}" class="rounded" style="width: 45px; height: 60px; object-fit: cover;">
            <div class="flex-grow-1 overflow-hidden">
                <div class="fw-semibold text-white small text-truncate">${m.title}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${m.booking_count} Bookings</div>
            </div>
            <div class="text-end">
                <div class="fw-bold text-success small">${formatCurrency(m.total_gross)}</div>
                <div class="text-warning" style="font-size: 0.7rem;">⭐ ${m.rating.toFixed(1)}</div>
            </div>
        </div>
    `).join('');
}

async function loadSalesCharts() {
    try {
        const res = await API.get('/admin/sales-chart');

        // 1. Revenue Line Chart
        const revCtx = document.getElementById('revenueChart').getContext('2d');
        if (revenueChart) revenueChart.destroy();

        revenueChart = new Chart(revCtx, {
            type: 'line',
            data: {
                labels: res.daily.labels,
                datasets: [{
                    label: 'Daily Revenue ($)',
                    data: res.daily.revenue,
                    borderColor: '#8B5CF6',
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#C084FC',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `Revenue: $${ctx.raw.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#9CA3AF' }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#9CA3AF',
                            callback: (val) => `$${val}`
                        }
                    }
                }
            }
        });

        // 2. Genre Distribution Chart
        const genreCtx = document.getElementById('genreChart').getContext('2d');
        if (genreChart) genreChart.destroy();

        genreChart = new Chart(genreCtx, {
            type: 'doughnut',
            data: {
                labels: res.genres.labels.length > 0 ? res.genres.labels : ['Action', 'Sci-Fi', 'Horror', 'Animation'],
                datasets: [{
                    data: res.genres.data.length > 0 ? res.genres.data : [4, 3, 2, 2],
                    backgroundColor: [
                        '#E50914', '#8B5CF6', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#9CA3AF', boxWidth: 12, padding: 10 }
                    }
                }
            }
        });

    } catch (err) {
        console.error('Failed to load sales chart:', err);
    }
}
