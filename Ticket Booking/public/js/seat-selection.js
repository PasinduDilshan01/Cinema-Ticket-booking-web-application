// Seat Selection Page Logic

let showtimeData = null;
let selectedSeats = []; // Array of seat objects { label, tier, price }
const MAX_SEATS = 8;
const SERVICE_FEE_PER_SEAT = 1.50;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const showtimeId = params.get('showtimeId');

    if (!showtimeId) {
        window.location.href = '/movies.html';
        return;
    }

    await loadSeatMap(showtimeId);
    setupCheckoutAction();
});

async function loadSeatMap(showtimeId) {
    try {
        const res = await API.get(`/showtimes/${showtimeId}/seats`);
        showtimeData = res;

        renderHeaderAndSummary();
        renderSeatGrid();
    } catch (err) {
        console.error('Failed to load seats:', err);
        Toast.error('Failed to load hall layout.');
        document.getElementById('cinemaSeatGrid').innerHTML = `
            <div class="text-danger py-5">
                <i class="fa-solid fa-triangle-exclamation fs-1 mb-2"></i>
                <p>Could not load seat map. Please return to movie details.</p>
                <a href="/movies.html" class="btn btn-cinema-secondary mt-2">Back to Catalog</a>
            </div>
        `;
    }
}

function renderHeaderAndSummary() {
    const s = showtimeData.showtime;
    
    // Header
    document.getElementById('hallTitle').textContent = s.hall_name;
    document.getElementById('hallDateText').innerHTML = `<i class="fa-regular fa-calendar me-1"></i>${formatDate(s.show_date)}`;
    document.getElementById('hallTimeText').innerHTML = `<i class="fa-regular fa-clock me-1"></i>${formatTime(s.start_time)}`;
    document.getElementById('hallFormatBadge').textContent = s.hall_type;

    // Sidebar Preview
    document.getElementById('summaryMoviePoster').src = s.poster_url;
    document.getElementById('summaryMovieTitle').textContent = s.movie_title;
    document.getElementById('summaryMovieMeta').textContent = `${s.duration}m • ${s.pg_rating || 'PG-13'}`;
    document.getElementById('summaryHallName').textContent = `${s.hall_name} (${s.hall_type})`;
    document.getElementById('summaryDate').textContent = formatDate(s.show_date);
    document.getElementById('summaryTime').textContent = formatTime(s.start_time);
}

function renderSeatGrid() {
    const gridContainer = document.getElementById('cinemaSeatGrid');
    gridContainer.innerHTML = '';

    const allSeats = showtimeData.seats || [];

    // Group seats by row
    const rowMap = {};
    allSeats.forEach(seat => {
        if (!rowMap[seat.row]) {
            rowMap[seat.row] = [];
        }
        rowMap[seat.row].push(seat);
    });

    Object.keys(rowMap).sort().forEach(rowKey => {
        const rowSeats = rowMap[rowKey];

        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';

        // Row letter indicator
        const rowLabel = document.createElement('div');
        rowLabel.className = 'seat-row-label';
        rowLabel.textContent = rowKey;
        rowDiv.appendChild(rowLabel);

        rowSeats.forEach(seat => {
            const seatEl = document.createElement('div');
            const isBooked = seat.status === 'booked';
            const isVip = seat.tier === 'VIP';

            seatEl.className = `cinema-seat ${seat.status} ${isVip ? 'vip-tier' : ''}`;
            seatEl.textContent = seat.number;
            seatEl.dataset.label = seat.label;
            seatEl.dataset.tier = seat.tier;
            seatEl.dataset.price = seat.price;
            seatEl.title = `${seat.label} - ${seat.tier} Tier (${formatCurrency(seat.price)})`;

            if (!isBooked) {
                seatEl.addEventListener('click', () => toggleSeatSelection(seat, seatEl));
            }

            rowDiv.appendChild(seatEl);
        });

        // Row letter on right side as well
        const rightLabel = rowLabel.cloneNode(true);
        rowDiv.appendChild(rightLabel);

        gridContainer.appendChild(rowDiv);
    });
}

function toggleSeatSelection(seat, seatElement) {
    const index = selectedSeats.findIndex(s => s.label === seat.label);

    if (index > -1) {
        // Deselect
        selectedSeats.splice(index, 1);
        seatElement.classList.remove('selected');
        seatElement.classList.add('available');
    } else {
        // Select
        if (selectedSeats.length >= MAX_SEATS) {
            Toast.warning(`You can select a maximum of ${MAX_SEATS} seats per transaction.`);
            return;
        }
        selectedSeats.push(seat);
        seatElement.classList.remove('available');
        seatElement.classList.add('selected');
    }

    updateSummarySidebar();
}

function updateSummarySidebar() {
    const listEl = document.getElementById('summarySeatList');
    const countEl = document.getElementById('summaryTicketCount');
    const subtotalEl = document.getElementById('summarySubtotal');
    const feeEl = document.getElementById('summaryServiceFee');
    const totalEl = document.getElementById('summaryTotalPrice');
    const checkoutBtn = document.getElementById('proceedToCheckoutBtn');

    const count = selectedSeats.length;
    countEl.textContent = count;

    if (count === 0) {
        listEl.textContent = 'None';
        subtotalEl.textContent = '$0.00';
        feeEl.textContent = '$0.00';
        totalEl.textContent = '$0.00';
        checkoutBtn.disabled = true;
        return;
    }

    listEl.textContent = selectedSeats.map(s => `${s.label}`).join(', ');

    const subtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
    const fee = count * SERVICE_FEE_PER_SEAT;
    const total = subtotal + fee;

    subtotalEl.textContent = formatCurrency(subtotal);
    feeEl.textContent = formatCurrency(fee);
    totalEl.textContent = formatCurrency(total);
    checkoutBtn.disabled = false;
}

function setupCheckoutAction() {
    const checkoutBtn = document.getElementById('proceedToCheckoutBtn');
    checkoutBtn.addEventListener('click', () => {
        if (selectedSeats.length === 0) return;

        // Store reservation data in sessionStorage
        const reservation = {
            showtime: showtimeData.showtime,
            selectedSeats: selectedSeats,
            subtotal: selectedSeats.reduce((sum, s) => sum + s.price, 0),
            serviceFee: selectedSeats.length * SERVICE_FEE_PER_SEAT,
            expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes lock
        };

        sessionStorage.setItem('cinema_reservation', JSON.stringify(reservation));
        window.location.href = '/checkout.html';
    });
}
