const express = require('express');
const { userController } = require('../controllers');
const { authMiddleware } = require('../middleware');

const router = express.Router();

/**
 * @route DELETE /api/users/account
 * @desc Request account deletion
 * @access Private
 */
router.delete('/account', authMiddleware, userController.deleteAccount);

module.exports = router;