const jwt = require('jsonwebtoken');
const config = require('../config');
const { errorResponse } = require('../utils/response.utils');

/**
 * Middleware to verify JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authMiddleware = (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse(res, 401, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        // Add user to request object
        req.user = decoded.user;

        // Continue to the next middleware/controller
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return errorResponse(res, 401, 'Token expired');
        }

        return errorResponse(res, 401, 'Invalid token');
    }
};

/**
 * Middleware to check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return errorResponse(res, 403, 'Access denied. Admin privileges required.');
    }

    next();
};

module.exports = {
    authMiddleware,
    adminMiddleware
};