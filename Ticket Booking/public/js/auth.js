// Authentication & User Session Manager

const Auth = {
    getUser() {
        const userJson = localStorage.getItem('cinema_user');
        try {
            return userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            return null;
        }
    },

    getToken() {
        return localStorage.getItem('cinema_token');
    },

    isLoggedIn() {
        return !!this.getToken() && !!this.getUser();
    },

    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    setSession(token, user) {
        localStorage.setItem('cinema_token', token);
        localStorage.setItem('cinema_user', JSON.stringify(user));
    },

    logout() {
        localStorage.removeItem('cinema_token');
        localStorage.removeItem('cinema_user');
        window.location.href = '/login.html';
    },

    // Guard page access
    requireAuth(redirectUrl = '/login.html') {
        if (!this.isLoggedIn()) {
            sessionStorage.setItem('redirect_after_login', window.location.href);
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    },

    requireAdmin(redirectUrl = '/login.html') {
        if (!this.isLoggedIn() || !this.isAdmin()) {
            Toast.error('Admin privileges required.');
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);
            return false;
        }
        return true;
    },

    // Initialize Navbar dynamic buttons
    renderNavbarAuth() {
        const authContainer = document.getElementById('navbarAuthButtons');
        if (!authContainer) return;

        const user = this.getUser();

        if (user) {
            const adminLink = user.role === 'admin' 
                ? `<li><a class="dropdown-item text-warning" href="/admin/index.html"><i class="fa-solid fa-shield-halved me-2"></i>Admin Dashboard</a></li><li><hr class="dropdown-divider border-secondary"></li>` 
                : '';

            authContainer.innerHTML = `
                <div class="dropdown">
                    <button class="btn btn-cinema-secondary dropdown-toggle py-2 px-3" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fa-solid fa-circle-user text-primary me-1"></i>
                        <span>${user.name.split(' ')[0]}</span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow" style="background:#161c2e; border:1px solid rgba(255,255,255,0.1);">
                        <li class="px-3 py-2 border-bottom border-secondary">
                            <div class="fw-bold">${user.name}</div>
                            <small class="text-muted">${user.email}</small>
                        </li>
                        ${adminLink}
                        <li><a class="dropdown-item" href="/my-tickets.html"><i class="fa-solid fa-ticket me-2 text-info"></i>My Tickets</a></li>
                        <li><hr class="dropdown-divider border-secondary"></li>
                        <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="Auth.logout()"><i class="fa-solid fa-arrow-right-from-bracket me-2"></i>Sign Out</a></li>
                    </ul>
                </div>
            `;
        } else {
            authContainer.innerHTML = `
                <a href="/login.html" class="btn btn-cinema-secondary py-2 px-3 me-2">Sign In</a>
                <a href="/login.html?tab=register" class="btn btn-cinema-primary py-2 px-3">Sign Up</a>
            `;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Auth.renderNavbarAuth();
});
