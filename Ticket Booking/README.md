# 🎬 CINEVERSE - Online Cinema Ticket Booking System

A modern, responsive, full-stack Cinema Ticket Booking website with customer booking flows, interactive hall seat selection, real dynamic QR-code tickets, checkout, user authentication, and a complete Admin Dashboard with sales analytics and CRUD management.

## 🌐 Live Demo

> **👉 [Click here to view the Live Site](https://cineverse-XXXX.onrender.com)**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## ✨ Features

### 👤 Customer Experience
- **Cinematic Dark-Neon UI**: Premium dark aesthetic (`#080a10`), ruby red & violet neon accents, glassmorphic cards, and smooth micro-animations.
- **Home Page**: Hero section with featured trailer teaser, "Now Showing", "Coming Soon", "Popular Blockbusters", live search bar, and genre filter chips.
- **Movie Catalog (`/movies.html`)**: Filter by genre, age rating, release status, runtime, and sorting (Top Rated, Newest, Title).
- **Movie Details (`/movie-details.html`)**: Synopsis, cast & crew, trailer popup video modal, 7-day date selector, and cinema hall showtime badges.
- **Interactive Seat Selection (`/seat-selection.html`)**: Curved glowing theater SCREEN, rows A-G with seat tiers (VIP Recliner, Premium, Standard), real-time pricing calculation sidebar, and race-condition conflict locks.
- **Checkout (`/checkout.html`)**: 10-minute temporary seat lock countdown timer, promo discount codes (`CINEMA20`, `VIP5`), customer contact form, simulated card/UPI/PayPal payment options.
- **Booking Confirmation (`/confirmation.html`)**: Perforated digital ticket card with verifiable dynamic QR code, print pass view, and download.
- **My Tickets (`/my-tickets.html`)**: Upcoming & past booking history with countdown timers and one-click ticket cancellation / instant seat release.
- **Authentication (`/login.html`)**: User registration, login, and 1-click demo logins.

### 🛡️ Admin Dashboard (`/admin/index.html`)
- **KPI Metrics**: Total Revenue, Total Bookings, Registered Customers, Today's Sales.
- **Chart.js Visualizations**: 7-day sales revenue trend line graph and genre popularity doughnut chart.
- **Movie Management (`/admin/movies.html`)**: Full CRUD (Add movie with image URL or file upload, edit, delete, status toggling).
- **Showtime Scheduling (`/admin/showtimes.html`)**: Schedule screenings across cinema halls (IMAX Laser, Dolby Atmos, VIP Lounge) with custom pricing.
- **Booking Ledger (`/admin/bookings.html`)**: Search, filter by date/status, update booking status, view customer/seat breakdown, and cancel bookings.
- **Customer Directory (`/admin/customers.html`)**: User directory with spend tracking and account status toggles (Active / Suspended).
- **Reports & Analytics (`/admin/reports.html`)**: Daily sales summaries, top grossing movies, hall occupancy, and CSV export.

---

## 🗄️ Relational Database Schema (`database/schema.sql`)
1. `users` (id, name, email, password, phone, role, status, created_at)
2. `cinemas` (id, name, hall_type, total_rows, seats_per_row, total_capacity)
3. `seats` (id, hall_id, seat_row, seat_number, seat_label, seat_tier, tier_multiplier)
4. `movies` (id, title, description, genre, duration, rating, pg_rating, cast, director, release_date, poster_url, backdrop_url, trailer_url, status)
5. `showtimes` (id, movie_id, hall_id, show_date, start_time, end_time, base_price)
6. `bookings` (id, booking_code, user_id, showtime_id, customer_name, customer_email, customer_phone, total_seats, subtotal, discount, tax_fee, total_amount, payment_method, payment_status, booking_status)
7. `booking_seats` (id, booking_id, showtime_id, seat_label, seat_tier, price)
8. `payments` (id, booking_id, transaction_id, amount, payment_method, status)

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database with Rich Sample Data
```bash
node database/seed.js
```

### 3. Start the Server
```bash
npm start
```

Open your browser at:
- **Customer Portal**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard**: [http://localhost:3000/admin/index.html](http://localhost:3000/admin/index.html)

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@cinema.com` | `admin123` |
| **Customer** | `customer@cinema.com` | `customer123` |

*Promo code for 20% discount at checkout:* `CINEMA20`
