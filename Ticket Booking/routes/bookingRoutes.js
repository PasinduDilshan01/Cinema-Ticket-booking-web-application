const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verifyToken, optionalToken } = require('../middleware/auth');

// Helper to generate Unique Booking ID (e.g. CNM-2026-X89K2)
function generateBookingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'CNM-2026-';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// POST /api/bookings/validate-promo
router.post('/validate-promo', (req, res) => {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Promo code required.' });

    const upperCode = code.trim().toUpperCase();
    let discount = 0;
    let message = '';

    if (upperCode === 'CINEMA20') {
        discount = (parseFloat(subtotal) * 0.20);
        message = '20% Discount applied!';
    } else if (upperCode === 'VIP5') {
        discount = 5.00;
        message = '$5.00 Discount applied!';
    } else if (upperCode === 'POPCORN') {
        discount = 3.50;
        message = 'Combo snack discount of $3.50 applied!';
    } else {
        return res.status(400).json({ success: false, message: 'Invalid or expired promo code.' });
    }

    return res.json({
        success: true,
        code: upperCode,
        discount: parseFloat(discount.toFixed(2)),
        message
    });
});

// POST /api/bookings/create - Create booking with transactional double-booking prevention
router.post('/create', optionalToken, (req, res) => {
    try {
        const {
            showtime_id,
            customer_name,
            customer_email,
            customer_phone,
            selected_seats, // array of { label: 'A1', tier: 'VIP', price: 18.00 }
            payment_method,
            promo_code
        } = req.body;

        if (!showtime_id || !customer_name || !customer_email || !selected_seats || selected_seats.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Showtime, customer info, and at least one selected seat are required.'
            });
        }

        // Verify showtime exists
        const showtime = db.prepare(`
            SELECT s.*, m.title as movie_title, c.name as hall_name
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.id
            JOIN cinemas c ON s.hall_id = c.id
            WHERE s.id = ?
        `).get(showtime_id);

        if (!showtime) {
            return res.status(404).json({ success: false, message: 'Showtime not found.' });
        }

        // Run database transaction to ensure atomicity and prevent race conditions / double bookings
        const transaction = db.transaction(() => {
            // 1. Check if ANY of the selected seats are already booked for this showtime
            const seatLabels = selected_seats.map(s => s.label);
            const placeholders = seatLabels.map(() => '?').join(',');

            const conflictQuery = `
                SELECT bs.seat_label 
                FROM booking_seats bs
                JOIN bookings b ON bs.booking_id = b.id
                WHERE bs.showtime_id = ? 
                  AND b.booking_status != 'Cancelled'
                  AND bs.seat_label IN (${placeholders})
            `;

            const conflicts = db.prepare(conflictQuery).all(showtime_id, ...seatLabels);

            if (conflicts.length > 0) {
                const conflictingLabels = conflicts.map(c => c.seat_label).join(', ');
                throw new Error(`The following seats were just booked by another user: ${conflictingLabels}. Please select different seats.`);
            }

            // 2. Compute financials
            const subtotal = selected_seats.reduce((sum, s) => sum + parseFloat(s.price), 0);
            let discount = 0;
            if (promo_code && promo_code.toUpperCase() === 'CINEMA20') {
                discount = subtotal * 0.20;
            } else if (promo_code && promo_code.toUpperCase() === 'VIP5') {
                discount = 5.00;
            } else if (promo_code && promo_code.toUpperCase() === 'POPCORN') {
                discount = 3.50;
            }
            if (discount > subtotal) discount = subtotal;

            const serviceFee = parseFloat((selected_seats.length * 1.50).toFixed(2));
            const totalAmount = parseFloat((subtotal - discount + serviceFee).toFixed(2));

            // Determine user id if logged in, or check if email maps to existing user
            let userId = req.user ? req.user.id : null;
            if (!userId) {
                const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(customer_email.toLowerCase().trim());
                userId = existingUser ? existingUser.id : 1; // Fallback to guest / primary
            }

            // Generate Unique Booking Reference
            let bookingCode = generateBookingCode();
            // Ensure unique
            while (db.prepare('SELECT id FROM bookings WHERE booking_code = ?').get(bookingCode)) {
                bookingCode = generateBookingCode();
            }

            // 3. Insert into bookings
            const insertBooking = db.prepare(`
                INSERT INTO bookings (
                    booking_code, user_id, showtime_id, customer_name, customer_email, customer_phone,
                    total_seats, subtotal, discount, tax_fee, total_amount, payment_method, payment_status, booking_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Paid', 'Confirmed')
            `);

            const bookingResult = insertBooking.run(
                bookingCode, userId, showtime_id, customer_name.trim(), customer_email.toLowerCase().trim(),
                customer_phone || '', selected_seats.length, subtotal, discount, serviceFee, totalAmount,
                payment_method || 'Credit Card'
            );

            const bookingId = bookingResult.lastInsertRowid;

            // 4. Insert into booking_seats
            const insertBookingSeat = db.prepare(`
                INSERT INTO booking_seats (booking_id, showtime_id, seat_label, seat_tier, price)
                VALUES (?, ?, ?, ?, ?)
            `);

            for (const seat of selected_seats) {
                insertBookingSeat.run(bookingId, showtime_id, seat.label, seat.tier || 'Standard', parseFloat(seat.price));
            }

            // 5. Insert payment record
            const txnId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            db.prepare(`
                INSERT INTO payments (booking_id, transaction_id, amount, payment_method, status)
                VALUES (?, ?, ?, ?, 'Completed')
            `).run(bookingId, txnId, totalAmount, payment_method || 'Credit Card');

            return {
                bookingId,
                bookingCode,
                transactionId: txnId,
                totalAmount
            };
        });

        const result = transaction();

        return res.status(201).json({
            success: true,
            message: 'Booking confirmed successfully!',
            booking: result
        });

    } catch (err) {
        console.error('Booking transaction error:', err);
        return res.status(400).json({
            success: false,
            message: err.message || 'Failed to process booking.'
        });
    }
});

// GET /api/bookings/my-bookings - Get current logged-in customer's tickets
router.get('/my-bookings', verifyToken, (req, res) => {
    try {
        const bookings = db.prepare(`
            SELECT b.*, 
                   m.title as movie_title, m.poster_url, m.backdrop_url, m.duration, m.pg_rating,
                   s.show_date, s.start_time, s.end_time,
                   c.name as hall_name, c.hall_type
            FROM bookings b
            JOIN showtimes s ON b.showtime_id = s.id
            JOIN movies m ON s.movie_id = m.id
            JOIN cinemas c ON s.hall_id = c.id
            WHERE b.user_id = ? OR b.customer_email = ?
            ORDER BY b.id DESC
        `).all(req.user.id, req.user.email);

        // Attach seats to each booking
        const getSeats = db.prepare('SELECT * FROM booking_seats WHERE booking_id = ?');
        const enrichedBookings = bookings.map(b => {
            const seats = getSeats.all(b.id);
            return {
                ...b,
                seats,
                seatList: seats.map(s => s.seat_label).join(', ')
            };
        });

        return res.json({ success: true, count: enrichedBookings.length, bookings: enrichedBookings });
    } catch (err) {
        console.error('Fetch my-bookings error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch your bookings.' });
    }
});

// GET /api/bookings/:id - Single booking details (by id or code)
router.get('/:id', (req, res) => {
    try {
        const identifier = req.params.id;
        let booking = null;

        if (identifier.startsWith('CNM-')) {
            booking = db.prepare(`
                SELECT b.*, 
                       m.title as movie_title, m.poster_url, m.backdrop_url, m.duration, m.pg_rating, m.genre,
                       s.show_date, s.start_time, s.end_time,
                       c.name as hall_name, c.hall_type
                FROM bookings b
                JOIN showtimes s ON b.showtime_id = s.id
                JOIN movies m ON s.movie_id = m.id
                JOIN cinemas c ON s.hall_id = c.id
                WHERE b.booking_code = ?
            `).get(identifier);
        } else {
            booking = db.prepare(`
                SELECT b.*, 
                       m.title as movie_title, m.poster_url, m.backdrop_url, m.duration, m.pg_rating, m.genre,
                       s.show_date, s.start_time, s.end_time,
                       c.name as hall_name, c.hall_type
                FROM bookings b
                JOIN showtimes s ON b.showtime_id = s.id
                JOIN movies m ON s.movie_id = m.id
                JOIN cinemas c ON s.hall_id = c.id
                WHERE b.id = ?
            `).get(identifier);
        }

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        const seats = db.prepare('SELECT * FROM booking_seats WHERE booking_id = ?').all(booking.id);
        const payment = db.prepare('SELECT * FROM payments WHERE booking_id = ?').get(booking.id);

        return res.json({
            success: true,
            booking: {
                ...booking,
                seats,
                seatList: seats.map(s => s.seat_label).join(', '),
                payment
            }
        });
    } catch (err) {
        console.error('Fetch booking details error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch booking details.' });
    }
});

// POST /api/bookings/:id/cancel - Cancel booking and release seats
router.post('/:id/cancel', optionalToken, (req, res) => {
    try {
        const bookingId = req.params.id;

        const booking = db.prepare('SELECT * FROM bookings WHERE id = ? OR booking_code = ?').get(bookingId, bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        if (booking.booking_status === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'This booking is already cancelled.' });
        }

        // Update booking status
        db.prepare("UPDATE bookings SET booking_status = 'Cancelled', payment_status = 'Refunded' WHERE id = ?").run(booking.id);
        db.prepare("UPDATE payments SET status = 'Refunded' WHERE booking_id = ?").run(booking.id);

        return res.json({
            success: true,
            message: 'Booking cancelled successfully. Seats have been released and refund initiated.'
        });
    } catch (err) {
        console.error('Cancel booking error:', err);
        return res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
    }
});

module.exports = router;
