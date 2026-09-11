// Login & Registration Page Logic

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    if (Auth.isLoggedIn()) {
        const user = Auth.getUser();
        if (user && user.role === 'admin') {
            window.location.href = '/admin/index.html';
        } else {
            window.location.href = '/';
        }
        return;
    }

    // Check URL query param for tab
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'register') {
        switchTab('register');
    }

    setupTabs();
    setupLoginForm();
    setupRegisterForm();
});

function setupTabs() {
    const loginBtn = document.getElementById('loginTabBtn');
    const registerBtn = document.getElementById('registerTabBtn');

    loginBtn.addEventListener('click', () => switchTab('login'));
    registerBtn.addEventListener('click', () => switchTab('register'));
}

function switchTab(tab) {
    const loginBtn = document.getElementById('loginTabBtn');
    const registerBtn = document.getElementById('registerTabBtn');
    const loginSec = document.getElementById('loginFormSection');
    const regSec = document.getElementById('registerFormSection');

    if (tab === 'register') {
        loginBtn.classList.remove('active');
        registerBtn.classList.add('active');
        loginSec.classList.add('d-none');
        regSec.classList.remove('d-none');
    } else {
        registerBtn.classList.remove('active');
        loginBtn.classList.add('active');
        regSec.classList.add('d-none');
        loginSec.classList.remove('d-none');
    }
}

function setupLoginForm() {
    const form = document.getElementById('loginForm');
    const submitBtn = document.getElementById('loginSubmitBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In...';

        try {
            const res = await API.post('/auth/login', { email, password });
            Auth.setSession(res.token, res.user);
            Toast.success('Login successful! Welcome back.');

            setTimeout(() => {
                const redirect = sessionStorage.getItem('redirect_after_login');
                sessionStorage.removeItem('redirect_after_login');

                if (res.user.role === 'admin') {
                    window.location.href = '/admin/index.html';
                } else if (redirect) {
                    window.location.href = redirect;
                } else {
                    window.location.href = '/';
                }
            }, 600);
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket me-2"></i>Sign In';
            Toast.error(err.message || 'Login failed. Please check credentials.');
        }
    });
}

function setupRegisterForm() {
    const form = document.getElementById('registerForm');
    const submitBtn = document.getElementById('regSubmitBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const password = document.getElementById('regPassword').value;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating Account...';

        try {
            const res = await API.post('/auth/register', { name, email, phone, password });
            Auth.setSession(res.token, res.user);
            Toast.success('Account created successfully!');

            setTimeout(() => {
                window.location.href = '/';
            }, 600);
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-user-plus me-2"></i>Create Account';
            Toast.error(err.message || 'Registration failed.');
        }
    });
}

function fillAndLogin(email, password) {
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPassword').value = password;
    switchTab('login');
    document.getElementById('loginForm').dispatchEvent(new Event('submit'));
}
