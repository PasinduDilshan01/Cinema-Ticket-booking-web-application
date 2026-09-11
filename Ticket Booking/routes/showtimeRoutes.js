const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAdmin } = require('../middleware/auth');

// GET /api/showtimes/halls - List all cinema halls
router.get('/halls', (req, res) => {
    try {
        const halls = db.prepare('SELECT * FROM cinemas ORDER BY id ASC').all();
        return res.json({ success: true, halls });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch cinema halls.' });
    }
});

// GET /api/showtimes/movie/:movieId - Get showtimes for a specific movie & optional date
router.get('/movie/:movieId', (req, res) => {
    try {
        const { date } = req.query;
        let query = `
            SELECT s.*, c.name as hall_name, c.hall_type, c.total_capacity,
                   (SELECT COUNT(*) FROM booking_seats bs 
                    JOIN bookings b ON bs.booking_id = b.id 
                    WHERE bs.showtime_id = s.id AND b.booking_status != 'Cancelled') as booked_seats_count
            FROM showtimes s
            JOIN cinemas c ON s.hall_id = c.id
            WHERE s.movie_id = ?
        `;
        const params = [req.params.movieId];

        if (date) {
            query += ' AND s.show_date = ?';
            params.push(date);
        }

        query += ' ORDER BY s.show_date ASC, s.start_time ASC';

        const showtimes = db.prepare(query).all(...params);
        return res.json({ success: true, showtimes });
    } catch (err) {
        console.error('Fetch showtimes error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch showtimes.' });
    }
});

// GET /api/showtimes/:id/seats - Get interactive seat layout & booked seats for a showtime
router.get('/:id/seats', (req, res) => {
    try {
        const showtime = db.prepare(`
            SELECT s.*, m.title as movie_title, m.poster_url, m.duration, m.pg_rating,
                   c.name as hall_name, c.hall_type, c.total_rows, c.seats_per_row, c.total_capacity
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.id
            JOIN cinemas c ON s.hall_id = c.id
            WHERE s.id = ?
        `).get(req.params.id);

        if (!showtime) {
            return res.status(404).json({ success: false, message: 'Showtime not found.' });
        }

        // Fetch all seats configured for this cinema hall
        const allSeats = db.prepare(`
            SELECT * FROM seats 
            WHERE hall_id = ? 
            ORDER BY seat_row ASC, seat_number ASC
        `).all(showtime.hall_id);

        // Fetch currently booked seats for this showtime (excluding Cancelled bookings)
        const bookedRows = db.prepare(`
            SELECT bs.seat_label 
            FROM booking_seats bs
            JOIN bookings b ON bs.booking_id = b.id
            WHERE bs.showtime_id = ? AND b.booking_status != 'Cancelled'
        `).all(req.params.id);

        const bookedSeatLabels = bookedRows.map(r => r.seat_label);

        // Map seats with status and dynamic calculated price
        const seats = allSeats.map(seat => {
            const isBooked = bookedSeatLabels.includes(seat.seat_label);
            const calculatedPrice = (showtime.base_price * seat.tier_multiplier).toFixed(2);
            return {
                id: seat.id,
                row: seat.seat_row,
                number: seat.seat_number,
                label: seat.seat_label,
                tier: seat.seat_tier,
                multiplier: seat.tier_multiplier,
                price: parseFloat(calculatedPrice),
                status: isBooked ? 'booked' : 'available'
            };
        });

        return res.json({
            success: true,
            showtime,
            seats,
            bookedCount: bookedSeatLabels.length,
            availableCount: seats.length - bookedSeatLabels.length
        });
    } catch (err) {
        console.error('Fetch seats error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch seats for showtime.' });
    }
});

// POST /api/showtimes - Admin: Schedule a new showtime
router.post('/', requireAdmin, (req, res) => {
    try {
        const { movie_id, hall_id, show_date, start_time, end_time, base_price } = req.body;

        if (!movie_id || !hall_id || !show_date || !start_time || !base_price) {
            return res.status(400).json({ success: false, message: 'All showtime fields are required.' });
        }

        // Calculate end time automatically if not provided (e.g., movie duration + 25 mins intermission/cleanup)
        let computedEndTime = end_time;
        if (!computedEndTime) {
            const movie = db.prepare('SELECT duration FROM movies WHERE id = ?').get(movie_id);
            if (movie) {
                const [h, m] = start_time.split(':').map(Number);
                const totalMinutes = h * 60 + m + movie.duration + 20;
                const endH = Math.floor((totalMinutes / 60) % 24).toString().padStart(2, '0');
                const endM = (totalMinutes % 60).toString().padStart(2, '0');
                computedEndTime = `${endH}:${endM}`;
            } else {
                computedEndTime = '22:00';
            }
        }

        const insert = db.prepare(`
            INSERT INTO showtimes (movie_id, hall_id, show_date, start_time, end_time, base_price)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = insert.run(
            parseInt(movie_id),
            parseInt(hall_id),
            show_date,
            start_time,
            computedEndTime,
            parseFloat(base_price)
        );

        return res.status(201).json({
            success: true,
            message: 'Showtime scheduled successfully!',
            showtimeId: result.lastInsertRowid
        });
    } catch (err) {
        console.error('Add showtime error:', err);
        return res.status(500).json({ success: false, message: 'Failed to schedule showtime.' });
    }
});

// DELETE /api/showtimes/:id - Admin: Delete a showtime
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        const result = db.prepare('DELETE FROM showtimes WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Showtime not found.' });
        }
        return res.json({ success: true, message: 'Showtime deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete showtime.' });
    }
});

module.exports = router;
