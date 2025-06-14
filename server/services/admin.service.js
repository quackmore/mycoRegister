const { userDb } = require('../db/userDb');

/**
 * Service for adding an email to the allowed list
 * @param {string} email - Email to add to allowed list
 * @param {string} notes - Optional notes about this email
 * @returns {Object} - The created allowed email document
 */
const addEmailToAllowedList = async (email, notes = '') => {
    if (!email) {
        throw new Error('Email non specificata.');
    }

    // Initialize DB connection
    const { allowedEmailManager } = await userDb();

    // Check if email already exists in allowed list
    const existingEmail = await allowedEmailManager.getAllowedEmail(email);
    if (existingEmail) {
        throw new Error('Email autorizzata già presente.');
    }

    // Add email to allowed list
    const result = await allowedEmailManager.addAllowedEmail(email, notes);
    return result;
};

/**
 * Service for retrieving all allowed emails with pagination
 * @param {number} limit - Maximum number of records to retrieve
 * @param {number} skip - Number of records to skip (for pagination)
 * @returns {Array} - Array of allowed email documents
 */
const getAllowedEmails = async (limit = 50, skip = 0) => {
    // Initialize DB connection
    const { allowedEmailManager } = await userDb();

    // Get all allowed emails with pagination
    const allowedEmails = await allowedEmailManager.listAllowedEmails(limit, skip);
    return allowedEmails;
};

/**
 * Service for removing an email from the allowed list
 * @param {string} email - Email to remove from allowed list
 * @returns {boolean} - Success indicator
 */
const removeEmailFromAllowedList = async (email) => {
    if (!email) {
        throw new Error('Email non specificata.');
    }

    // Initialize DB connection
    const { allowedEmailManager } = await userDb();

    // Check if email exists in allowed list
    const existingEmail = await allowedEmailManager.getAllowedEmail(email);
    if (!existingEmail) {
        throw new Error('Email autorizzara non trovata.');
    }

    // Remove email from allowed list
    const removed = await allowedEmailManager.removeAllowedEmail(email);
    if (!removed) {
        throw new Error('Rimozione email autorizzata non riuscita.');
    }

    return true;
};

/**
 * Service for updating notes for an allowed email
 * @param {string} email - Email to update
 * @param {string} notes - New notes for the email
 * @returns {Object} - Updated allowed email document
 */
const updateAllowedEmail = async (email, newEmail, notes) => {
    if (!email) {
        throw new Error('Email non specificata.');
    }

    // Initialize DB connection
    const { allowedEmailManager, userManager } = await userDb();

    // Check if email exists in allowed list
    const existingEmail = await allowedEmailManager.getAllowedEmail(email);
    if (!existingEmail) {
        throw new Error('Email autorizzara non trovata.');
    }

    const existingUser = await userManager.getUserByEmail(email);
    if (existingUser) {
        throw new Error('Impossibile modificare email autorizzata o note.');
    }

    // Update allowed email
    const updated = await allowedEmailManager.updateAllowedEmail(email, newEmail, notes);

    if (!updated) {
        throw new Error('Aggiornamento note non riuscito.');
    }

    return updated;
};

/**
 * Service for checking if an email is in the allowed list
 * @param {string} email - Email to check
 * @returns {boolean} - Whether email is in allowed list
 */
const isEmailAllowed = async (email) => {
    if (!email) {
        throw new Error('Email non specificata.');
    }

    // Initialize DB connection
    const { allowedEmailManager } = await userDb();

    // Check if email is in allowed list
    return await allowedEmailManager.isEmailAllowed(email);
};

/**
 * Service for managing admin users
 * @param {string} email - Email of user to promote/demote
 * @param {boolean} isAdmin - Whether to make user admin (true) or remove admin role (false)
 * @returns {Object} - Updated user document
 */
const setUserAdminStatus = async (email, isAdmin) => {
    if (!email) {
        throw new Error('Email non specificata.');
    }

    // Initialize DB connection
    const { userManager } = await userDb();

    // Get user by email
    const user = await userManager.getUserByEmail(email);
    if (!user) {
        throw new Error('User not found');
    }

    // Set user role
    const role = isAdmin ? 'admin' : 'user';

    // Update user
    const updated = await userManager.updateUser(email, { role });
    if (!updated) {
        throw new Error(`Failed to ${isAdmin ? 'promote' : 'demote'} user`);
    }

    // Return updated user (without sensitive information)
    const { passwordHash, sessions, verificationToken, passwordResetToken, revokedTokens, ...safeUserData } = updated;
    return safeUserData;
};

/**
 * Service for retrieving admin users
 * @param {number} limit - Maximum number of records to retrieve
 * @param {number} skip - Number of records to skip (for pagination)
 * @returns {Array} - Array of admin user documents
 */
const getAdminUsers = async (limit = 50, skip = 0) => {
    // Initialize DB connection
    const { userManager } = await userDb();

    // Get all users
    const allUsers = await userManager.listUsers(limit, skip);

    // Filter admin users
    const adminUsers = allUsers.filter(user => user.role === 'admin');

    // Remove sensitive information
    return adminUsers.map(user => {
        const { passwordHash, sessions, verificationToken, passwordResetToken, revokedTokens, ...safeUserData } = user;
        return safeUserData;
    });
};

module.exports = {
    addEmailToAllowedList,
    getAllowedEmails,
    removeEmailFromAllowedList,
    updateAllowedEmail,
    isEmailAllowed,
    setUserAdminStatus,
    getAdminUsers
};