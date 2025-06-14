/**
 * Export all controllers from a single point
 */
const adminController = require('./admin.controller');
const authController = require('./auth.controller');
const userController = require('./user.controller');

module.exports = {
    adminController,
    authController,
    userController
};