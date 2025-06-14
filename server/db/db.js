// db.js - Database connection module
const nano = require('nano');

/**
 * Initializes the CouchDB connection and ensures necessary databases exist
 * @param {string} url - CouchDB connection URL (e.g. 'http://username:password@localhost:5984')
 * @returns {Object} - Object containing database connections and utility functions
 */
const initializeDB = async (url) => {
  // Connect to CouchDB
  const connection = nano(url);

  // Database name
  const DB_NAME = 'user_management';

  // Check if our database exists, create it if not
  const dbList = await connection.db.list();
  if (!dbList.includes(DB_NAME)) {
    await connection.db.create(DB_NAME);
    console.log(`Database '${DB_NAME}' created`);
  }

  // Connect to our database
  const db = connection.use(DB_NAME);

  // Create indexes for common queries
  await createIndexes(db);

  return {
    connection,
    db,
    async getDocumentById(id) {
      try {
        return await db.get(id);
      } catch (error) {
        if (error.statusCode === 404) {
          return null;
        }
        throw error;
      }
    }
  };
};

/**
 * Creates necessary indexes in the database
 * @param {Object} db - Database connection
 */
const createIndexes = async (db) => {
  // Index for querying by type
  await db.createIndex({
    index: { fields: ['type'] },
    name: 'type-index'
  }).catch(err => {
    // Ignore if index already exists
    if (err.error !== 'index_exists') {
      console.error('Error creating type index:', err);
    }
  });

  // Index for email fields
  await db.createIndex({
    index: { fields: ['email'] },
    name: 'email-index'
  }).catch(err => {
    if (err.error !== 'index_exists') {
      console.error('Error creating email index:', err);
    }
  });

  // Index for username field
  await db.createIndex({
    index: { fields: ['username'] },
    name: 'username-index'
  }).catch(err => {
    if (err.error !== 'index_exists') {
      console.error('Error creating username index:', err);
    }
  });
  console.log(`Database indexes created`);
};

module.exports = { initializeDB };