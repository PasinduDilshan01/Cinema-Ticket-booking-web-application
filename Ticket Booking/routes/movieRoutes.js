const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAdmin } = require('../middleware/auth');

// GET /api/movies - Browse/Filter movies
router.get('/', (req, res) => {
    try {
        const { search, genre, status, minRating, sort } = req.query;

        let query = 'SELECT * FROM movies WHERE 1=1';
        const params = [];

        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }

        if (genre && genre !== 'all') {
            query += ' AND genre LIKE ?';
            params.push(`%${genre}%`);
        }

        if (search) {
            query += ' AND (title LIKE ? OR cast LIKE ? OR director LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        if (minRating) {
            query += ' AND rating >= ?';
            params.push(parseFloat(minRating));
        }

        // Sorting
        if (sort === 'rating') {
            query += ' ORDER BY rating DESC';
        } else if (sort === 'duration') {
            query += ' ORDER BY duration DESC';
        } else if (sort === 'release_date') {
            query += ' ORDER BY release_date DESC';
        } else if (sort === 'title') {
            query += ' ORDER BY title ASC';
        } else {
            query += ' ORDER BY id DESC';
        }

        const movies = db.prepare(query).all(...params);
        return res.json({ success: true, count: movies.length, movies });
    } catch (err) {
        console.error('Fetch movies error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch movies.' });
    }
});

// GET /api/movies/featured
router.get('/featured', (req, res) => {
    try {
        const featured = db.prepare(`
            SELECT * FROM movies 
            WHERE status = 'now_showing' 
            ORDER BY rating DESC 
            LIMIT 5
        `).all();
        return res.json({ success: true, movies: featured });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch featured movies.' });
    }
});

// GET /api/movies/genres
router.get('/genres', (req, res) => {
    try {
        const movies = db.prepare('SELECT genre FROM movies').all();
        const genreSet = new Set();
        movies.forEach(m => {
            if (m.genre) {
                m.genre.split(',').forEach(g => genreSet.add(g.trim()));
            }
        });
        return res.json({ success: true, genres: Array.from(genreSet).sort() });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch genres.' });
    }
});

// GET /api/movies/:id - Single Movie Details with upcoming showtimes
router.get('/:id', (req, res) => {
    try {
        const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
        if (!movie) {
            return res.status(404).json({ success: false, message: 'Movie not found.' });
        }

        // Fetch upcoming showtimes for this movie
        const showtimes = db.prepare(`
            SELECT s.*, c.name as hall_name, c.hall_type, c.total_capacity
            FROM showtimes s
            JOIN cinemas c ON s.hall_id = c.id
            WHERE s.movie_id = ?
            ORDER BY s.show_date ASC, s.start_time ASC
        `).all(req.params.id);

        return res.json({
            success: true,
            movie,
            showtimes
        });
    } catch (err) {
        console.error('Fetch movie details error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch movie details.' });
    }
});

// POST /api/movies - Admin: Add Movie
router.post('/', requireAdmin, (req, res) => {
    try {
        const {
            title, description, genre, duration, rating, pg_rating,
            cast, director, release_date, poster_url, backdrop_url, trailer_url, status
        } = req.body;

        if (!title || !genre || !duration) {
            return res.status(400).json({ success: false, message: 'Title, genre, and duration are required.' });
        }

        const insert = db.prepare(`
            INSERT INTO movies (title, description, genre, duration, rating, pg_rating, cast, director, release_date, poster_url, backdrop_url, trailer_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insert.run(
            title.trim(),
            description || '',
            genre.trim(),
            parseInt(duration) || 120,
            parseFloat(rating) || 8.0,
            pg_rating || 'PG-13',
            cast || '',
            director || '',
            release_date || new Date().toISOString().split('T')[0],
            poster_url || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
            backdrop_url || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
            trailer_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            status || 'now_showing'
        );

        return res.status(201).json({
            success: true,
            message: 'Movie added successfully!',
            movieId: result.lastInsertRowid
        });
    } catch (err) {
        console.error('Add movie error:', err);
        return res.status(500).json({ success: false, message: 'Failed to add movie.' });
    }
});

// PUT /api/movies/:id - Admin: Update Movie
router.put('/:id', requireAdmin, (req, res) => {
    try {
        const {
            title, description, genre, duration, rating, pg_rating,
            cast, director, release_date, poster_url, backdrop_url, trailer_url, status
        } = req.body;

        const update = db.prepare(`
            UPDATE movies SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                genre = COALESCE(?, genre),
                duration = COALESCE(?, duration),
                rating = COALESCE(?, rating),
                pg_rating = COALESCE(?, pg_rating),
                cast = COALESCE(?, cast),
                director = COALESCE(?, director),
                release_date = COALESCE(?, release_date),
                poster_url = COALESCE(?, poster_url),
                backdrop_url = COALESCE(?, backdrop_url),
                trailer_url = COALESCE(?, trailer_url),
                status = COALESCE(?, status)
            WHERE id = ?
        `);

        const result = update.run(
            title, description, genre, duration ? parseInt(duration) : null,
            rating ? parseFloat(rating) : null, pg_rating, cast, director,
            release_date, poster_url, backdrop_url, trailer_url, status,
            req.params.id
        );

        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Movie not found.' });
        }

        return res.json({ success: true, message: 'Movie updated successfully!' });
    } catch (err) {
        console.error('Update movie error:', err);
        return res.status(500).json({ success: false, message: 'Failed to update movie.' });
    }
});

// DELETE /api/movies/:id - Admin: Delete Movie
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        const result = db.prepare('DELETE FROM movies WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Movie not found.' });
        }
        return res.json({ success: true, message: 'Movie deleted successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete movie.' });
    }
});

module.exports = router;
