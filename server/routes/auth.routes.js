const express = require('express');
const { authController } = require('../controllers');
const { authMiddleware, adminMiddleware } = require('../middleware');

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

/**
 * @route POST /api/auth/register
 * @desc Register a new user (checking against allowedEmail schema)
 * @access Public
 */
router.post('/register', authController.register);

/**
 * @route GET /api/auth/verify-email
 * @desc Verify user's email address using a token
 * @access Public
 */
router.get('/verify-email', authController.verifyEmail);

/**
 * @route POST /api/auth/resend-verification
 * @desc Resend email verification token
 * @access Public
 */
router.post('/resend-verification', authController.resendVerification);

/**
 * @route POST /api/auth/forgot-password
 * @desc Initiate password reset flow
 * @access Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route GET /api/auth/reset-password
 * @desc Get the reset password form
 * @access Public
 */
router.get('/reset-password', authController.resetPasswordForm);

/**
 * @route GET /api/auth/reset-form.js
 * @desc Get the reset password form JavaScript
 * @access Public
 */
router.get('/reset-form.js', authController.resetPasswordFormJs);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password using token
 * @access Public
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route PUT /api/auth/change-password
 * @desc Change password when user is logged in
 * @access Private
 */
router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;