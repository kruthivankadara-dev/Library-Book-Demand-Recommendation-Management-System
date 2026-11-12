
require('dotenv').config();

const bcrypt = require('bcrypt');
const pool = require('../db');

async function createAdmin() {
    try {
        const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const password = process.env.ADMIN_PASSWORD;

        if (!email || !password) {
            throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be configured in .env');
        }

        if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
            throw new Error('Admin password must be at least 8 characters and at most 72 bytes.');
        }

        const [existing] = await pool.query(
            'SELECT user_id FROM USER_ACCOUNTS WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            console.log('An account with this email already exists. No changes made.');
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await pool.query(
            `INSERT INTO USER_ACCOUNTS
             (member_id, email, password_hash, role)
             VALUES (NULL, ?, ?, 'ADMIN')`,
            [email, passwordHash]
        );

        console.log('ADMIN account created successfully.');
        console.log('Email:', email);

    } catch (error) {
        console.error('ADMIN setup failed:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

createAdmin();
