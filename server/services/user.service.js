const { userDb } = require('../db/userDb');

/**
 * Delete user account
 * @param {Object} user - User object from token
 * @param {string} password - Password confirmation
 * @returns {boolean} - Success indicator
 */
const deleteUserAccount = async (username, password) => {
    // Initialize database connection
    const { userManager } = await userDb();

    // Get full user record
    const userRecord = await userManager.getUserByUsername(username);

    if (!userRecord) {
        throw new Error('Utente non trovato.');
    }

    // Verify password
    const isAuthenticated = await userManager.authenticateUser(userRecord.email, password);

    if (!isAuthenticated) {
        throw new Error('Password non valida.');
    }

    // Delete user
    const deleted = await userManager.deleteUser(userRecord.email);

    if (!deleted) {
        throw new Error("Errore durante la rimozione dell'account");
    }

    return true;
};

module.exports = {
    deleteUserAccount
};