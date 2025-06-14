const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate a JWT token
 * @param {Object} payload - Data to be included in the token
 * @param {string} expiresIn - Token expiration time
 * @returns {string} - Generated JWT token
 */
const generateToken = (payload, expiresIn = config.jwt.expiresIn) => {
    payload.exp = Math.floor(Date.now() / 1000) + expiresIn;
    return jwt.sign(payload, config.jwt.secret, {
        algorithm: 'HS256',
        issuer: config.jwt.issuer
    });
};

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, config.jwt.secret);
    } catch (error) {
        throw error;
    }
};

module.exports = {
    generateToken,
    verifyToken
};