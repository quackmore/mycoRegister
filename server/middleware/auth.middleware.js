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
        return errorResponse(res, 401, 'Accesso rifiutato. Token non specificato.');
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        // Add user to request object - now using the new token structure
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role,
            // Keep CouchDB-specific fields as well
            sub: decoded.sub,
            _couchdb: decoded._couchdb
        };

        // Continue to the next middleware/controller
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return errorResponse(res, 401, 'Token scaduto.');
        }

        return errorResponse(res, 401, 'Token non valido.');
    }
};

/**
 * Middleware to check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const adminMiddleware = (req, res, next) => {
    // Make sure user exists and was properly authenticated
    if (!req.user) {
        return errorResponse(res, 401, 'Autenticazione non specificata.');
    }
    
    // Check for admin role
    if (req.user.role !== 'admin') {
        return errorResponse(res, 403, 'Accesso rifiutato.Richiest profilo admin.');
    }

    next();
};

/**
 * Middleware to log admin actions for audit purposes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const adminAuditMiddleware = (req, res, next) => {
    // Only proceed if user is authenticated and an admin
    if (!req.user || req.user.role !== 'admin') {
        return next();
    }
    
    // Log the admin action
    const adminAction = {
        userId: req.user.userId,
        username: req.user.username,
        method: req.method,
        path: req.originalUrl,
        body: req.method === 'GET' ? undefined : req.body,
        params: req.params,
        query: req.query,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress
    };
    
    // You could implement logging to database, file, or external service
    console.log('ADMIN ACTION:', JSON.stringify(adminAction));
    
    // Continue to the next middleware/controller
    next();
};

module.exports = {
    authMiddleware,
    adminMiddleware,
    adminAuditMiddleware
};