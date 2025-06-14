const adminService = require('../services/admin.service');
const { successResponse, errorResponse } = require('../utils/response.utils');

/**
 * Controller for adding email to allowed list
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addAllowedEmail = async (req, res) => {
    try {
        const { email, notes } = req.body;

        if (!email) {
            return errorResponse(res, 400, 'Email non specificata.');
        }

        const result = await adminService.addEmailToAllowedList(email, notes || '');

        return successResponse(res, 201, 'Email autorizzata aggiunta.', result);
    } catch (error) {
        if (error.message === 'Email autorizzata già presente.') {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for getting all allowed emails
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllowedEmails = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;

        const allowedEmails = await adminService.getAllowedEmails(limit, skip);

        return successResponse(res, 200, 'Email autorizzate caricate.', allowedEmails);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for removing email from allowed list
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeAllowedEmail = async (req, res) => {
    try {
        const { email } = req.params;

        if (!email) {
            return errorResponse(res, 400, 'Email non specificata.');
        }

        await adminService.removeEmailFromAllowedList(email);

        return successResponse(res, 200, 'Email autorizzara rimossa.');
    } catch (error) {
        if (error.message === 'Email autorizzara non trovata.') {
            return errorResponse(res, 404, error.message);
        }
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for updating notes for an allowed email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateAllowedEmail = async (req, res) => {
    try {
        const { email } = req.params;
        const { newEmail, notes } = req.body;

        if (!email) {
            return errorResponse(res, 400, 'Email non specificata.');
        }

        if (notes === undefined) {
            return errorResponse(res, 400, 'Note non specificate.');
        }

        const updated = await adminService.updateAllowedEmail(email, newEmail,notes);

        return successResponse(res, 200, 'Note aggiornate', updated);
    } catch (error) {
        if (error.message === 'Email autorizzara non trovata.') {
            return errorResponse(res, 404, error.message);
        }
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for promoting/demoting user to/from admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const setUserAdminStatus = async (req, res) => {
    try {
        const { email } = req.params;
        const { isAdmin } = req.body;

        if (!email) {
            return errorResponse(res, 400, 'Email non specificata.');
        }

        if (typeof isAdmin !== 'boolean') {
            return errorResponse(res, 400, 'isAdmin non specificato.');
        }

        const updated = await adminService.setUserAdminStatus(email, isAdmin);

        return successResponse(
            res, 
            200, 
            `User ${isAdmin ? 'promoted to' : 'demoted from'} admin role successfully`, 
            updated
        );
    } catch (error) {
        if (error.message === 'User not found') {
            return errorResponse(res, 404, error.message);
        }
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for getting all admin users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAdminUsers = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;

        const adminUsers = await adminService.getAdminUsers(limit, skip);

        return successResponse(res, 200, 'Admin caricati.', adminUsers);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

module.exports = {
    addAllowedEmail,
    getAllowedEmails,
    removeAllowedEmail,
    updateAllowedEmail,
    setUserAdminStatus,
    getAdminUsers
};