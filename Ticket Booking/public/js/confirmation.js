// Booking Confirmation & Digital Ticket Rendering

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const identifier = params.get('code') || params.get('id');

    if (!identifier) {
        window.location.href = '/';
        return;
    }

    await loadBookingDetails(identifier);
});

async function loadBookingDetails(identifier) {
    try {
        const res = await API.get(`/bookings/${identifier}`);
        const booking = res.booking;

        renderTicket(booking);

        document.getElementById('confirmationLoading').classList.add('d-none');
        document.getElementById('confirmationContent').classList.remove('d-none');

    } catch (err) {
        console.error('Failed to load booking:', err);
        document.getElementById('confirmationLoading').innerHTML = `
            <div class="glass-panel p-5 text-center text-danger">
                <i class="fa-solid fa-triangle-exclamation fs-1 mb-3"></i>
                <h4>Booking Not Found</h4>
                <p class="text-muted">The requested booking could not be located.</p>
                <a href="/" class="btn btn-cinema-primary mt-3">Return Home</a>
            </div>
        `;
    }
}

function renderTicket(b) {
    document.getElementById('ticketBookingCode').textContent = b.booking_code;
    document.getElementById('ticketMovieTitle').textContent = b.movie_title;
    document.getElementById('ticketMovieMeta').textContent = `${b.genre || 'Cinema'} • ${b.duration || 120} mins • ${b.pg_rating || 'PG-13'}`;
    document.getElementById('ticketHall').textContent = `${b.hall_name} (${b.hall_type})`;
    document.getElementById('ticketDate').textContent = formatDate(b.show_date);
    document.getElementById('ticketTime').textContent = formatTime(b.start_time);
    document.getElementById('ticketSeats').textContent = b.seatList || 'N/A';
    document.getElementById('ticketCustomer').textContent = b.customer_name;
    document.getElementById('ticketTotal').textContent = formatCurrency(b.total_amount);

    // Generate Dynamic QR Code
    const qrContainer = document.getElementById('ticketQrContainer');
    qrContainer.innerHTML = '';

    const qrPayload = JSON.stringify({
        bookingCode: b.booking_code,
        movie: b.movie_title,
        hall: b.hall_name,
        date: b.show_date,
        time: b.start_time,
        seats: b.seatList,
        customer: b.customer_name,
        status: b.booking_status
    });

    if (window.QRCode) {
        new QRCode(qrContainer, {
            text: qrPayload,
            width: 128,
            height: 128,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    }
}
