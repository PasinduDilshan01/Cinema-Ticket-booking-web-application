// Centralized API Client & Helper Utilities
const API_BASE = '/api';

const API = {
    // Get Authorization header
    getHeaders(isJson = true) {
        const headers = {};
        if (isJson) {
            headers['Content-Type'] = 'application/json';
        }
        const token = localStorage.getItem('cinema_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // Generic Request
    async request(endpoint, options = {}) {
        try {
            const url = `${API_BASE}${endpoint}`;
            const res = await fetch(url, {
                ...options,
                headers: {
                    ...this.getHeaders(options.isJson !== false),
                    ...options.headers
                }
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || `Request failed with status ${res.status}`);
            }
            return data;
        } catch (err) {
            console.error(`API Error [${endpoint}]:`, err);
            throw err;
        }
    },

    // GET
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    // POST
    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    // PUT
    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    // DELETE
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    // Form data upload (for posters)
    async upload(endpoint, formData) {
        const token = localStorage.getItem('cinema_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Upload failed');
        return data;
    }
};

// UI Toast Notification helper (SweetAlert2 integration)
const Toast = {
    fire(title, icon = 'info') {
        if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: icon,
                title: title,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                background: '#161c2e',
                color: '#fff'
            });
        } else {
            alert(title);
        }
    },
    success(msg) { this.fire(msg, 'success'); },
    error(msg) { this.fire(msg, 'error'); },
    warning(msg) { this.fire(msg, 'warning'); },
    info(msg) { this.fire(msg, 'info'); }
};

// Formatters
function formatCurrency(amount) {
    return '$' + parseFloat(amount || 0).toFixed(2);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
}
