const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./config');
const { errorMiddleware } = require('./middleware');
const routes = require('./routes');
require('dotenv').config();
// Initialize email transporter
const { initializeEmailTransporter } = require('./utils/email.utils');
const { initDb } = require('./db/userDb');

// Check for env variables
const envVars = [
  'PORT',
  'NODE_ENV',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'JWT_EXPIRES_IN_1H',
  'JWT_EXPIRES_IN_24H',
  'JWT_ISSUER',
  'COUCHDB_USERNAME',
  'COUCHDB_DATABASE',
  'APP_NAME',
  'BASE_URL',
  'EMAIL_USER',
  'EMAIL_PASSWORD'
];
let missingVars = false;
envVars.forEach((el) => {
  if (!process.env[el]) {
    missingVars = true;
    console.log(`"${el}" not present in .env file`);
  }
});
if (missingVars) process.exit(1);



// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Apply security middleware
app.use(helmet());

// Logging middleware early to capture all requests
app.use(morgan('dev'));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Parse cookies
app.use(cookieParser());

// Compress responses
app.use(compression());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Register API routes
app.use('/api', routes);

// Serve the PWA for any other route
app.get('*path', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Apply error handling middleware
app.use(errorMiddleware);

// init db
initDb();

// Email transport
initializeEmailTransporter();
console.log('Email service initialized');


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;