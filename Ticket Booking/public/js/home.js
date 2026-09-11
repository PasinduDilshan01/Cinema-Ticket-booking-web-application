// Home Page Logic

let allMovies = [];
let activeGenre = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    await loadHomeMovies();
    setupEventListeners();
});

async function loadHomeMovies() {
    try {
        const res = await API.get('/movies');
        allMovies = res.movies || [];

        renderFeaturedHero();
        renderMovieGrids();
    } catch (err) {
        console.error('Failed to load home movies:', err);
        document.getElementById('nowShowingGrid').innerHTML = `
            <div class="col-12 text-center text-danger py-4">
                <i class="fa-solid fa-triangle-exclamation fs-3 mb-2"></i>
                <p>Failed to load movies. Please make sure the server is running.</p>
            </div>
        `;
    }
}

function renderFeaturedHero() {
    const featured = allMovies.find(m => m.status === 'now_showing') || allMovies[0];
    if (!featured) return;

    const heroWrap = document.getElementById('heroFeaturedMovie');
    if (featured.backdrop_url) {
        heroWrap.style.backgroundImage = `url('${featured.backdrop_url}')`;
    }

    document.getElementById('heroTitle').textContent = featured.title;
    document.getElementById('heroDesc').textContent = featured.description;
    document.getElementById('heroRating').textContent = featured.rating.toFixed(1);
    document.getElementById('heroDuration').innerHTML = `<i class="fa-regular fa-clock me-1"></i>${featured.duration} mins`;
    document.getElementById('heroPg').textContent = featured.pg_rating || 'PG-13';
    document.getElementById('heroGenre').textContent = featured.genre;

    document.getElementById('heroBookBtn').href = `/movie-details.html?id=${featured.id}`;
    
    const trailerBtn = document.getElementById('heroTrailerBtn');
    trailerBtn.onclick = () => openTrailerModal(featured.trailer_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ', featured.title);
}

function renderMovieGrids() {
    const searchTerm = document.getElementById('homeSearchInput').value.toLowerCase().trim();

    // Filter by genre and search term
    const filterFn = (m) => {
        const matchesGenre = activeGenre === 'all' || (m.genre && m.genre.includes(activeGenre));
        const matchesSearch = !searchTerm || 
            m.title.toLowerCase().includes(searchTerm) || 
            (m.cast && m.cast.toLowerCase().includes(searchTerm)) ||
            (m.director && m.director.toLowerCase().includes(searchTerm));
        return matchesGenre && matchesSearch;
    };

    const nowShowing = allMovies.filter(m => m.status === 'now_showing' && filterFn(m));
    const comingSoon = allMovies.filter(m => m.status === 'coming_soon' && filterFn(m));
    const popular = [...allMovies].sort((a, b) => b.rating - a.rating).filter(filterFn).slice(0, 4);

    renderCardList('nowShowingGrid', nowShowing, true);
    renderCardList('popularMoviesGrid', popular, true);
    renderCardList('comingSoonGrid', comingSoon, false);
}

function renderCardList(elementId, movies, isNowShowing) {
    const container = document.getElementById(elementId);
    if (!container) return;

    if (movies.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
                <i class="fa-solid fa-film fs-2 mb-2 opacity-50"></i>
                <p class="mb-0">No movies found matching the selected criteria.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = movies.map(movie => `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="movie-card">
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
                        <span><i class="fa-regular fa-clock me-1"></i>${movie.duration}m</span>
                        <span class="badge bg-dark border border-secondary">${movie.pg_rating || 'PG-13'}</span>
                    </div>
                    <div class="mt-3 d-grid gap-2">
                        ${isNowShowing ? `
                            <a href="/movie-details.html?id=${movie.id}" class="btn btn-cinema-primary btn-sm justify-content-center">
                                <i class="fa-solid fa-ticket"></i>Book Tickets
                            </a>
                        ` : `
                            <a href="/movie-details.html?id=${movie.id}" class="btn btn-cinema-secondary btn-sm justify-content-center">
                                <i class="fa-solid fa-info-circle"></i>View Details
                            </a>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function setupEventListeners() {
    // Search input instant filter
    const searchInput = document.getElementById('homeSearchInput');
    searchInput.addEventListener('input', () => {
        renderMovieGrids();
    });

    // Genre filter chips
    const genreButtons = document.querySelectorAll('#homeGenreFilterContainer .genre-chip');
    genreButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            genreButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeGenre = btn.dataset.genre;
            renderMovieGrids();
        });
    });
}

function openTrailerModal(url, title = 'Trailer') {
    document.getElementById('trailerModalTitle').textContent = title + ' - Official Trailer';
    const iframe = document.getElementById('trailerFrame');
    iframe.src = url;
    const modal = new bootstrap.Modal(document.getElementById('trailerModal'));
    modal.show();

    document.getElementById('trailerModal').addEventListener('hidden.bs.modal', () => {
        iframe.src = '';
    }, { once: true });
}
