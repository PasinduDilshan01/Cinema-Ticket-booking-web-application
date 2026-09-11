-- Cinema Ticket Booking System Relational Schema
-- Compatible with SQLite and MySQL

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(20) DEFAULT 'customer', -- 'customer' or 'admin'
    status VARCHAR(20) DEFAULT 'active', -- 'active' or 'suspended'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cinemas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    hall_type VARCHAR(50) DEFAULT 'Standard 4K', -- 'IMAX Laser', 'Dolby Atmos', 'VIP Lounge', 'Standard 4K'
    total_rows INTEGER DEFAULT 7,
    seats_per_row INTEGER DEFAULT 10,
    total_capacity INTEGER DEFAULT 70,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hall_id INTEGER NOT NULL,
    seat_row VARCHAR(5) NOT NULL,
    seat_number INTEGER NOT NULL,
    seat_label VARCHAR(10) NOT NULL,
    seat_tier VARCHAR(20) DEFAULT 'Standard', -- 'VIP', 'Premium', 'Standard'
    tier_multiplier REAL DEFAULT 1.0,
    FOREIGN KEY(hall_id) REFERENCES cinemas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    genre VARCHAR(100) NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    rating REAL DEFAULT 8.5,
    pg_rating VARCHAR(10) DEFAULT 'PG-13',
    cast TEXT,
    director VARCHAR(100),
    release_date VARCHAR(20),
    poster_url TEXT,
    backdrop_url TEXT,
    trailer_url TEXT,
    status VARCHAR(30) DEFAULT 'now_showing', -- 'now_showing', 'coming_soon', 'archived'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS showtimes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER NOT NULL,
    hall_id INTEGER NOT NULL,
    show_date VARCHAR(20) NOT NULL, -- 'YYYY-MM-DD'
    start_time VARCHAR(10) NOT NULL, -- '18:30'
    end_time VARCHAR(10) NOT NULL,
    base_price REAL NOT NULL DEFAULT 12.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    FOREIGN KEY(hall_id) REFERENCES cinemas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_code VARCHAR(50) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    showtime_id INTEGER NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30),
    total_seats INTEGER NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0,
    tax_fee REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Credit Card',
    payment_status VARCHAR(30) DEFAULT 'Paid',
    booking_status VARCHAR(30) DEFAULT 'Confirmed', -- 'Confirmed', 'Cancelled', 'Completed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking_seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    showtime_id INTEGER NOT NULL,
    seat_label VARCHAR(10) NOT NULL,
    seat_tier VARCHAR(20) DEFAULT 'Standard',
    price REAL NOT NULL,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY(showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    amount REAL NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'Completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Indices for performance and seat lookups
CREATE INDEX IF NOT EXISTS idx_showtimes_movie ON showtimes(movie_id);
CREATE INDEX IF NOT EXISTS idx_showtimes_date ON showtimes(show_date);
CREATE INDEX IF NOT EXISTS idx_booking_seats_lookup ON booking_seats(showtime_id, seat_label);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(booking_code);
