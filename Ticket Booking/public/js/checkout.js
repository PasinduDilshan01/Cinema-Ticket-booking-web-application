// Checkout Page Logic

let reservation = null;
let appliedDiscount = 0;
let appliedPromoCode = '';
let selectedPaymentMethod = 'Credit Card';
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const rawRes = sessionStorage.getItem('cinema_reservation');
    if (!rawRes) {
        Toast.warning('No active seat reservation found. Please select showtime and seats.');
        setTimeout(() => {
            window.location.href = '/movies.html';
        }, 1500);
        return;
    }

    try {
        reservation = JSON.parse(rawRes);
    } catch (e) {
        window.location.href = '/movies.html';
        return;
    }

    populateOrderSummary();
    populateUserInfo();
    startCountdown();
    setupPaymentMethods();
    setupPromoCode();
    setupConfirmBooking();
});

function populateOrderSummary() {
    const s = reservation.showtime;
    const seats = reservation.selectedSeats;

    document.getElementById('checkoutPoster').src = s.poster_url;
    document.getElementById('checkoutTitle').textContent = s.movie_title;
    document.getElementById('checkoutHall').textContent = `${s.hall_name} • ${s.hall_type}`;
    document.getElementById('checkoutDateTime').innerHTML = `<i class="fa-regular fa-calendar me-1"></i>${formatDate(s.show_date)} at ${formatTime(s.start_time)}`;

    document.getElementById('checkoutSeatLabels').textContent = seats.map(seat => `${seat.label} (${seat.tier})`).join(', ');
    document.getElementById('checkoutTicketCount').textContent = seats.length;

    recalculateTotals();
}

function populateUserInfo() {
    const user = Auth.getUser();
    if (user) {
        document.getElementById('custName').value = user.name || '';
        document.getElementById('custEmail').value = user.email || '';
        document.getElementById('custPhone').value = user.phone || '';
    }
}

function recalculateTotals() {
    const subtotal = reservation.subtotal;
    const fee = reservation.serviceFee;
    const total = Math.max(0, subtotal - appliedDiscount + fee);

    document.getElementById('checkoutSubtotal').textContent = formatCurrency(subtotal);
    document.getElementById('checkoutFee').textContent = formatCurrency(fee);
    document.getElementById('checkoutFinalTotal').textContent = formatCurrency(total);

    const discountRow = document.getElementById('discountRow');
    if (appliedDiscount > 0) {
        discountRow.classList.remove('d-none');
        document.getElementById('checkoutDiscount').textContent = `-${formatCurrency(appliedDiscount)}`;
    } else {
        discountRow.classList.add('d-none');
    }
}

function setupPaymentMethods() {
    const buttons = document.querySelectorAll('#paymentMethodPills button');
    const cardFields = document.getElementById('cardPaymentFields');
    const altNotice = document.getElementById('altPaymentNotice');
    const altText = document.getElementById('altPaymentText');

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedPaymentMethod = btn.dataset.method;

            if (selectedPaymentMethod === 'Credit Card') {
                cardFields.classList.remove('d-none');
                altNotice.classList.add('d-none');
            } else {
                cardFields.classList.add('d-none');
                altNotice.classList.remove('d-none');

                if (selectedPaymentMethod === 'UPI') {
                    altText.textContent = 'Instant UPI payment. Your transaction will be verified automatically upon confirmation.';
                } else if (selectedPaymentMethod === 'PayPal') {
                    altText.textContent = 'You will be redirected to PayPal to complete authorization or pay with saved digital wallet balance.';
                } else if (selectedPaymentMethod === 'Counter') {
                    altText.textContent = 'Pay in cash or card at the cinema counter with your booking reference at least 15 mins before showtime.';
                }
            }
        });
    });
}

function setupPromoCode() {
    const promoInput = document.getElementById('promoCodeInput');
    const applyBtn = document.getElementById('applyPromoBtn');
    const msgEl = document.getElementById('promoMessage');

    const applyPromo = async () => {
        const code = promoInput.value.trim().toUpperCase();
        if (!code) return;

        try {
            const res = await API.post('/bookings/validate-promo', {
                code,
                subtotal: reservation.subtotal
            });

            appliedDiscount = res.discount;
            appliedPromoCode = res.code;
            msgEl.className = 'd-block mt-1 small text-success';
            msgEl.innerHTML = `<i class="fa-solid fa-circle-check me-1"></i>${res.message}`;
            Toast.success('Promo code applied!');
            recalculateTotals();
        } catch (err) {
            appliedDiscount = 0;
            appliedPromoCode = '';
            msgEl.className = 'd-block mt-1 small text-danger';
            msgEl.innerHTML = `<i class="fa-solid fa-circle-xmark me-1"></i>${err.message || 'Invalid promo code'}`;
            recalculateTotals();
        }
    };

    applyBtn.addEventListener('click', applyPromo);
    promoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyPromo();
        }
    });

    // Auto-apply default promo code if present
    if (promoInput.value) {
        applyPromo();
    }
}

function startCountdown() {
    const timerEl = document.getElementById('countdownTimer');
    let timeLeft = Math.floor((reservation.expiresAt - Date.now()) / 1000);

    if (timeLeft <= 0) {
        handleExpired();
        return;
    }

    timerInterval = setInterval(() => {
        timeLeft = Math.floor((reservation.expiresAt - Date.now()) / 1000);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleExpired();
            return;
        }

        const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const secs = (timeLeft % 60).toString().padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
}

function handleExpired() {
    sessionStorage.removeItem('cinema_reservation');
    Swal.fire({
        icon: 'error',
        title: 'Reservation Expired',
        text: 'Your temporary seat hold has timed out. Please re-select your seats.',
        background: '#161c2e',
        color: '#fff',
        confirmButtonColor: '#E50914'
    }).then(() => {
        window.location.href = `/seat-selection.html?showtimeId=${reservation.showtime.id}`;
    });
}

function setupConfirmBooking() {
    const confirmBtn = document.getElementById('confirmBookingBtn');

    confirmBtn.addEventListener('click', async () => {
        const name = document.getElementById('custName').value.trim();
        const email = document.getElementById('custEmail').value.trim();
        const phone = document.getElementById('custPhone').value.trim();

        if (!name || !email) {
            Toast.warning('Please enter your full name and email address.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Toast.warning('Please enter a valid email address.');
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Securing Tickets...';

        try {
            const payload = {
                showtime_id: reservation.showtime.id,
                customer_name: name,
                customer_email: email,
                customer_phone: phone,
                selected_seats: reservation.selectedSeats,
                payment_method: selectedPaymentMethod,
                promo_code: appliedPromoCode
            };

            const res = await API.post('/bookings/create', payload);

            if (timerInterval) clearInterval(timerInterval);
            sessionStorage.removeItem('cinema_reservation');

            Toast.success('Booking confirmed!');

            setTimeout(() => {
                window.location.href = `/confirmation.html?code=${res.booking.bookingCode}`;
            }, 800);

        } catch (err) {
            console.error('Booking confirmation failed:', err);
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fa-solid fa-lock me-2"></i>Confirm & Complete Booking';

            Swal.fire({
                icon: 'error',
                title: 'Booking Failed',
                text: err.message || 'An error occurred while confirming your booking.',
                background: '#161c2e',
                color: '#fff',
                confirmButtonColor: '#E50914'
            });
        }
    });
}
