require('dotenv').config();
/**
 * JWT configuration
 */
const config = {
    // Secret key for signing tokens
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',

    // Token expiration
    expiresIn: Number(process.env.JWT_EXPIRES_IN || 3600),

    // Refresh token expiration
    refreshExpiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN || 86400),

    // Issuer for the JWT
    issuer: process.env.JWT_ISSUER || 'my-pwa-app'
};

module.exports = config;