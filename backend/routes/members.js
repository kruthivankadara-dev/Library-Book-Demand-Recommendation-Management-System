
const express = require('express');
const router = express.Router();
const db = require('../db');

const {
    authenticateToken,
    authorizeRoles
} = require('../middleware/authMiddleware');

// =====================================================
// GET ALL MEMBERS - ADMIN ONLY
// =====================================================
router.get(
    '/',
    authenticateToken,
    authorizeRoles('ADMIN'),
    async (req, res) => {
        try {
            const [rows] = await db.query(
                `SELECT member_id, full_name, email, department, created_at
                 FROM MEMBERS
                 ORDER BY member_id`
            );

            res.json(rows);

        } catch (error) {
            console.error('Fetch members error:', error.message);

            res.status(500).json({
                status: 'error',
                message: 'Failed to fetch members.'
            });
        }
    }
);

// =====================================================
// ADD NEW MEMBER - ADMIN ONLY
// =====================================================
router.post(
    '/',
    authenticateToken,
    authorizeRoles('ADMIN'),
    async (req, res) => {
        try {
            const { full_name, email, department } = req.body;

            // Validate required fields
            if (
                typeof full_name !== 'string' ||
                !full_name.trim() ||
                typeof email !== 'string' ||
                !email.trim()
            ) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Full name and email are required.'
                });
            }

            // Validate field lengths
            if (
                full_name.trim().length > 100 ||
                email.trim().length > 150
            ) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Name or email exceeds the allowed length.'
                });
            }

            // Normalize email
            const cleanEmail = email.trim().toLowerCase();

            // Validate email format
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(cleanEmail)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Please provide a valid email address.'
                });
            }

            // Validate department
            if (
                department !== undefined &&
                department !== null &&
                (
                    typeof department !== 'string' ||
                    department.trim().length > 100
                )
            ) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid department.'
                });
            }

            // Insert member using parameterized SQL
            const [result] = await db.query(
                `INSERT INTO MEMBERS
                 (full_name, email, department)
                 VALUES (?, ?, ?)`,
                [
                    full_name.trim(),
                    cleanEmail,
                    department?.trim() || null
                ]
            );

            return res.status(201).json({
                status: 'success',
                message: 'Member added successfully.',
                member_id: result.insertId
            });

        } catch (error) {
            console.error('Add member error:', error.message);

            // Handle duplicate email
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    status: 'error',
                    message: 'A member with this email already exists.'
                });
            }

            return res.status(500).json({
                status: 'error',
                message: 'Failed to add member.'
            });
        }
    }
);

// =====================================================
// GET MEMBER BY ID - ADMIN OR OWN MEMBER PROFILE
// =====================================================
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('ADMIN', 'MEMBER'),
    async (req, res) => {
        try {
            const memberId = Number(req.params.id);

            // Validate member ID
            if (!Number.isInteger(memberId) || memberId <= 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Please provide a valid member ID.'
                });
            }

            // Members can access only their own profile
            if (
                req.user.role === 'MEMBER' &&
                req.user.memberId !== memberId
            ) {
                return res.status(403).json({
                    status: 'error',
                    message: 'You can only access your own profile.'
                });
            }

            const [rows] = await db.query(
                `SELECT member_id, full_name, email, department, created_at
                 FROM MEMBERS
                 WHERE member_id = ?`,
                [memberId]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Member not found.'
                });
            }

            res.json(rows[0]);

        } catch (error) {
            console.error('Fetch member error:', error.message);

            res.status(500).json({
                status: 'error',
                message: 'Failed to fetch member.'
            });
        }
    }
);

module.exports = router;
