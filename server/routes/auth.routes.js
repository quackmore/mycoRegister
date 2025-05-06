const express = require('express');
const { authController } = require('../controllers');
const { authMiddleware } = require('../middleware');

const router = express.Router();

/**
 * @route POST /api/auth/login
 * @desc Login a user and get token
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh authentication token
 * @access Public (with refresh token)
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route POST /api/auth/logout
 * @desc Logout a user and invalidate token
 * @access Private
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @route GET /api/auth/me
 * @desc Get current user information
 * @access Private
 */
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;