const { initializeDB } = require('./db');
const { createUserManager } = require('./userManager');
const { createAllowedEmailManager } = require('./allowedEmailManager');

const admin = process.env.COUCHDB_ADMIN;
const password = process.env.COUCHDB_PASSWORD;
const adminEmail = process.env.EMAIL_USER;

const couchDbUrl = `http://${admin}:${password}@localhost:5984`;

/**
 * Schedule a function to run at a specific time every day
 * @param {Function} fn - The function to run
 * @param {number} hour - Hour of the day (0-23)
 * @param {number} minute - Minute of the hour (0-59)
 * @returns {Object} - Timer object with stop function
 */
const scheduleDaily = (fn, hour = 2, minute = 0) => {
  const getNextRunTime = () => {
    const now = new Date();
    const nextRun = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0
    );

    // If the scheduled time has already passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  };

  let nextRun = getNextRunTime();
  let timeoutId;

  const scheduleNext = () => {
    // Calculate milliseconds until next run
    const now = new Date();
    const msUntilNextRun = nextRun - now;

    // Schedule the next run
    timeoutId = setTimeout(() => {
      // Run the function
      fn();

      // Schedule the next run
      nextRun = getNextRunTime();
      scheduleNext();
    }, msUntilNextRun);
  };

  // Start the scheduling
  scheduleNext();

  // Return an object that allows stopping the scheduled task
  return {
    stop: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };
};

/**
 * Clean up expired tokens for all users
 * @param {Object} db - Database connection
 * @returns {Promise<Object>} - Results of the cleanup operation
 */
const cleanupExpiredTokens = async (db) => {
  const now = Date.now();
  const results = {
    usersProcessed: 0,
    sessionsRemoved: 0,
    verificationTokensRemoved: 0,
    passwordResetTokensRemoved: 0
  };

  try {
    // Query all user documents
    const response = await db.db.find({
      selector: {
        type: "user"
      },
      limit: 1000 // Adjust based on expected number of users
    });

    const users = response.docs || [];

    // Process each user
    for (const user of users) {
      let hasUpdates = false;

      // Clean up sessions with expired tokens
      if (Array.isArray(user.sessions) && user.sessions.length > 0) {
        const originalLength = user.sessions.length;
        user.sessions = user.sessions.filter(session => {
          // Keep sessions that don't have an expiration or haven't expired yet
          return !session.expiresAt || new Date(session.expiresAt).getTime() > now;
        });

        if (user.sessions.length < originalLength) {
          results.sessionsRemoved += (originalLength - user.sessions.length);
          hasUpdates = true;
        }
      }

      // Clean up verification token if expired
      if (user.verificationToken && user.verificationToken.expiresAt && new Date(user.verificationToken.expiresAt).getTime() < now) {
        user.verificationToken = null;
        results.verificationTokensRemoved++;
        hasUpdates = true;
      }

      // Clean up password reset token if expired
      if (user.passwordResetToken && user.passwordResetToken.expiresAt && new Date(user.passwordResetToken.expiresAt).getTime() < now) {
        user.passwordResetToken = null;
        results.passwordResetTokensRemoved++;
        hasUpdates = true;
      }

      // Update user document if changes were made
      if (hasUpdates) {
        user.updatedAt = new Date().toISOString();
        await db.db.insert(user);
        results.usersProcessed++;
      }
    }

    console.log(`Token cleanup completed at ${new Date().toISOString()}:`, results);
    return results;
  } catch (error) {
    console.error('Error during token cleanup:', error);
    throw error;
  }
};

/**
 * Start the daily token cleanup process
 * @param {Object} db - Database connection
 * @param {Object} options - Cleanup options
 * @param {number} options.hour - Hour of the day to run cleanup (0-23)
 * @param {number} options.minute - Minute of the hour to run cleanup (0-59)
 * @returns {Object} - Timer controller with stop function
 */
const startTokenCleanup = (db, options = {}) => {
  const { hour = 2, minute = 0 } = options; // Default to 2:00 AM

  console.log(`Scheduling token cleanup to run daily at ${hour}:${minute < 10 ? '0' + minute : minute}`);

  // Schedule the cleanup to run daily
  const timer = scheduleDaily(async () => {
    try {
      await cleanupExpiredTokens(db);
    } catch (error) {
      console.error('Failed to clean up expired tokens:', error);
    }
  }, hour, minute);

  return timer;
};

// db

var db = null;
var userManager = null;
var allowedEmailManager = null;

/**
 * Initialize the database and create managers for users and allowed emails
 * @param {string} couchDbUrl - CouchDB connection URL
 * @returns {Object} - Object containing database connection and managers
 */
const initDb = async () => {
  // Initialize database
  db = await initializeDB(couchDbUrl);

  // Create managers
  userManager = createUserManager(db);
  allowedEmailManager = createAllowedEmailManager(db);

  // Create allowed email for admin
  // Check if email already exists in allowed list
  const existingEmail = await allowedEmailManager.getAllowedEmail(adminEmail);
  if (!existingEmail) {
    // Add email to allowed list
    const result = await allowedEmailManager.addAllowedEmail(adminEmail, 'admin');
  }

  // Start the token cleanup process
  startTokenCleanup(db, { hour: 3, minute: 30 });
};

/**
 * Initialize the database and create managers for users and allowed emails
 * @param {string} couchDbUrl - CouchDB connection URL
 * @returns {Object} - Object containing database connection and managers
 */
const userDb = async () => {
  if (!db) {
    await initDb();
  }
  return {
    db,
    userManager,
    allowedEmailManager
  };
};

module.exports = {
  initDb,
  userDb,
  startTokenCleanup,
  cleanupExpiredTokens // Exported for testing or manual runs
};