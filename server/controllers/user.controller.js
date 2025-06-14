const userService = require('../services/user.service');
const { successResponse, errorResponse } = require('../utils/response.utils');

/**
 * Controller for deleting user's own account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteAccount = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username) {
            return errorResponse(res, 400, 'Nome utente non specificato.');
        }

        if (!password) {
            return errorResponse(res, 400, 'Password di conferma non specificata.');
        }

        await userService.deleteUserAccount(username, password);

        return successResponse(res, 200, 'Account rimosso.');
    } catch (error) {
        if (error.message === 'Password non valida.') {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, error.message);
    }
};

module.exports = {
    deleteAccount
};