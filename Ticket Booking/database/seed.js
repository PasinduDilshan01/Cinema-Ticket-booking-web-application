const db = require('./db');
const bcrypt = require('bcryptjs');

function seedDatabase() {
    console.log('Seeding cinema database...');

    // Clear existing tables in correct order
    db.exec(`
        DELETE FROM payments;
        DELETE FROM booking_seats;
        DELETE FROM bookings;
        DELETE FROM showtimes;
        DELETE FROM seats;
        DELETE FROM cinemas;
        DELETE FROM movies;
        DELETE FROM users;
    `);

    // 1. Seed Users
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('admin123', salt);
    const custPass = bcrypt.hashSync('customer123', salt);

    const insertUser = db.prepare(`
        INSERT INTO users (name, email, password, phone, role, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const adminId = insertUser.run('Cinema Admin', 'admin@cinema.com', adminPass, '+1 555-0199', 'admin', 'active').lastInsertRowid;
    const cust1Id = insertUser.run('Alex Morgan', 'customer@cinema.com', custPass, '+1 555-0144', 'customer', 'active').lastInsertRowid;
    const cust2Id = insertUser.run('Sarah Connor', 'sarah.connor@example.com', custPass, '+1 555-0188', 'customer', 'active').lastInsertRowid;
    const cust3Id = insertUser.run('David Miller', 'david.miller@example.com', custPass, '+1 555-0122', 'customer', 'active').lastInsertRowid;
    const cust4Id = insertUser.run('Elena Rostova', 'elena.rostova@example.com', custPass, '+1 555-0166', 'customer', 'active').lastInsertRowid;

    console.log('✓ Users seeded (Admin: admin@cinema.com / admin123, Customer: customer@cinema.com / customer123)');

    // 2. Seed Cinemas / Halls
    const insertCinema = db.prepare(`
        INSERT INTO cinemas (name, hall_type, total_rows, seats_per_row, total_capacity)
        VALUES (?, ?, ?, ?, ?)
    `);

    const hall1 = insertCinema.run('IMAX Laser Grand Hall', 'IMAX Laser', 7, 10, 70).lastInsertRowid;
    const hall2 = insertCinema.run('Dolby Atmos Theater 2', 'Dolby Atmos', 6, 10, 60).lastInsertRowid;
    const hall3 = insertCinema.run('VIP Luxury Lounge 3', 'VIP Lounge', 5, 8, 40).lastInsertRowid;

    // 3. Generate Seats for each cinema
    const insertSeat = db.prepare(`
        INSERT INTO seats (hall_id, seat_row, seat_number, seat_label, seat_tier, tier_multiplier)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const halls = [
        { id: hall1, rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], cols: 10 },
        { id: hall2, rows: ['A', 'B', 'C', 'D', 'E', 'F'], cols: 10 },
        { id: hall3, rows: ['A', 'B', 'C', 'D', 'E'], cols: 8 }
    ];

    for (const h of halls) {
        for (let r = 0; r < h.rows.length; r++) {
            const rowLabel = h.rows[r];
            let tier = 'Standard';
            let mult = 1.0;
            if (r < 2) {
                tier = 'VIP';
                mult = 1.5;
            } else if (r < 4) {
                tier = 'Premium';
                mult = 1.25;
            }

            for (let c = 1; c <= h.cols; c++) {
                insertSeat.run(h.id, rowLabel, c, `${rowLabel}${c}`, tier, mult);
            }
        }
    }
    console.log('✓ Cinema halls and seats generated');

    // 4. Seed Movies
    const insertMovie = db.prepare(`
        INSERT INTO movies (title, description, genre, duration, rating, pg_rating, cast, director, release_date, poster_url, backdrop_url, trailer_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const moviesData = [
        {
            title: 'Cyber Horizon 2099',
            description: 'In a neon-drenched metropolis governed by rogue quantum AI, an exiled synthetic cyber-detective uncovers an existential conspiracy that threatens humanity and artificial life alike.',
            genre: 'Sci-Fi, Action, Thriller',
            duration: 148,
            rating: 9.1,
            pg_rating: 'PG-13',
            cast: 'Keanu Reeves, Ana de Armas, Ryan Gosling, Hiroyuki Sanada',
            director: 'Denis Villeneuve',
            release_date: '2026-08-15',
            poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
            trailer_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            status: 'now_showing'
        },
        {
            title: 'Shadows of the Abyss',
            description: 'A deep-sea research expedition into the Mariana Trench awakens an ancient primordial consciousness buried millions of years beneath the Earth crust.',
            genre: 'Horror, Mystery, Sci-Fi',
            duration: 124,
            rating: 8.7,
            pg_rating: 'R',
            cast: 'Cillian Murphy, Florence Pugh, Willem Dafoe',
            director: 'Guillermo del Toro',
            release_date: '2026-08-20',
            poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
            trailer_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            status: 'now_showing'
        },
        {
            title: 'Cosmic Odyssey: Nova',
            description: 'When the solar system dying sun begins collapsing prematurely, a ragtag team of interstellar explorers embarks on a high-stakes voyage through a perilous wormhole.',
            genre: 'Adventure, Sci-Fi, Drama',
            duration: 165,
            rating: 9.4,
            pg_rating: 'PG-13',
            cast: 'Matthew McConaughey, Jessica Chastain, Michael Caine',
            director: 'Christopher Nolan',
            release_date: '2026-08-28',
            poster_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&auto=format&fit=crop&q=80',
            trailer_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            status: 'now_showing'
        },
        {
            title: 'The Dragon Kingdom',
            description: 'An adventurous young alchemist and an orphaned spirit dragon unite to heal an enchanted empire fractured by dark shadow sorcery.',
            genre: 'Animation, Fantasy, Family',
            duration: 106,
            rating: 8.9,
            pg_rating: 'PG',
            cast: 'Awkwafina, Kelly Marie Tran, Benedict Cumberbatch',
            director: 'Don Hall',
            release_date: '2026-08-10',
            poster_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
            trailer_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            status: 'now_showing'
        },
        {
            title: 'Velocity: Redline',
            description: 'An elite underground street racer is forced into an adrenaline-fueled cross-country syndicate heist to save his kidnapped sister.',
            genre: 'Action, Crime, Thriller',
            duration: 132,
            rating: 8.3,
            pg_rating: 'PG-13',
            cast: 'Vin Diesel, Jason Statham, Michelle Rodriguez, Idris Elba',
            director: 'Justin Lin',
            release_date: '2026-09-01',
            poster_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&auto=format&fit=crop&q=80',
            trailer_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            status: 'now_showing'
        },
        {
            title: 'Midnight in Venice',
            description: 'Two estranged artists cross paths amidst the enchanting canals and masquerade carnivals of Venice, rekindling forgotten passions while confronting life-altering secrets.',
            genre: 'Romance, Drama',
            duration: 118,
            rating: 8.6,
            pg_rating: 'PG-13',
            cast: 'Timothée Chalamet, Zendaya, Javier Bardem',
            director: 'Luca Guadagnino',
            release_date: '2026-09-03',
            poster_url: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=800&auto=format&fit=crop&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1600&auto=format&fit=crop&q=80',
            trailer_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            status: 'now_showing'
        },
        {
            title: 'Quantum Paradox',
            description: 'A theoretical physicist inadvertently creates an infinite recursive time-loop during an experimental dark matter accelerator ignition.',
            genre: 'Sci-Fi, Mystery',
            duration: 140,
            rating: 9.0,
            pg_rating: 'PG-13',
            cast: 'Oscar Isaac, Rebecca Ferguson, Mark Ruffalo',
            director: 'Alex Garland',
            release_date: '2026-09-25',
            poster_url: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=800&auto=format&fit=crop&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
            trailer_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            status: 'coming_soon'
        },
        {
            title: 'Kingdom of the Immortals',
            description: 'Legendary demigods awaken from millennial slumber to contest the throne of Olympus in a war that will shatter mountains and seas.',
            genre: 'Action, Fantasy, Adventure',
            duration: 155,
            rating: 8.8,
            pg_rating: 'PG-13',
            cast: 'Henry Cavill, Charlize Theron, Jason Momoa',
            director: 'Zack Snyder',
            release_date: '2026-10-12',
            poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80',
            trailer_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            status: 'coming_soon'
        }
    ];

    const movieIds = [];
    for (const m of moviesData) {
        const id = insertMovie.run(
            m.title, m.description, m.genre, m.duration, m.rating, m.pg_rating,
            m.cast, m.director, m.release_date, m.poster_url, m.backdrop_url, m.trailer_url, m.status
        ).lastInsertRowid;
        movieIds.push(id);
    }
    console.log('✓ 8 Movies seeded');

    // 5. Seed Showtimes for Today and the next 6 days
    const insertShowtime = db.prepare(`
        INSERT INTO showtimes (movie_id, hall_id, show_date, start_time, end_time, base_price)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const today = new Date();
    const showtimeSlots = [
        { start: '10:30', end: '13:00', price: 10.00 },
        { start: '13:45', end: '16:15', price: 12.50 },
        { start: '17:00', end: '19:30', price: 14.00 },
        { start: '20:15', end: '22:45', price: 15.00 },
        { start: '23:00', end: '01:30', price: 13.00 }
    ];

    const showtimeIds = [];

    // Schedule only now_showing movies
    const nowShowingMovieIds = movieIds.slice(0, 6);

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const d = new Date(today);
        d.setDate(today.getDate() + dayOffset);
        const dateStr = d.toISOString().split('T')[0];

        // For each day, schedule showtimes across halls
        nowShowingMovieIds.forEach((mId, index) => {
            const hallId = (index % 3 === 0) ? hall1 : (index % 3 === 1 ? hall2 : hall3);
            const slotsForMovie = showtimeSlots.slice(index % 2, (index % 2) + 3);

            for (const slot of slotsForMovie) {
                const sId = insertShowtime.run(
                    mId, hallId, dateStr, slot.start, slot.end, slot.price
                ).lastInsertRowid;
                showtimeIds.push(sId);
            }
        });
    }
    console.log(`✓ ${showtimeIds.length} Showtimes created over next 7 days`);

    // 6. Seed Sample Bookings, Booking Seats & Payments
    const insertBooking = db.prepare(`
        INSERT INTO bookings (booking_code, user_id, showtime_id, customer_name, customer_email, customer_phone, total_seats, subtotal, discount, tax_fee, total_amount, payment_method, payment_status, booking_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertBookingSeat = db.prepare(`
        INSERT INTO booking_seats (booking_id, showtime_id, seat_label, seat_tier, price)
        VALUES (?, ?, ?, ?, ?)
    `);

    const insertPayment = db.prepare(`
        INSERT INTO payments (booking_id, transaction_id, amount, payment_method, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const sampleBookings = [
        {
            code: 'CNM-2026-X89K2',
            userId: cust1Id,
            showtimeId: showtimeIds[0],
            name: 'Alex Morgan',
            email: 'customer@cinema.com',
            phone: '+1 555-0144',
            seats: [
                { label: 'C5', tier: 'Premium', price: 17.50 },
                { label: 'C6', tier: 'Premium', price: 17.50 }
            ],
            discount: 0,
            tax: 3.50,
            method: 'Credit Card',
            daysAgo: 1
        },
        {
            code: 'CNM-2026-M47V1',
            userId: cust2Id,
            showtimeId: showtimeIds[0],
            name: 'Sarah Connor',
            email: 'sarah.connor@example.com',
            phone: '+1 555-0188',
            seats: [
                { label: 'A3', tier: 'VIP', price: 21.00 },
                { label: 'A4', tier: 'VIP', price: 21.00 }
            ],
            discount: 5.00,
            tax: 3.70,
            method: 'UPI',
            daysAgo: 2
        },
        {
            code: 'CNM-2026-T92L4',
            userId: cust3Id,
            showtimeId: showtimeIds[1],
            name: 'David Miller',
            email: 'david.miller@example.com',
            phone: '+1 555-0122',
            seats: [
                { label: 'D4', tier: 'Premium', price: 15.60 },
                { label: 'D5', tier: 'Premium', price: 15.60 },
                { label: 'D6', tier: 'Premium', price: 15.60 }
            ],
            discount: 0,
            tax: 4.50,
            method: 'PayPal',
            daysAgo: 0
        },
        {
            code: 'CNM-2026-W33P9',
            userId: cust4Id,
            showtimeId: showtimeIds[2],
            name: 'Elena Rostova',
            email: 'elena.rostova@example.com',
            phone: '+1 555-0166',
            seats: [
                { label: 'B4', tier: 'VIP', price: 22.50 }
            ],
            discount: 0,
            tax: 2.25,
            method: 'Credit Card',
            daysAgo: 3
        }
    ];

    for (const b of sampleBookings) {
        const subtotal = b.seats.reduce((sum, s) => sum + s.price, 0);
        const total = subtotal - b.discount + b.tax;

        const bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() - b.daysAgo);
        const dateStr = bookingDate.toISOString();

        const bId = insertBooking.run(
            b.code, b.userId, b.showtimeId, b.name, b.email, b.phone,
            b.seats.length, subtotal, b.discount, b.tax, total,
            b.method, 'Paid', 'Confirmed', dateStr
        ).lastInsertRowid;

        for (const seat of b.seats) {
            insertBookingSeat.run(bId, b.showtimeId, seat.label, seat.tier, seat.price);
        }

        insertPayment.run(bId, `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`, total, b.method, 'Completed', dateStr);
    }

    console.log('✓ Sample bookings & payment transactions generated');
    console.log('==============================================');
    console.log('CINEMA DATABASE SEEDED SUCCESSFULLY!');
    console.log('==============================================');
}

seedDatabase();
