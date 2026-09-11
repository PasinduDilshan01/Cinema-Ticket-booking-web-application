const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { JWT_SECRET, verifyToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
        }

        // Email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }

        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
        if (existing) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = db.prepare(`
            INSERT INTO users (name, email, password, phone, role, status)
            VALUES (?, ?, ?, ?, 'customer', 'active')
        `).run(name.trim(), email.toLowerCase().trim(), hashedPassword, phone || '');

        const user = {
            id: result.lastInsertRowid,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone || '',
            role: 'customer'
        };

        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

        return res.status(201).json({
            success: true,
            message: 'Registration successful!',
            token,
            user
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
        }

        const match = bcrypt.compareSync(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const payload = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

        return res.json({
            success: true,
            message: 'Login successful!',
            token,
            user: payload
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
    try {
        const user = db.prepare('SELECT id, name, email, phone, role, status, created_at FROM users WHERE id = ?').get(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        return res.json({ success: true, user });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error fetching user.' });
    }
});

module.exports = router;
