const express = require('express');
const { adminController } = require('../controllers');
const { authMiddleware, adminMiddleware, adminAuditMiddleware } = require('../middleware');

const router = express.Router();

// Apply audit logging to all admin routes
router.use(authMiddleware, adminMiddleware, adminAuditMiddleware);

/**
 * @route POST /api/admin/allowed
 * @desc Add an email to the allowed list (admin only)
 * @access Private (Admin)
 */
router.post('/allowed', adminController.addAllowedEmail);

/**
 * @route GET /api/admin/allowed
 * @desc Get all allowed entries (admin only)
 * @access Private (Admin)
 */
router.get('/allowed', adminController.getAllowedEmails);

/**
 * @route DELETE /api/admin/allowed/:email
 * @desc Remove an email from allowlist (admin only)
 * @access Private (Admin)
 */
router.delete('/allowed/:email', adminController.removeAllowedEmail);

/**
 * @route PATCH /api/admin/allowed/:email
 * @desc Update notes for an allowed email (admin only)
 * @access Private (Admin)
 */
router.patch('/allowed/:email', adminController.updateAllowedEmail);

/**
 * @route PUT /api/admin/users/:email/admin-status
 * @desc Set admin status for a user (admin only)
 * @access Private (Admin)
 */
router.put('/users/:email/admin-status', adminController.setUserAdminStatus);

/**
 * @route GET /api/admin/users/admins
 * @desc Get all admin users (admin only)
 * @access Private (Admin)
 */
router.get('/users/admins', adminController.getAdminUsers);

module.exports = router;