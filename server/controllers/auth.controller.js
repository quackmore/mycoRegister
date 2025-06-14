const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response.utils');
const { expiresIn } = require('../config/jwt');

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
            return errorResponse(res, 400, 'Nome utente e password non specificati.');
        }

        const result = await authService.loginUser(username, password);

        return successResponse(res, 200, 'Login effettuato.', {
            user: result.user, // {_id, username, email, role}
            token: result.token,
            refreshToken: result.refreshToken,
            tokenExpiresAt: result.tokenExpiresAt,
            refreshTokenExpiresAt: result.refreshTokenExpiresAt,
            dbName: result.dbName
        });
    } catch (error) {
        if (error.message === 'Nome utente o password non validi.') {
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
            return errorResponse(res, 400, 'Refresh token non specificato.');
        }

        const result = await authService.refreshToken(refreshToken);

        return successResponse(res, 200, 'Token aggiornato.', {
            token: result.token,
            expiresAt: result.expiresAt
        });
    } catch (error) {
        if (error.message === 'Refresh token non valido.') {
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

        return successResponse(res, 200, 'Scollegato.');
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

        return successResponse(res, 200, 'Profilo utente caricato.', userId);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for user registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return errorResponse(res, 400, 'Nome utente, email, e password non specificati.');
        }

        const result = await authService.registerUser(username, email, password);

        return successResponse(res, 201, 'Registrazione riuscita. Controlla la tua posta.', {
            user: username,
            email: email
        });
    } catch (error) {
        if (error.message === 'Email non autorizzata.' ||
            error.message === 'Nome utente già esisente.' ||
            error.message === 'Email già esistente.') {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for email verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyEmail = async (req, res) => {
    try {
        const token = req.query.token;

        if (!token) {
            return errorResponse(res, 400, 'Token di verifica non specificato.');
        }

        await authService.verifyEmail(token);

        const { generateEmalVerificationSuccessHTML } = require('../utils/html.utils');

        // return successResponse(res, 200, generateEmalVerificationSuccessHTML());
        // sendig the HTML directly as response to a link click
        return res.send(generateEmalVerificationSuccessHTML());
    } catch (error) {
        if (error.message === 'Token di verifica non valido o scaduto.') {
            const { generateEmalVerificationErrorHTML } = require('../utils/html.utils');
            // return errorResponse(res, 400, generateEmalVerificationErrorHTML());
            // sendig the HTML directly as response to a link click
            return res.status(400).send(generateEmalVerificationErrorHTML());
        }
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for resending verification email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return errorResponse(res, 400, 'Email non specificata.');
        }

        await authService.resendVerificationEmail(email);

        return successResponse(res, 200, 'Email di verifica inviata.');
    } catch (error) {
        if (error.message === 'Nome utente non trovato.' || error.message === 'Email già verificata.') {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for initiating password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return errorResponse(res, 400, 'Email non specificata.');
        }

        await authService.sendPasswordResetEmail(email);

        // Always return success even if email doesn't exist (for security)
        return successResponse(res, 200, 'Email di conferma password reset inviata.');
    } catch (error) {
        // Don't expose specific errors to prevent email enumeration
        return successResponse(res, 200, 'Email di conferma password reset inviata.');
    }
};

/**
 * Controller for serving the reset password form with token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetPasswordForm = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return errorResponse(res, 400, 'Token e nuova password non specificati.');
        }

        const tokenIsValid = await authService.resetPasswordVerifyToken(token);

        if (!tokenIsValid) {
            throw new Error('Reset token non valido o scaduto.');
        }
        const { generateResetPasswordFormHTML } = require('../utils/html.utils');

        // sendig the HTML directly as response to a link click
        return res.send(generateResetPasswordFormHTML(token));
    } catch (error) {
        if (error.message === 'Reset token non valido o scaduto.') {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for serving the reset password form js script
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetPasswordFormJs = async (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    const { generateResetPasswordFormJS } = require('../utils/html.utils');
    return res.send(generateResetPasswordFormJS());
};

/**
 * Controller for resetting password with token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return errorResponse(res, 400, 'Token e nuova password non specificati.');
        }

        await authService.resetPassword(token, password);

        return successResponse(res, 200, 'Password reset effettuato.');
    } catch (error) {
        if (error.message === 'Reset token non valido o scaduto.') {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Controller for changing password when logged in
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const changePassword = async (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return errorResponse(res, 400, 'Password attuale e nuova password non specificate.');
        }

        await authService.changePassword(username, currentPassword, newPassword);

        return successResponse(res, 200, 'Password modificata.');
    } catch (error) {
        console.log(error.message);
        if (error.message === 'Password attuale non valida.') {
            return errorResponse(res, 400, error.message);
        }
        return errorResponse(res, 500, error.message);
    }
};

module.exports = {
    login,
    refreshToken,
    logout,
    getCurrentUser,
    register,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPasswordForm,
    resetPasswordFormJs,
    resetPassword,
    changePassword
};