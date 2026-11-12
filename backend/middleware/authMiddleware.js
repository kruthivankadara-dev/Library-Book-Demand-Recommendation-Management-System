
const jwt = require('jsonwebtoken');

// Verify whether the user is authenticated
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required. Please log in.'
        });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        console.error('JWT_SECRET is not configured.');

        return res.status(500).json({
            status: 'error',
            message: 'Authentication service is not configured.'
        });
    }

    jwt.verify(token, secret, (error, user) => {
        if (error) {
            return res.status(403).json({
                status: 'error',
                message: 'Invalid or expired authentication token.'
            });
        }

        req.user = user;
        next();
    });
}

// Check whether the authenticated user has an allowed role
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: 'You do not have permission to perform this action.'
            });
        }

        next();
    };
}

module.exports = {
    authenticateToken,
    authorizeRoles
};
