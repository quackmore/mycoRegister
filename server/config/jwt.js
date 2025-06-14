require('dotenv').config();
/**
 * JWT configuration
 */
if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN || !process.env.JWT_REFRESH_EXPIRES_IN) {
    console.error('JWT_SECRET, JWT_EXPIRES_IN, and JWT_REFRESH_EXPIRES_IN must be set in .env file.');
}

const config = {
    // Secret key for signing tokens
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',

    // Token expiration
    expiresIn: Number(process.env.JWT_EXPIRES_IN || 3600),

    // Refresh token expiration
    refreshExpiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN || 86400),

    // Token expirations for emmail verification and password reset
    expiresIn1H: Number(process.env.JWT_EXPIRES_IN_1H || 3600),
    expiresIn24H: Number(process.env.JWT_EXPIRES_IN_24H || 86400),

    // Issuer for the JWT
    issuer: process.env.JWT_ISSUER || 'mycoRegister'
};

module.exports = config;