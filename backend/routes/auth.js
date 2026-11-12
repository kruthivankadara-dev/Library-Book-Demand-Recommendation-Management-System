
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const {
    authenticateToken,
    authorizeRoles
} = require('../middleware/authMiddleware');

const router = express.Router();

// MEMBER REGISTRATION
router.post('/register', async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Full name, email and password are required.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                status: 'error',
                message: 'Enter a valid email address.'
            });
        }

        if (password.length < 8 ||
            Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({
                status: 'error',
                message: 'Password must be at least 8 characters and at most 72 bytes.'
            });
        }

        // Check whether the member exists
        const [members] = await pool.query(
            'SELECT member_id, full_name, email FROM MEMBERS WHERE email = ?',
            [normalizedEmail]
        );

        if (members.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No library member found with this email.'
            });
        }

        const member = members[0];

        // Check whether an account already exists
        const [accounts] = await pool.query(
            'SELECT user_id FROM USER_ACCOUNTS WHERE member_id = ? OR email = ?',
            [member.member_id, normalizedEmail]
        );

        if (accounts.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'An account already exists for this member.'
            });
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create a MEMBER account only
        await pool.query(
            `INSERT INTO USER_ACCOUNTS
            (member_id, email, password_hash, role)
            VALUES (?, ?, ?, 'MEMBER')`,
            [member.member_id, normalizedEmail, passwordHash]
        );

        return res.status(201).json({
            status: 'success',
            message: 'Member account registered successfully.'
        });

    } catch (error) {
        console.error('Registration error:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Unable to complete registration.'
        });
    }
});


// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Email and password are required.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [accounts] = await pool.query(
            `SELECT user_id, member_id, email,
                    password_hash, role, is_active
             FROM USER_ACCOUNTS
             WHERE email = ?`,
            [normalizedEmail]
        );

        if (accounts.length === 0) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password.'
            });
        }

        const account = accounts[0];

        if (!account.is_active) {
            return res.status(403).json({
                status: 'error',
                message: 'This account has been deactivated.'
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            account.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password.'
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured.');
            return res.status(500).json({
                status: 'error',
                message: 'Authentication service is not configured.'
            });
        }

        const token = jwt.sign(
            {
                userId: account.user_id,
                memberId: account.member_id,
                email: account.email,
                role: account.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            status: 'success',
            message: 'Login successful.',
            token,
            user: {
                userId: account.user_id,
                memberId: account.member_id,
                email: account.email,
                role: account.role
            }
        });

    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Unable to complete login.'
        });
    }
});

// GET LOGGED-IN USER DETAILS
router.get('/me', authenticateToken, (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Authentication verified successfully.',
        user: req.user
    });
});

// ADMIN-ONLY TEST ROUTE
router.get(
    '/admin-test',
    authenticateToken,
    authorizeRoles('ADMIN'),
    (req, res) => {
        res.json({
            status: 'success',
            message: 'Admin authorization successful.'
        });
    }
);

// MEMBER-ONLY TEST ROUTE
router.get(
    '/member-test',
    authenticateToken,
    authorizeRoles('MEMBER'),
    (req, res) => {
        res.json({
            status: 'success',
            message: 'Member authorization successful.'
        });
    }
);

module.exports = router;
