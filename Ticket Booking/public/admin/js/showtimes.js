// Admin Showtime Management Logic

let allMovies = [];
let allHalls = [];
let allShowtimes = [];
let showtimeModal = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAdmin('/login.html')) return;

    showtimeModal = new bootstrap.Modal(document.getElementById('showtimeModal'));

    setupEventListeners();
    await loadInitialData();
});

async function loadInitialData() {
    try {
        const [moviesRes, hallsRes] = await Promise.all([
            API.get('/movies'),
            API.get('/showtimes/halls')
        ]);

        allMovies = moviesRes.movies || [];
        allHalls = hallsRes.halls || [];

        populateDropdowns();
        await loadAllShowtimes();

    } catch (err) {
        console.error('Failed to load initial showtime data:', err);
        Toast.error('Failed to load data.');
    }
}

function populateDropdowns() {
    // Hall Filter
    const hallFilter = document.getElementById('showtimeHallFilter');
    allHalls.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.id;
        opt.textContent = `${h.name} (${h.hall_type})`;
        hallFilter.appendChild(opt);
    });

    // Form Movie Select (only now_showing)
    const movieSelect = document.getElementById('formShowtimeMovie');
    movieSelect.innerHTML = '<option value="">-- Choose a Movie --</option>';
    allMovies.filter(m => m.status === 'now_showing').forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.title} (${m.duration}m)`;
        movieSelect.appendChild(opt);
    });

    // Form Hall Select
    const hallSelect = document.getElementById('formShowtimeHall');
    hallSelect.innerHTML = '<option value="">-- Choose Cinema Hall --</option>';
    allHalls.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.id;
        opt.textContent = `${h.name} - ${h.hall_type} (${h.total_capacity} seats)`;
        hallSelect.appendChild(opt);
    });
}

async function loadAllShowtimes() {
    try {
        // Fetch showtimes for all movies
        const showtimePromises = allMovies.map(m => API.get(`/showtimes/movie/${m.id}`));
        const results = await Promise.all(showtimePromises);

        allShowtimes = [];
        results.forEach(r => {
            if (r.showtimes) {
                allShowtimes.push(...r.showtimes);
            }
        });

        // Sort by date then time
        allShowtimes.sort((a, b) => (a.show_date + a.start_time).localeCompare(b.show_date + b.start_time));

        filterAndRenderShowtimes();

    } catch (err) {
        console.error('Failed to load showtimes:', err);
        Toast.error('Failed to fetch showtimes.');
    }
}

function filterAndRenderShowtimes() {
    const search = document.getElementById('showtimeSearchInput').value.toLowerCase().trim();
    const date = document.getElementById('showtimeDateFilter').value;
    const hallId = document.getElementById('showtimeHallFilter').value;

    const filtered = allShowtimes.filter(s => {
        const movie = allMovies.find(m => m.id === s.movie_id);
        const movieTitle = movie ? movie.title.toLowerCase() : '';

        const matchesSearch = !search || movieTitle.includes(search);
        const matchesDate = !date || s.show_date === date;
        const matchesHall = hallId === 'all' || s.hall_id.toString() === hallId;

        return matchesSearch && matchesDate && matchesHall;
    });

    renderShowtimeTable(filtered);
}

function renderShowtimeTable(showtimes) {
    const tbody = document.getElementById('showtimesTbody');

    if (showtimes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No showtimes found matching current filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = showtimes.map(s => {
        const movie = allMovies.find(m => m.id === s.movie_id);
        const movieTitle = movie ? movie.title : `Movie #${s.movie_id}`;
        const posterUrl = movie ? movie.poster_url : '';

        const bookedCount = s.booked_seats_count || 0;
        const totalCapacity = s.total_capacity || 70;
        const occupancyPct = Math.round((bookedCount / totalCapacity) * 100);

        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <img src="${posterUrl}" alt="${movieTitle}" class="rounded" style="width: 35px; height: 50px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80'">
                        <div>
                            <div class="fw-bold text-white small">${movieTitle}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="fw-semibold text-light small">${s.hall_name}</div>
                    <small class="badge bg-secondary" style="font-size: 0.65rem;">${s.hall_type}</small>
                </td>
                <td><small class="text-light">${formatDate(s.show_date)}</small></td>
                <td>
                    <span class="text-warning fw-bold small">${formatTime(s.start_time)}</span>
                    <small class="text-muted d-block" style="font-size: 0.75rem;">Ends ~${formatTime(s.end_time)}</small>
                </td>
                <td><strong class="text-success small">${formatCurrency(s.base_price)}</strong></td>
                <td>
                    <div class="small text-light mb-1">${bookedCount} / ${totalCapacity} booked (${occupancyPct}%)</div>
                    <div class="progress" style="height: 5px; background: rgba(255,255,255,0.1);">
                        <div class="progress-bar bg-danger" style="width: ${occupancyPct}%;"></div>
                    </div>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteShowtimePrompt(${s.id})" title="Delete Showtime">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function setupEventListeners() {
    document.getElementById('showtimeSearchInput').addEventListener('input', filterAndRenderShowtimes);
    document.getElementById('showtimeDateFilter').addEventListener('change', filterAndRenderShowtimes);
    document.getElementById('showtimeHallFilter').addEventListener('change', filterAndRenderShowtimes);

    document.getElementById('resetShowtimeFiltersBtn').addEventListener('click', () => {
        document.getElementById('showtimeSearchInput').value = '';
        document.getElementById('showtimeDateFilter').value = '';
        document.getElementById('showtimeHallFilter').value = 'all';
        filterAndRenderShowtimes();
    });

    document.getElementById('openAddShowtimeModalBtn').addEventListener('click', () => {
        document.getElementById('showtimeForm').reset();
        document.getElementById('formShowtimeDate').value = new Date().toISOString().split('T')[0];
        showtimeModal.show();
    });

    document.getElementById('showtimeForm').addEventListener('submit', handleSaveShowtime);
}

async function handleSaveShowtime(e) {
    e.preventDefault();
    const btn = document.getElementById('saveShowtimeBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    try {
        const payload = {
            movie_id: parseInt(document.getElementById('formShowtimeMovie').value),
            hall_id: parseInt(document.getElementById('formShowtimeHall').value),
            show_date: document.getElementById('formShowtimeDate').value,
            start_time: document.getElementById('formShowtimeStartTime').value,
            base_price: parseFloat(document.getElementById('formShowtimePrice').value)
        };

        await API.post('/showtimes', payload);
        Toast.success('Showtime scheduled successfully!');
        showtimeModal.hide();
        await loadAllShowtimes();

    } catch (err) {
        console.error('Schedule showtime error:', err);
        Toast.error(err.message || 'Failed to schedule showtime.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plus me-1"></i>Create Showtime';
    }
}

function deleteShowtimePrompt(id) {
    Swal.fire({
        title: 'Delete Showtime?',
        text: 'This will cancel the screening schedule. Any existing bookings for this slot will be affected.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#4B5563',
        confirmButtonText: 'Yes, Delete',
        background: '#161c2e',
        color: '#fff'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await API.delete(`/showtimes/${id}`);
                Toast.success('Showtime deleted.');
                await loadAllShowtimes();
            } catch (err) {
                Toast.error(err.message || 'Failed to delete showtime.');
            }
        }
    });
}
