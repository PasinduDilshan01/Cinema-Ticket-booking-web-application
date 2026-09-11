// Movie Listing Page Logic

let selectedGenre = 'all';
let minRating = 0;
let selectedStatus = 'all';
let currentSort = 'rating';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('status')) {
        selectedStatus = params.get('status');
        const statusRadio = document.querySelector(`input[name="statusFilter"][value="${selectedStatus}"]`);
        if (statusRadio) statusRadio.checked = true;
    }
    if (params.get('sort')) {
        currentSort = params.get('sort');
        const sortSelect = document.getElementById('movieSortSelect');
        if (sortSelect) sortSelect.value = currentSort;
    }

    await loadGenres();
    setupFilters();
    await fetchMovies();
});

async function loadGenres() {
    try {
        const res = await API.get('/movies/genres');
        const container = document.getElementById('genreFilterChips');
        const genres = res.genres || [];

        const chipsHtml = genres.map(g => `
            <button class="genre-chip btn-sm" data-genre="${g}">${g}</button>
        `).join('');

        container.insertAdjacentHTML('beforeend', chipsHtml);

        // Bind genre click
        container.querySelectorAll('.genre-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.genre-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedGenre = btn.dataset.genre;
                fetchMovies();
            });
        });
    } catch (e) {
        console.error('Failed to load genres:', e);
    }
}

function setupFilters() {
    // Search
    const searchInput = document.getElementById('movieSearchInput');
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchQuery = e.target.value.trim();
            fetchMovies();
        }, 300);
    });

    // Status Radio
    document.querySelectorAll('input[name="statusFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedStatus = e.target.value;
            fetchMovies();
        });
    });

    // Rating Slider
    const ratingRange = document.getElementById('ratingRange');
    const ratingVal = document.getElementById('ratingVal');
    ratingRange.addEventListener('input', (e) => {
        minRating = parseFloat(e.target.value);
        ratingVal.textContent = minRating > 0 ? `${minRating.toFixed(1)}+ ⭐` : 'Any';
        fetchMovies();
    });

    // Sort
    const sortSelect = document.getElementById('movieSortSelect');
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        fetchMovies();
    });

    // Reset
    document.getElementById('resetFiltersBtn').addEventListener('click', () => {
        selectedGenre = 'all';
        minRating = 0;
        selectedStatus = 'all';
        searchQuery = '';
        currentSort = 'rating';

        document.getElementById('movieSearchInput').value = '';
        document.getElementById('ratingRange').value = 0;
        document.getElementById('ratingVal').textContent = 'Any';
        document.getElementById('movieSortSelect').value = 'rating';
        document.querySelector('input[name="statusFilter"][value="all"]').checked = true;

        const container = document.getElementById('genreFilterChips');
        container.querySelectorAll('.genre-chip').forEach(b => b.classList.remove('active'));
        container.querySelector('[data-genre="all"]').classList.add('active');

        fetchMovies();
    });
}

async function fetchMovies() {
    const grid = document.getElementById('moviesCatalogGrid');
    const countLabel = document.getElementById('movieCountLabel');

    let endpoint = `/movies?sort=${currentSort}`;
    if (selectedStatus !== 'all') endpoint += `&status=${selectedStatus}`;
    if (selectedGenre !== 'all') endpoint += `&genre=${encodeURIComponent(selectedGenre)}`;
    if (minRating > 0) endpoint += `&minRating=${minRating}`;
    if (searchQuery) endpoint += `&search=${encodeURIComponent(searchQuery)}`;

    try {
        const res = await API.get(endpoint);
        const movies = res.movies || [];

        countLabel.textContent = `Showing ${movies.length} ${movies.length === 1 ? 'movie' : 'movies'}`;

        if (movies.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5 text-muted glass-panel">
                    <i class="fa-solid fa-film-slash fs-1 text-danger mb-3"></i>
                    <h5 class="text-white">No Movies Found</h5>
                    <p class="mb-0">Try changing your filters or search keywords.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = movies.map(movie => `
            <div class="col-6 col-md-4 col-lg-4">
                <div class="movie-card animate-fade-in">
                    <div class="movie-poster-wrap">
                        <img src="${movie.poster_url}" alt="${movie.title}" class="movie-poster-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80'">
                        <div class="movie-rating-badge">
                            <i class="fa-solid fa-star"></i>
                            <span>${movie.rating.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="movie-card-body">
                        <h5 class="movie-card-title" title="${movie.title}">${movie.title}</h5>
                        <div class="movie-card-genre">${movie.genre}</div>
                        <div class="movie-card-meta">
                            <span><i class="fa-regular fa-clock me-1"></i>${movie.duration} mins</span>
                            <span class="badge bg-dark border border-secondary">${movie.pg_rating || 'PG-13'}</span>
                        </div>
                        <div class="mt-3">
                            ${movie.status === 'now_showing' ? `
                                <a href="/movie-details.html?id=${movie.id}" class="btn btn-cinema-primary btn-sm w-100 justify-content-center">
                                    <i class="fa-solid fa-ticket me-1"></i>Book Tickets
                                </a>
                            ` : `
                                <a href="/movie-details.html?id=${movie.id}" class="btn btn-cinema-secondary btn-sm w-100 justify-content-center">
                                    <i class="fa-solid fa-circle-info me-1"></i>Details
                                </a>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Fetch movies catalog error:', err);
        grid.innerHTML = `
            <div class="col-12 text-center py-5 text-danger">
                <p>Failed to load movies. Please try again later.</p>
            </div>
        `;
    }
}
