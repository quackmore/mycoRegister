const { console } = require('inspector');
const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response.utils');

/**
 * Controller for user login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate required fields
        if (!username || !password) {
            return errorResponse(res, 400, 'Username and password are required');
        }

        const result = await authService.loginUser(username, password);
        console.log(result);

        return successResponse(res, 200, 'Login successful', {
            user: username,
            token: result.token,
            refreshToken: result.refreshToken
        });
    } catch (error) {
        if (error.message === 'Invalid username or password') {
            return errorResponse(res, 401, error.message);
        }
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for refreshing authentication token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return errorResponse(res, 400, 'Refresh token is required');
        }

        const result = await authService.refreshToken(refreshToken);

        return successResponse(res, 200, 'Token refreshed successfully', {
            token: result.token
        });
    } catch (error) {
        if (error.message === 'Invalid refresh token') {
            return errorResponse(res, 401, error.message);
        }
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for user logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = async (req, res) => {
    try {
        const user = req.user;

        await authService.logoutUser(user);

        return successResponse(res, 200, 'Logout successful');
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller to get current user information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;

        const userId = await authService.getUserById(user);

        return successResponse(res, 200, 'User information retrieved successfully', userId);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

module.exports = {
    login,
    refreshToken,
    logout,
    getCurrentUser
};