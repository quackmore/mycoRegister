const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config');
const { errorMiddleware } = require('./middleware');
const routes = require('./routes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Apply security middleware
app.use(helmet());

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Parse cookies
app.use(cookieParser());

// Compress responses
app.use(compression());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Register API routes
app.use('/api', routes);

// Serve the PWA for any other route
app.get('*path', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Apply error handling middleware
app.use(errorMiddleware);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;