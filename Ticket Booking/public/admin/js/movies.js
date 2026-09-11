// Admin Movie Management Logic

let allMovies = [];
let movieModal = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAdmin('/login.html')) return;

    movieModal = new bootstrap.Modal(document.getElementById('movieModal'));

    setupEventListeners();
    await loadMovies();
});

async function loadMovies() {
    try {
        const res = await API.get('/movies');
        allMovies = res.movies || [];
        filterAndRenderMovies();
    } catch (err) {
        console.error('Failed to load movies:', err);
        Toast.error('Failed to load movie catalog.');
    }
}

function filterAndRenderMovies() {
    const search = document.getElementById('adminMovieSearch').value.toLowerCase().trim();
    const status = document.getElementById('adminMovieStatusFilter').value;

    const filtered = allMovies.filter(m => {
        const matchesStatus = status === 'all' || m.status === status;
        const matchesSearch = !search || 
            m.title.toLowerCase().includes(search) || 
            (m.genre && m.genre.toLowerCase().includes(search)) || 
            (m.director && m.director.toLowerCase().includes(search));
        return matchesStatus && matchesSearch;
    });

    document.getElementById('adminMovieCount').textContent = `Total: ${filtered.length} Movies`;
    renderMovieTable(filtered);
}

function renderMovieTable(movies) {
    const tbody = document.getElementById('adminMoviesTbody');

    if (movies.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No movies found matching criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = movies.map(m => {
        const statusBadge = m.status === 'now_showing'
            ? `<span class="badge-status now_showing"><i class="fa-solid fa-play me-1"></i>Now Showing</span>`
            : (m.status === 'coming_soon' 
                ? `<span class="badge-status coming_soon"><i class="fa-solid fa-clock me-1"></i>Coming Soon</span>`
                : `<span class="badge-status suspended">Archived</span>`);

        return `
            <tr>
                <td>
                    <img src="${m.poster_url}" alt="${m.title}" class="rounded shadow-sm" style="width: 50px; height: 70px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80'">
                </td>
                <td>
                    <div class="fw-bold text-white">${m.title}</div>
                    <small class="text-muted">Dir: ${m.director || 'N/A'} • Rel: ${formatDate(m.release_date)}</small>
                </td>
                <td><small class="text-light">${m.genre}</small></td>
                <td><small class="text-muted">${m.duration} mins (${m.pg_rating || 'PG-13'})</small></td>
                <td><span class="text-warning fw-bold small">⭐ ${m.rating.toFixed(1)}</span></td>
                <td>${statusBadge}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-cinema-secondary me-1" onclick="openEditModal(${m.id})" title="Edit Movie">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteMoviePrompt(${m.id}, '${m.title.replace(/'/g, "\\'")}')" title="Delete Movie">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function setupEventListeners() {
    document.getElementById('adminMovieSearch').addEventListener('input', filterAndRenderMovies);
    document.getElementById('adminMovieStatusFilter').addEventListener('change', filterAndRenderMovies);

    document.getElementById('openAddMovieModalBtn').addEventListener('click', () => {
        document.getElementById('movieForm').reset();
        document.getElementById('formMovieId').value = '';
        document.getElementById('movieModalTitle').textContent = 'Add New Movie';
        document.getElementById('formMovieReleaseDate').value = new Date().toISOString().split('T')[0];
        movieModal.show();
    });

    document.getElementById('movieForm').addEventListener('submit', handleSaveMovie);
}

function openEditModal(id) {
    const movie = allMovies.find(m => m.id === id);
    if (!movie) return;

    document.getElementById('formMovieId').value = movie.id;
    document.getElementById('movieModalTitle').textContent = `Edit Movie: ${movie.title}`;
    document.getElementById('formMovieTitle').value = movie.title;
    document.getElementById('formMovieStatus').value = movie.status;
    document.getElementById('formMovieDesc').value = movie.description || '';
    document.getElementById('formMovieGenre').value = movie.genre;
    document.getElementById('formMovieDuration').value = movie.duration;
    document.getElementById('formMovieRating').value = movie.rating;
    document.getElementById('formMoviePg').value = movie.pg_rating || 'PG-13';
    document.getElementById('formMovieDirector').value = movie.director || '';
    document.getElementById('formMovieReleaseDate').value = movie.release_date || '';
    document.getElementById('formMovieCast').value = movie.cast || '';
    document.getElementById('formMoviePosterUrl').value = movie.poster_url || '';
    document.getElementById('formMovieBackdropUrl').value = movie.backdrop_url || '';
    document.getElementById('formMovieTrailerUrl').value = movie.trailer_url || '';

    movieModal.show();
}

async function handleSaveMovie(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('saveMovieBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    try {
        const id = document.getElementById('formMovieId').value;
        let posterUrl = document.getElementById('formMoviePosterUrl').value.trim();

        // Handle File upload if selected
        const fileInput = document.getElementById('formMoviePosterFile');
        if (fileInput.files && fileInput.files[0]) {
            const formData = new FormData();
            formData.append('poster', fileInput.files[0]);
            const uploadRes = await API.upload('/upload/poster', formData);
            posterUrl = uploadRes.url;
        }

        const payload = {
            title: document.getElementById('formMovieTitle').value.trim(),
            status: document.getElementById('formMovieStatus').value,
            description: document.getElementById('formMovieDesc').value.trim(),
            genre: document.getElementById('formMovieGenre').value.trim(),
            duration: parseInt(document.getElementById('formMovieDuration').value) || 120,
            rating: parseFloat(document.getElementById('formMovieRating').value) || 8.0,
            pg_rating: document.getElementById('formMoviePg').value,
            director: document.getElementById('formMovieDirector').value.trim(),
            release_date: document.getElementById('formMovieReleaseDate').value,
            cast: document.getElementById('formMovieCast').value.trim(),
            poster_url: posterUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
            backdrop_url: document.getElementById('formMovieBackdropUrl').value.trim() || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
            trailer_url: document.getElementById('formMovieTrailerUrl').value.trim() || 'https://www.youtube.com/embed/dQw4w9WgXcQ'
        };

        if (id) {
            // Update
            await API.put(`/movies/${id}`, payload);
            Toast.success('Movie updated successfully!');
        } else {
            // Create
            await API.post('/movies', payload);
            Toast.success('New movie added successfully!');
        }

        movieModal.hide();
        await loadMovies();

    } catch (err) {
        console.error('Save movie error:', err);
        Toast.error(err.message || 'Failed to save movie.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i>Save Movie';
    }
}

function deleteMoviePrompt(id, title) {
    Swal.fire({
        title: `Delete "${title}"?`,
        text: 'This will remove the movie and all its associated showtimes from the system.',
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
                await API.delete(`/movies/${id}`);
                Toast.success('Movie deleted successfully.');
                await loadMovies();
            } catch (err) {
                Toast.error(err.message || 'Failed to delete movie.');
            }
        }
    });
}
