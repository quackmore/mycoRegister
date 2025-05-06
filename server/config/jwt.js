/**
 * JWT configuration
 */
const config = {
    // Secret key for signing tokens
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',

    // Token expiration
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',

    // Refresh token expiration
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

    // Issuer for the JWT
    issuer: process.env.JWT_ISSUER || 'my-pwa-app'
};

module.exports = config;