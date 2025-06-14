const jwt = require('jsonwebtoken');
const config = require('../config');
const { generateToken } = require('../utils/jwt.utils');
const bcrypt = require('bcryptjs');
const { userDb } = require('../db/userDb'); // Import the user database interface
require('dotenv').config();

// CouchDB username for token generation
const COUCHDB_USERNAME = process.env.COUCHDB_USERNAME;

/**
 * Service for user login
 * @param {string} username - User name or email
 * @param {string} password - User password
 * @returns {Object} - User data and tokens
 */
const loginUser = async (username, password) => {
    if (!username || !password) {
        throw new Error('Nome utente/email e password non specificati.');
    }

    // Initialize DB connection
    const { userManager } = await userDb();

    // Check if input is email or username
    const isEmail = username.includes('@');

    // Find user by email or username
    let user;
    if (isEmail) {
        user = await userManager.getUserByEmail(username);
    } else {
        user = await userManager.getUserByUsername(username);
    }

    if (!user) {
        throw new Error('Nome utente o password non validi.');
    }

    // Verify password
    const isPasswordValid = await userManager.authenticateUser(user.email, password);
    if (!isPasswordValid) {
        throw new Error('Nome utente o password non validi.');
    }

    // Check if email is verified (if required by your app)
    if (!user.isVerified) {
        throw new Error('Email non verificata. Verifica prima la tua email.');
    }

    // Generate tokens
    const token = generateToken({
        // App-specific fields
        userId: user._id,
        username: user.username,
        role: user.role,

        // CouchDB-required fields
        sub: COUCHDB_USERNAME,
        _couchdb: {
            roles: ["user"]
        }
    }, config.jwt.expiresIn);

    // Generate refresh token
    const refreshToken = generateToken({ userId: user._id }, config.jwt.refreshExpiresIn);

    // Store session in database
    const sessionData = {
        id: Date.now().toString(),
        refreshToken,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + config.jwt.refreshExpiresIn * 1000).toISOString(),
        userAgent: null, // Can be passed from controller if needed
        ip: null, // Can be passed from controller if needed
        isRevoked: false
    };

    await userManager.addUserSession(user._id, sessionData);

    return {
        user: { username: user.username, email: user.email, role: user.role },
        token,
        refreshToken,
        tokenExpiresAt: new Date(Date.now() + config.jwt.expiresIn * 1000).toISOString(),
        refreshTokenExpiresAt: new Date(Date.now() + config.jwt.refreshExpiresIn * 1000).toISOString(),
        dbName: process.env.COUCHDB_DATABASE
    };
};

/**
 * Service for refreshing tokens
 * @param {string} refreshToken - Refresh token
 * @returns {Object} - New access token
 */
const refreshToken = async (refreshToken) => {
    try {
        // Verify the refresh token structure
        const decoded = jwt.verify(refreshToken, config.jwt.secret);

        if (!decoded.userId) {
            throw new Error('Refresh token non valido.');
        }

        // Initialize DB connection
        const { userManager } = await userDb();

        // Find user by refresh token
        const { user } = await userManager.findUserByRefreshToken(refreshToken);

        if (!user) {
            throw new Error('Refresh token o token revocato.');
        }

        // Check if token has been revoked
        const session = user.sessions.find(s => s.refreshToken === refreshToken && !s.isRevoked);
        if (!session) {
            throw new Error('Token revocato.');
        }

        // Check if token has expired
        if (new Date(session.expiresAt) < new Date()) {
            // Revoke expired token
            await userManager.revokeUserSession(user._id, session.id);
            throw new Error('Refresh token scaduto.');
        }

        // Generate a new access token
        const token = generateToken({
            // App-specific fields
            userId: user._id,
            username: user.username,
            role: user.role,

            // CouchDB-required fields
            sub: COUCHDB_USERNAME,
            _couchdb: {
                roles: ["user"]
            }
        }, config.jwt.expiresIn);

        return { token, expiresAt: new Date(Date.now() + config.jwt.expiresIn * 1000).toISOString() };
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            throw new Error('Refresh token non valido.');
        }
        throw error;
    }
};

/**
 * Service for user logout
 * @param {Object} user - User object from token
 */
const logoutUser = async (user) => {
    if (!user || !user.userId) {
        throw new Error('Dati utente non validi.');
    }

    // Initialize DB connection
    const { userManager } = await userDb();

    // Revoke all sessions for this user
    await userManager.revokeAllUserSessions(user.userId);

    return true;
};

/**
 * Service to get user by ID
 * @param {Object} user - User object from token
 * @returns {Object} - User data
 */
const getUserById = async (user) => {
    if (!user || !user.userId) {
        throw new Error('Utente non trovato.');
    }

    // Initialize DB connection
    const { userManager } = await userDb();

    // Get user by ID (extracting from email format if needed)
    const userId = user.userId;
    const email = userId.startsWith('user:') ? userId.substring(5) : null;

    let userDoc;
    if (email) {
        userDoc = await userManager.getUserByEmail(email);
    } else {
        // Implement additional lookup if needed
        throw new Error('Identificativo utente non valido.');
    }

    if (!userDoc) {
        throw new Error('Utente non trovato.');
    }

    // Return sanitized user data (remove sensitive fields)
    const { passwordHash, sessions, verificationToken, passwordResetToken, revokedTokens, ...safeUserData } = userDoc;
    return safeUserData;
};

/**
 * Service for user registration
 * @param {string} username - User's username
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Object} - Registration result
 */
const registerUser = async (username, email, password) => {
    // Initialize DB connection
    const { userManager, allowedEmailManager } = await userDb();

    // Check if email is in the allowed list (if implemented)
    const isAllowed = await allowedEmailManager.isEmailAllowed(email);
    if (!isAllowed) {
        throw new Error('Email non autorizzata.');
    }

    // Check if username already exists
    const existingUsername = await userManager.getUserByUsername(username);
    if (existingUsername) {
        throw new Error('Nome utente già esisente.');
    }

    // Check if email already exists
    const existingEmail = await userManager.getUserByEmail(email);
    if (existingEmail) {
        throw new Error('Email già esistente.');
    }

    // Create new user
    const user = await userManager.createUser(username, email, password);

    // Generate verification token
    const verificationToken = generateToken({ userId: user._id, action: 'verify_email' }, config.jwt.expiresIn24H);

    // Store verification token
    await userManager.setVerificationToken(user._id, {
        token: verificationToken,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });

    // Send verification email
    const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${verificationToken}`;
    const { sendEmail, generateVerificationEmailHTML } = require('../utils/email.utils');
    try {
        await sendEmail({
            to: email,
            subject: 'Verifica il tuo indirizzo email',
            html: generateVerificationEmailHTML(username, verificationUrl)
        });
    } catch (error) {
        console.error('Error sending verification email:', error);
        // Continue with user creation even if email fails
        // This is a common approach to avoid blocking registration 
        // due to temporary email service issues.
    }
    return { username, email };
};

/**
 * Service for email verification
 * @param {string} token - Verification token
 */
const verifyEmail = async (token) => {
    try {
        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        if (!decoded.userId || decoded.action !== 'verify_email') {
            throw new Error('Token di verifica non valido.');
        }

        // Initialize DB connection
        const { userManager } = await userDb();

        // Find user by verification token
        const user = await userManager.findUserByVerificationToken(token);

        if (!user) {
            throw new Error('Token di verifica non valido o scaduto.');
        }

        // Check if token is expired
        const tokenData = user.verificationToken;
        if (new Date(tokenData.expiresAt) < new Date()) {
            throw new Error('Token di verifica scaduto.');
        }

        // Update user status
        await userManager.updateUser(user.email, { isVerified: true });

        // Clear verification token
        await userManager.clearVerificationToken(user._id);

        return true;
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            throw new Error('Token di verifica non valido o scaduto.');
        }
        throw error;
    }
};

/**
 * Service for resending verification email
 * @param {string} email - User's email
 */
const resendVerificationEmail = async (email) => {
    // Initialize DB connection
    const { userManager } = await userDb();

    // Get user by email
    const user = await userManager.getUserByEmail(email);

    if (!user) {
        throw new Error('Utente non trovato.');
    }

    if (user.isVerified) {
        throw new Error('Email già verificata.');
    }

    // Generate new verification token
    const verificationToken = generateToken({ userId: user._id, action: 'verify_email' }, config.jwt.expiresIn24H);

    // Store verification token
    await userManager.setVerificationToken(user._id, {
        token: verificationToken,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });

    // Send verification email
    const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${verificationToken}`;
    const { sendEmail, generateVerificationEmailHTML } = require('../utils/email.utils');
    try {
        await sendEmail({
            to: email,
            subject: 'Verifica il tuo indirizzo email',
            html: generateVerificationEmailHTML(user.username, verificationUrl)
        });
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Errore nel tentativo di invio email di verifica.');
    }
    return true;
};

/**
 * Service for sending password reset email
 * @param {string} email - User's email
 */
const sendPasswordResetEmail = async (email) => {
    // Initialize DB connection
    const { userManager } = await userDb();

    // Check if input is email or username
    const isEmail = email.includes('@');

    // Find user by email or username
    let user;
    if (isEmail) {
        user = await userManager.getUserByEmail(email);
    } else {
        user = await userManager.getUserByUsername(email);
    }

    if (!user) {
        // Don't expose whether email exists (security best practice)
        return true;
    }
    // Generate password reset token
    const resetToken = generateToken({ userId: user._id, action: 'reset_password' }, config.jwt.expiresIn1H);

    // Store reset token
    await userManager.setPasswordResetToken(user._id, {
        token: resetToken,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        isUsed: false
    });

    // Send password reset email
    const resetUrl = `${process.env.BASE_URL}/api/auth/reset-password?token=${resetToken}`;
    const { sendEmail, generatePasswordResetEmailHTML } = require('../utils/email.utils');
    try {
        await sendEmail({
            to: user.email,
            subject: 'Richiesta reset password',
            html: generatePasswordResetEmailHTML(user.username, resetUrl)
        });
    } catch (error) {
        console.error('Error sending password reset email:', error);
        // Don't expose error details - still return true for security
    }

    return true;
};

/**
 * Service for serving the reset password form with token
 * @param {string} token - Password reset token
 */
const resetPasswordVerifyToken = async (token) => {
    try {
        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        if (!decoded.userId || decoded.action !== 'reset_password') {
            throw new Error('Reset token non valido.');
        }

        // Initialize DB connection
        const { userManager } = await userDb();

        // Find user by reset token
        const user = await userManager.findUserByPasswordResetToken(token);

        if (!user) {
            throw new Error('Reset token non valido o scaduto.');
        }

        // Check if token is expired or used
        const tokenData = user.passwordResetToken;
        if (new Date(tokenData.expiresAt) < new Date() || tokenData.isUsed) {
            throw new Error('Reset token non valido o scaduto.');
        }

        return true;
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            throw new Error('Reset token non valido o scaduto.');
        }
        throw error;
    }
};

/**
 * Service for resetting password with token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 */
const resetPassword = async (token, newPassword) => {
    try {
        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        if (!decoded.userId || decoded.action !== 'reset_password') {
            throw new Error('Invalid reset token');
        }

        // Initialize DB connection
        const { userManager } = await userDb();

        // Find user by reset token
        const user = await userManager.findUserByPasswordResetToken(token);

        if (!user) {
            throw new Error('Reset token non valido o scaduto.');
        }

        // Check if token is expired or used
        const tokenData = user.passwordResetToken;
        if (new Date(tokenData.expiresAt) < new Date() || tokenData.isUsed) {
            throw new Error('Reset token non valido o scaduto.');
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await userManager.updateUser(user.email, { passwordHash: hashedPassword });

        // Mark token as used
        await userManager.markPasswordResetTokenUsed(user._id);

        // Revoke all existing sessions for security
        await userManager.revokeAllUserSessions(user._id);

        return true;
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            throw new Error('Reset token non valido o scaduto.');
        }
        throw error;
    }
};

/**
 * Service for changing password when logged in
 * @param {Object} user - User object from token
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 */
const changePassword = async (username, currentPassword, newPassword) => {
    if (!username) {
        throw new Error('Utente non trovato.');
    }

    // Initialize DB connection
    const { userManager } = await userDb();

    const userDoc = await userManager.getUserByUsername(username);

    if (!userDoc) {
        throw new Error('Utente non trovato.');
    }

    const authenticated = await userManager.authenticateUser(userDoc.email, currentPassword);

    if (!authenticated) {
        throw new Error('Password non valida.');
    }

    // Update password
    await userManager.updateUser(userDoc.email, { password: newPassword });

    // Optionally revoke all other sessions
    // await userManager.revokeAllUserSessions(user.userId);

    return true;
};

module.exports = {
    loginUser,
    refreshToken,
    logoutUser,
    getUserById,
    registerUser,
    verifyEmail,
    resendVerificationEmail,
    sendPasswordResetEmail,
    resetPasswordVerifyToken,
    resetPassword,
    changePassword
};