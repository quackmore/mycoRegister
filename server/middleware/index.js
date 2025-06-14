/**
 * Export all middleware from a single point
 */
const errorMiddleware = require('./error.middleware');
const { authMiddleware, adminMiddleware, adminAuditMiddleware } = require('./auth.middleware');

module.exports = {
    errorMiddleware,
    authMiddleware,
    adminMiddleware,
    adminAuditMiddleware
};