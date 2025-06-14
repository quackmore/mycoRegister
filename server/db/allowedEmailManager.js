// allowedEmailManager.js - Allowed email management module

/**
 * Creates an AllowedEmailManager instance for handling allowed email documents
 * @param {Object} db - Database connection from initializeDB
 * @returns {Object} - Allowed email management methods
 */
const createAllowedEmailManager = (db) => {
  return {
    /**
     * Add an email to the allowed list
     * @param {string} email - Email to allow
     * @param {string} notes - Optional notes about this allowed email
     * @returns {Object} - Created allowed email document
     */
    async addAllowedEmail(email, notes = '') {
      // Check if email is already in the allowed list
      try {
        const existingDoc = await db.getDocumentById(`allowed:${email}`);
        if (existingDoc) {
          throw new Error('Email autorizzata già presente.');
        }
      } catch (error) {
        // 404 is expected if doc doesn't exist
        if (error.statusCode !== 404 && error.message !== 'Email autorizzata già presente.') {
          throw error;
        }
      }

      const now = new Date().toISOString();

      // Create allowed email document
      const allowedDoc = {
        _id: `allowed:${email}`,
        type: 'allowed',
        email,
        createdAt: now,
        updatedAt: now,
        notes
      };

      // Save to database
      const response = await db.db.insert(allowedDoc);

      return { ...allowedDoc, _rev: response.rev };
    },

    /**
     * Check if an email is in the allowed list
     * @param {string} email - Email to check
     * @returns {boolean} - True if email is allowed, false otherwise
     */
    async isEmailAllowed(email) {
      try {
        const doc = await db.getDocumentById(`allowed:${email}`);
        return !!doc;
      } catch (error) {
        if (error.statusCode === 404) {
          return false;
        }
        throw error;
      }
    },

    /**
     * Get an allowed email document
     * @param {string} email - Email to get
     * @returns {Object|null} - Allowed email document or null if not found
     */
    async getAllowedEmail(email) {
      try {
        return await db.getDocumentById(`allowed:${email}`);
      } catch (error) {
        if (error.statusCode === 404) {
          return null;
        }
        throw error;
      }
    },

    /**
     * Update an allowed email's notes
     * @param {string} email - Email to update
     * @param {string} notes - New notes
     * @returns {Object|null} - Updated allowed email document or null on failure
     */
    async updateAllowedEmail(email, newEmail, notes) {
      try {
        const doc = await db.getDocumentById(`allowed:${email}`);
        if (!doc) return null;

        const now = new Date().toISOString();

        if (email !== newEmail) {
          const allowedDoc = {
            _id: `allowed:${newEmail}`,
            type: 'allowed',
            email: newEmail,
            createdAt: now,
            updatedAt: now,
            notes
          };
          await db.db.insert(allowedDoc);
          await db.db.destroy(doc._id, doc._rev);
          return allowedDoc;
        }

        const updatedDoc = {
          ...doc,
          notes,
          updatedAt: now
        };

        await db.db.insert(updatedDoc);
        return updatedDoc;
      } catch (error) {
        console.error('Error updating allowed email notes:', error);
        return null;
      }
    },

    /**
     * Remove an email from the allowed list
     * @param {string} email - Email to remove
     * @returns {boolean} - True if successful, false otherwise
     */
    async removeAllowedEmail(email) {
      try {
        const doc = await db.getDocumentById(`allowed:${email}`);
        if (!doc) return false;

        await db.db.destroy(doc._id, doc._rev);
        return true;
      } catch (error) {
        console.error('Error removing allowed email:', error);
        return false;
      }
    },

    /**
     * List all allowed emails
     * @param {number} limit - Maximum number of documents to retrieve
     * @param {number} skip - Number of documents to skip (for pagination)
     * @returns {Array} - Array of allowed email documents
     */
    async listAllowedEmails(limit = 50, skip = 0) {
      try {
        const result = await db.db.find({
          selector: {
            type: 'allowed'
          },
          skip: skip,
          limit: limit
        });

        return result.docs;
      } catch (error) {
        console.error('Error listing allowed emails:', error);
        return [];
      }
    }
  };
};

module.exports = { createAllowedEmailManager };