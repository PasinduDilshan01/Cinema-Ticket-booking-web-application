// Admin Sales Reports Logic

let reportsData = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAdmin('/login.html')) return;

    await loadReports();
});

async function loadReports() {
    try {
        const res = await API.get('/admin/reports');
        reportsData = res;

        renderDailySales(res.dailySales || []);
        renderTopMovies(res.topMovies || []);
        renderHallStats(res.hallStats || []);

    } catch (err) {
        console.error('Failed to load reports:', err);
        Toast.error('Failed to load analytics reports.');
    }
}

function renderDailySales(sales) {
    const tbody = document.getElementById('dailySalesTbody');

    if (sales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No daily sales data available.</td></tr>`;
        return;
    }

    tbody.innerHTML = sales.map(s => {
        const avgVal = s.seats_sold > 0 ? (s.total_revenue / s.seats_sold) : 0;

        return `
            <tr>
                <td><strong class="text-white">${formatDate(s.report_date)}</strong></td>
                <td><span class="badge bg-secondary">${s.bookings_count} Bookings</span></td>
                <td><span class="text-light">${s.seats_sold} Seats</span></td>
                <td><strong class="text-success">${formatCurrency(s.total_revenue)}</strong></td>
                <td><span class="text-muted small">${formatCurrency(avgVal)} / seat</span></td>
            </tr>
        `;
    }).join('');
}

function renderTopMovies(movies) {
    const tbody = document.getElementById('topGrossMoviesTbody');

    if (movies.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No movie sales recorded.</td></tr>`;
        return;
    }

    tbody.innerHTML = movies.map(m => `
        <tr>
            <td><strong class="text-white small">${m.title}</strong></td>
            <td><small class="text-muted">${m.genre}</small></td>
            <td><span class="badge bg-secondary">${m.total_tickets}</span></td>
            <td><strong class="text-success">${formatCurrency(m.gross_revenue)}</strong></td>
        </tr>
    `).join('');
}

function renderHallStats(halls) {
    const tbody = document.getElementById('hallStatsTbody');

    if (halls.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No hall data found.</td></tr>`;
        return;
    }

    tbody.innerHTML = halls.map(h => `
        <tr>
            <td><strong class="text-white small">${h.name}</strong></td>
            <td><span class="badge bg-secondary small">${h.hall_type}</span></td>
            <td><small class="text-muted">${h.total_capacity} seats</small></td>
            <td><strong class="text-accent">${h.total_seats_booked} Booked</strong></td>
        </tr>
    `).join('');
}

function exportCsv() {
    if (!reportsData || !reportsData.dailySales || reportsData.dailySales.length === 0) {
        Toast.warning('No sales data available to export.');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Bookings Completed,Seats Sold,Gross Revenue\n';

    reportsData.dailySales.forEach(s => {
        csvContent += `"${s.report_date}",${s.bookings_count},${s.seats_sold},${s.total_revenue.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cineverse_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Toast.success('CSV Report downloaded.');
}
