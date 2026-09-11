const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAdmin } = require('../middleware/auth');

// Apply admin guard to all admin routes
router.use(requireAdmin);

// GET /api/admin/metrics - Overview KPI cards
router.get('/metrics', (req, res) => {
    try {
        const totalMovies = db.prepare("SELECT COUNT(*) as count FROM movies WHERE status != 'archived'").get().count;
        const totalBookings = db.prepare("SELECT COUNT(*) as count FROM bookings").get().count;
        const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get().count;
        
        const revenueResult = db.prepare("SELECT SUM(total_amount) as sum FROM bookings WHERE booking_status != 'Cancelled'").get();
        const totalRevenue = revenueResult.sum || 0;

        // Today's stats
        const todayStr = new Date().toISOString().split('T')[0];
        const todayBookings = db.prepare("SELECT COUNT(*) as count, SUM(total_amount) as sum FROM bookings WHERE DATE(created_at) = ? AND booking_status != 'Cancelled'").get(todayStr);

        // Recent bookings (last 6)
        const recentBookings = db.prepare(`
            SELECT b.*, m.title as movie_title, s.show_date, s.start_time, c.name as hall_name
            FROM bookings b
            JOIN showtimes s ON b.showtime_id = s.id
            JOIN movies m ON s.movie_id = m.id
            JOIN cinemas c ON s.hall_id = c.id
            ORDER BY b.id DESC
            LIMIT 6
        `).all();

        // Top popular movies
        const popularMovies = db.prepare(`
            SELECT m.id, m.title, m.poster_url, m.genre, m.rating,
                   COUNT(b.id) as booking_count,
                   SUM(b.total_amount) as total_gross
            FROM movies m
            JOIN showtimes s ON m.id = s.movie_id
            JOIN bookings b ON s.id = b.showtime_id AND b.booking_status != 'Cancelled'
            GROUP BY m.id
            ORDER BY booking_count DESC
            LIMIT 5
        `).all();

        return res.json({
            success: true,
            metrics: {
                totalMovies,
                totalBookings,
                totalCustomers,
                totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                todayBookingsCount: todayBookings.count || 0,
                todayRevenue: parseFloat((todayBookings.sum || 0).toFixed(2))
            },
            recentBookings,
            popularMovies
        });
    } catch (err) {
        console.error('Admin metrics error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch admin metrics.' });
    }
});

// GET /api/admin/sales-chart - Data for Chart.js
router.get('/sales-chart', (req, res) => {
    try {
        // Last 7 days revenue & bookings count
        const dailyLabels = [];
        const dailyRevenue = [];
        const dailyBookings = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const labelStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            dailyLabels.push(labelStr);

            const row = db.prepare(`
                SELECT COUNT(*) as count, SUM(total_amount) as revenue
                FROM bookings
                WHERE DATE(created_at) = ? AND booking_status != 'Cancelled'
            `).get(dateStr);

            dailyRevenue.push(row.revenue ? parseFloat(row.revenue.toFixed(2)) : 0);
            dailyBookings.push(row.count || 0);
        }

        // Genre distribution
        const genreRows = db.prepare(`
            SELECT m.genre, COUNT(b.id) as count
            FROM movies m
            JOIN showtimes s ON m.id = s.movie_id
            JOIN bookings b ON s.id = b.showtime_id
            GROUP BY m.genre
        `).all();

        const genreMap = {};
        genreRows.forEach(r => {
            r.genre.split(',').forEach(g => {
                const trimmed = g.trim();
                genreMap[trimmed] = (genreMap[trimmed] || 0) + r.count;
            });
        });

        // Hall occupancy distribution
        const hallRows = db.prepare(`
            SELECT c.name, COUNT(bs.id) as booked_seats, c.total_capacity
            FROM cinemas c
            LEFT JOIN showtimes s ON c.id = s.hall_id
            LEFT JOIN booking_seats bs ON s.id = bs.showtime_id
            GROUP BY c.id
        `).all();

        return res.json({
            success: true,
            daily: {
                labels: dailyLabels,
                revenue: dailyRevenue,
                bookings: dailyBookings
            },
            genres: {
                labels: Object.keys(genreMap),
                data: Object.values(genreMap)
            },
            halls: hallRows
        });
    } catch (err) {
        console.error('Admin chart error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch sales chart data.' });
    }
});

// GET /api/admin/bookings - Search and filter all bookings
router.get('/bookings', (req, res) => {
    try {
        const { search, status, date } = req.query;

        let query = `
            SELECT b.*, m.title as movie_title, s.show_date, s.start_time, c.name as hall_name
            FROM bookings b
            JOIN showtimes s ON b.showtime_id = s.id
            JOIN movies m ON s.movie_id = m.id
            JOIN cinemas c ON s.hall_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += ' AND b.booking_status = ?';
            params.push(status);
        }

        if (date) {
            query += ' AND s.show_date = ?';
            params.push(date);
        }

        if (search) {
            query += ' AND (b.booking_code LIKE ? OR b.customer_name LIKE ? OR b.customer_email LIKE ? OR m.title LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term, term);
        }

        query += ' ORDER BY b.id DESC';

        const bookings = db.prepare(query).all(...params);

        // Attach seats info
        const getSeats = db.prepare('SELECT seat_label FROM booking_seats WHERE booking_id = ?');
        const enriched = bookings.map(b => {
            const seats = getSeats.all(b.id).map(s => s.seat_label).join(', ');
            return { ...b, seatList: seats };
        });

        return res.json({ success: true, count: enriched.length, bookings: enriched });
    } catch (err) {
        console.error('Admin bookings fetch error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
    }
});

// PUT /api/admin/bookings/:id/status - Update booking status
router.put('/bookings/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        if (!['Confirmed', 'Cancelled', 'Completed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const paymentStatus = status === 'Cancelled' ? 'Refunded' : 'Paid';

        db.prepare('UPDATE bookings SET booking_status = ?, payment_status = ? WHERE id = ?').run(status, paymentStatus, req.params.id);
        db.prepare('UPDATE payments SET status = ? WHERE booking_id = ?').run(status === 'Cancelled' ? 'Refunded' : 'Completed', req.params.id);

        return res.json({ success: true, message: `Booking status updated to ${status}.` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to update booking status.' });
    }
});

// GET /api/admin/customers - List customers with booking count & spend
router.get('/customers', (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
                   COUNT(b.id) as total_bookings,
                   COALESCE(SUM(CASE WHEN b.booking_status != 'Cancelled' THEN b.total_amount ELSE 0 END), 0) as total_spent
            FROM users u
            LEFT JOIN bookings b ON u.id = b.user_id
            WHERE u.role = 'customer'
        `;
        const params = [];

        if (search) {
            query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        query += ' GROUP BY u.id ORDER BY total_spent DESC';

        const customers = db.prepare(query).all(...params);
        return res.json({ success: true, count: customers.length, customers });
    } catch (err) {
        console.error('Admin customers error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
    }
});

// PUT /api/admin/customers/:id/status - Toggle active/suspended
router.put('/customers/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid customer status.' });
        }

        db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
        return res.json({ success: true, message: `Customer account ${status}.` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to update customer status.' });
    }
});

// GET /api/admin/reports - Detailed business reports
router.get('/reports', (req, res) => {
    try {
        // Daily Sales Report
        const dailySales = db.prepare(`
            SELECT DATE(created_at) as report_date,
                   COUNT(*) as bookings_count,
                   SUM(total_seats) as seats_sold,
                   SUM(total_amount) as total_revenue
            FROM bookings
            WHERE booking_status != 'Cancelled'
            GROUP BY DATE(created_at)
            ORDER BY report_date DESC
            LIMIT 30
        `).all();

        // Top Performing Movies
        const topMovies = db.prepare(`
            SELECT m.title, m.genre,
                   COUNT(b.id) as bookings_count,
                   SUM(b.total_seats) as total_tickets,
                   SUM(b.total_amount) as gross_revenue
            FROM movies m
            JOIN showtimes s ON m.id = s.movie_id
            JOIN bookings b ON s.id = b.showtime_id AND b.booking_status != 'Cancelled'
            GROUP BY m.id
            ORDER BY gross_revenue DESC
        `).all();

        // Hall Occupancy Statistics
        const hallStats = db.prepare(`
            SELECT c.name, c.hall_type, c.total_capacity,
                   COUNT(DISTINCT s.id) as total_showtimes,
                   COUNT(bs.id) as total_seats_booked
            FROM cinemas c
            LEFT JOIN showtimes s ON c.id = s.hall_id
            LEFT JOIN booking_seats bs ON s.id = bs.showtime_id
            GROUP BY c.id
        `).all();

        return res.json({
            success: true,
            dailySales,
            topMovies,
            hallStats
        });
    } catch (err) {
        console.error('Admin reports error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch reports.' });
    }
});

module.exports = router;
