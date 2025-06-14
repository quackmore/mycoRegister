/**
 * Express configuration
 */
const config = {
  // Node environment
  env: process.env.NODE_ENV || 'development',

  // Server port
  port: process.env.PORT || 3000,

  // API rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  }
};

module.exports = config;