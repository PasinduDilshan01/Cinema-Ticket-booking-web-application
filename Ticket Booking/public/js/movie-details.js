// Movie Details Page Logic

let currentMovie = null;
let allShowtimes = [];
let selectedDateStr = '';

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get('id');

    if (!movieId) {
        window.location.href = '/movies.html';
        return;
    }

    await loadMovieDetails(movieId);
});

async function loadMovieDetails(movieId) {
    try {
        const res = await API.get(`/movies/${movieId}`);
        currentMovie = res.movie;
        allShowtimes = res.showtimes || [];

        renderHero();
        renderDateStrip();

        document.getElementById('detailsLoading').classList.add('d-none');
        document.getElementById('movieDetailsHero').classList.remove('d-none');
        document.getElementById('showtimeSection').classList.remove('d-none');

        // Select first date by default
        renderShowtimesForDate(selectedDateStr);

    } catch (err) {
        console.error('Failed to load movie details:', err);
        document.getElementById('detailsLoading').innerHTML = `
            <div class="glass-panel p-5 text-center text-danger">
                <i class="fa-solid fa-triangle-exclamation fs-1 mb-3"></i>
                <h4>Movie Not Found</h4>
                <p class="text-muted">The requested movie could not be found or has been removed.</p>
                <a href="/movies.html" class="btn btn-cinema-primary mt-3">Back to Movies</a>
            </div>
        `;
    }
}

function renderHero() {
    const m = currentMovie;
    document.title = `${m.title} - CINEVERSE`;

    const hero = document.getElementById('movieDetailsHero');
    if (m.backdrop_url) {
        hero.style.backgroundImage = `url('${m.backdrop_url}')`;
    }

    const poster = document.getElementById('detailPoster');
    poster.src = m.poster_url;
    poster.alt = m.title;

    document.getElementById('detailTitle').textContent = m.title;
    document.getElementById('detailRating').textContent = m.rating.toFixed(1);
    document.getElementById('detailDuration').innerHTML = `<i class="fa-regular fa-clock me-1"></i>${m.duration} mins`;
    document.getElementById('detailPg').textContent = m.pg_rating || 'PG-13';
    document.getElementById('detailReleaseDate').innerHTML = `<i class="fa-regular fa-calendar me-1"></i>${formatDate(m.release_date)}`;
    document.getElementById('detailDescription').textContent = m.description;
    document.getElementById('detailDirector').textContent = m.director || 'N/A';
    document.getElementById('detailCast').textContent = m.cast || 'N/A';

    // Genres
    const genreContainer = document.getElementById('detailGenres');
    if (m.genre) {
        genreContainer.innerHTML = m.genre.split(',').map(g => `
            <span class="badge-tag badge-primary mb-0">${g.trim()}</span>
        `).join('');
    }

    // Trailer
    document.getElementById('detailTrailerBtn').onclick = () => {
        const trailerUrl = m.trailer_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
        document.getElementById('trailerModalTitle').textContent = `${m.title} - Official Trailer`;
        const iframe = document.getElementById('trailerFrame');
        iframe.src = trailerUrl;
        const modal = new bootstrap.Modal(document.getElementById('trailerModal'));
        modal.show();

        document.getElementById('trailerModal').addEventListener('hidden.bs.modal', () => {
            iframe.src = '';
        }, { once: true });
    };

    if (m.status !== 'now_showing') {
        document.getElementById('jumpToShowtimeBtn').classList.add('d-none');
    }
}

function renderDateStrip() {
    const container = document.getElementById('dateStripContainer');
    container.innerHTML = '';

    const today = new Date();
    selectedDateStr = today.toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);

        const dateIso = d.toISOString().split('T')[0];
        const dayName = i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }));
        const dayNumber = d.getDate();
        const monthName = d.toLocaleDateString('en-US', { month: 'short' });

        const chip = document.createElement('div');
        chip.className = `date-chip ${i === 0 ? 'active' : ''}`;
        chip.dataset.date = dateIso;
        chip.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-number">${dayNumber}</div>
            <div class="month-name">${monthName}</div>
        `;

        chip.addEventListener('click', () => {
            container.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedDateStr = dateIso;
            renderShowtimesForDate(selectedDateStr);
        });

        container.appendChild(chip);
    }
}

function renderShowtimesForDate(dateStr) {
    const container = document.getElementById('showtimeHallsList');

    if (currentMovie.status !== 'now_showing') {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fa-solid fa-bell fs-2 text-warning mb-2"></i>
                <h5 class="text-white">Coming Soon to Theaters</h5>
                <p>Advance booking for this title will open closer to the release date.</p>
            </div>
        `;
        return;
    }

    const matchingShowtimes = allShowtimes.filter(s => s.show_date === dateStr);

    if (matchingShowtimes.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fa-regular fa-calendar-xmark fs-2 text-danger mb-2"></i>
                <h5 class="text-white">No Showtimes Available</h5>
                <p>There are no scheduled screenings for this date. Please select another date.</p>
            </div>
        `;
        return;
    }

    // Group showtimes by Cinema Hall
    const hallMap = {};
    matchingShowtimes.forEach(s => {
        if (!hallMap[s.hall_id]) {
            hallMap[s.hall_id] = {
                id: s.hall_id,
                name: s.hall_name,
                type: s.hall_type,
                capacity: s.total_capacity,
                slots: []
            };
        }
        hallMap[s.hall_id].slots.push(s);
    });

    container.innerHTML = Object.values(hallMap).map(hall => `
        <div class="p-3 rounded" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);">
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                    <h5 class="text-white fw-bold mb-0">
                        <i class="fa-solid fa-film text-danger me-2"></i>${hall.name}
                    </h5>
                    <small class="text-muted"><span class="badge bg-secondary me-2">${hall.type}</span> 4K Laser Projection • Dolby Surround</small>
                </div>
                <div class="text-muted small">
                    <i class="fa-solid fa-couch me-1"></i>Capacity: ${hall.capacity} seats
                </div>
            </div>
            
            <div class="d-flex gap-3 flex-wrap">
                ${hall.slots.map(slot => `
                    <a href="/seat-selection.html?showtimeId=${slot.id}" class="showtime-badge-btn text-decoration-none">
                        <span class="time">${formatTime(slot.start_time)}</span>
                        <span class="type-tag text-warning mt-1">From ${formatCurrency(slot.base_price)}</span>
                    </a>
                `).join('')}
            </div>
        </div>
    `).join('');
}
