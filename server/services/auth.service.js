const jwt = require('jsonwebtoken');
const config = require('../config');
const { generateToken } = require('../utils/jwt.utils');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const USER_NAME = process.env.USER_NAME;
const PASSWORD_HASH = process.env.USER_PASSWORD;
const COUCHDB_USERNAME = process.env.COUCHDB_USERNAME;

// Store for refresh tokens (in a real app, this would be in a database)
var refreshTokenStored = null;

/**
 * Service for user login
 * @param {string} user - User user
 * @param {string} password - User password
 * @returns {Object} - User data and tokens
 */
const loginUser = async (user, password) => {

    if (!user || !password) {
        throw new Error('Invalid user or password');
    }

    const isPasswordValid = await bcrypt.compare(password, PASSWORD_HASH);

    if (user !== USER_NAME || !isPasswordValid) {
        throw new Error('Invalid user or password');
    }

    // Generate tokens
    const token = generateToken({ sub: COUCHDB_USERNAME, _couchdb: { roles: ["user"] } }, config.jwt.expiresIn);
    const refreshToken = generateToken({ user: user }, config.jwt.refreshExpiresIn);
    refreshTokenStored = refreshToken;
    return {
        user,
        token,
        refreshToken
    };
};

/**
 * Service for refreshing tokens
 * @param {string} refreshToken - Refresh token
 * @returns {Object} - New access token
 */
const refreshToken = async (refreshToken) => {
    if (refreshTokenStored != refreshToken) {
        throw new Error('Invalid refresh token');
    }

    try {
        // Verify the refresh token
        const decoded = jwt.verify(refreshToken, config.jwt.secret);

        if (decoded.user !== USER_NAME) {
            throw new Error('User not found');
        }

        // Generate a new access token
        const token = generateToken({ sub: COUCHDB_USERNAME, _couchdb: { roles: ["user"] } }, config.jwt.expiresIn);

        return { token };
    } catch (error) {
        // Remove invalid refresh token
        refreshTokenStored = null;
        throw new Error('Invalid refresh token');
    }
};

/**
 * Service for user logout
 * @param {string} userId - User ID
 */
const logoutUser = async (userId) => {
    // In a real app, you would invalidate tokens for this user in the database
    // For this example, we don't have a way to identify which tokens belong to the user
    refreshTokenStored = null;
    return true;
};

/**
 * Service to get user by ID
 * @param {string} userId - User ID
 * @returns {Object} - User data
 */
const getUserById = async (user) => {

    if (!user || user !== USER_NAME) {
        throw new Error('User not found');
    }

    return user;
};

module.exports = {
    loginUser,
    refreshToken,
    logoutUser,
    getUserById
};