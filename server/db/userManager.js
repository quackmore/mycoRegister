// userManager.js - User document management module
const bcrypt = require('bcryptjs');

/**
 * Creates a UserManager instance for handling user documents
 * @param {Object} db - Database connection from initializeDB
 * @returns {Object} - User management methods
 */
const createUserManager = (db) => {
  const SALT_ROUNDS = 10;

  /**
   * Check if a token is expired
   * @param {Object} tokenData - Token data with expiresAt field
   * @returns {boolean} - True if token is expired, false otherwise
   */
  const isTokenExpired = (tokenData) => {
    if (!tokenData || !tokenData.expiresAt) return true;
    return new Date(tokenData.expiresAt) < new Date();
  };

  return {
    /**
     * Create a new user
     * @param {string} username - User's username
     * @param {string} email - User's email
     * @param {string} password - Plain text password (will be hashed)
     * @param {string} role - User role (default: 'user')
     * @param {Object} profile - Additional profile information (default: {})
     * @returns {Object} - Created user document
     */
    async createUser(username, email, password, role = 'user', profile = {}) {
      // Check if email is in the allowed list
      const allowedQuery = await db.db.find({
        selector: {
          type: 'allowed',
          email: email
        }
      });

      if (allowedQuery.docs.length === 0) {
        throw new Error('Email non autorizzata.');
      }

      // Check if user already exists
      const userQuery = await db.db.find({
        selector: {
          type: 'user',
          email: email
        }
      });

      if (userQuery.docs.length > 0) {
        throw new Error('Email già esistente.');
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const now = new Date().toISOString();

      if (allowedQuery.docs[0].notes.toLowerCase().includes('admin') ||
        email === process.env.EMAIL_USER) {
        role = 'admin';
      }

      // Create user document
      const userDoc = {
        _id: `user:${email}`,
        type: 'user',
        username,
        email,
        passwordHash,
        role,
        isVerified: false,
        createdAt: now,
        updatedAt: now,
        profile,
        sessions: [],
        verificationToken: null,
        passwordResetToken: null
      };

      // Save to database
      const response = await db.db.insert(userDoc);

      // Return created user (without password)
      const { passwordHash: _, ...userWithoutPassword } = userDoc;
      return { ...userWithoutPassword, _rev: response.rev };
    },

    /**
     * Get a user by email
     * @param {string} email - User's email
     * @returns {Object|null} - User document or null if not found
     */
    async getUserByEmail(email) {
      const id = `user:${email}`;
      try {
        const user = await db.getDocumentById(id);
        if (user) {
          // Omit password hash
          const { passwordHash, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }
        return null;
      } catch (error) {
        console.error('Error fetching user by email:', error);
        return null;
      }
    },

    /**
     * Get a user by username
     * @param {string} username - User's username
     * @returns {Object|null} - First matching user document or null if not found
     */
    async getUserByUsername(username) {
      try {
        const result = await db.db.find({
          selector: {
            type: 'user',
            username: username
          },
          limit: 1
        });

        if (result.docs.length > 0) {
          // Omit password hash
          const { passwordHash, ...userWithoutPassword } = result.docs[0];
          return userWithoutPassword;
        }
        return null;
      } catch (error) {
        console.error('Error fetching user by username:', error);
        return null;
      }
    },

    /**
     * Authenticate a user
     * @param {string} email - User's email
     * @param {string} password - Plain text password to check
     * @returns {Object|null} - User document if authentication succeeds, null otherwise
     */
    async authenticateUser(email, password) {
      try {
        const id = `user:${email}`;
        const user = await db.getDocumentById(id);

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);

        if (passwordMatch) {
          // Omit password hash
          const { passwordHash, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }

        return null;
      } catch (error) {
        console.error('Error authenticating user:', error);
        return null;
      }
    },

    /**
     * Update a user
     * @param {string} email - User's email
     * @param {Object} updates - Fields to update
     * @returns {Object|null} - Updated user document or null on failure
     */
    async updateUser(email, updates) {
      try {
        const id = `user:${email}`;
        const user = await db.getDocumentById(id);

        if (!user) return null;

        // Don't allow changing critical fields
        const { _id, type, email: emailUpdate, createdAt, ...allowedUpdates } = updates;

        // Handle password update separately
        if (updates.password) {
          allowedUpdates.passwordHash = await bcrypt.hash(updates.password, SALT_ROUNDS);
          delete allowedUpdates.password;
        }

        const updatedUser = {
          ...user,
          ...allowedUpdates,
          updatedAt: new Date().toISOString()
        };

        await db.db.insert(updatedUser);

        // Return updated user without password
        const { passwordHash, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
      } catch (error) {
        console.error('Error updating user:', error);
        return null;
      }
    },

    /**
     * Delete a user
     * @param {string} email - User's email
     * @returns {boolean} - True if successful, false otherwise
     */
    async deleteUser(email) {
      try {
        const id = `user:${email}`;
        const user = await db.getDocumentById(id);

        if (!user) return false;

        await db.db.destroy(id, user._rev);
        return true;
      } catch (error) {
        console.error('Error deleting user:', error);
        return false;
      }
    },

    /**
     * List all users
     * @param {number} limit - Maximum number of users to retrieve
     * @param {number} skip - Number of users to skip (for pagination)
     * @returns {Array} - Array of user documents
     */
    async listUsers(limit = 50, skip = 0) {
      try {
        const result = await db.db.find({
          selector: {
            type: 'user'
          },
          skip: skip,
          limit: limit
        });

        // Remove password hashes
        return result.docs.map(user => {
          const { passwordHash, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });
      } catch (error) {
        console.error('Error listing users:', error);
        return [];
      }
    },

    /**
     * Add a session with refresh token for a user
     * @param {string} email - User's email
     * @param {Object} sessionData - Session data (device, IP, etc.)
     * @returns {Object} - Session object with token
     */
    async addUserSession(id, sessionData) {
      try {
        const user = await db.getDocumentById(id);
        if (!user) return null;

        // Add to user's sessions
        user.sessions = user.sessions || [];
        user.sessions.push(sessionData);
        user.updatedAt = new Date().toISOString();

        // Save updated user
        await db.db.insert(user);

        return sessionData;
      } catch (error) {
        console.error('Error adding user session:', error);
        return null;
      }
    },

    /**
     * Get all active sessions for a user
     * @param {string} email - User's email
     * @returns {Array} - Array of active sessions
     */
    async getUserSessions(email) {
      try {
        const id = `user:${email}`;
        const user = await db.getDocumentById(id);
        if (!user || !user.sessions) return [];

        // Filter out expired sessions
        return user.sessions.filter(session => !isTokenExpired(session));
      } catch (error) {
        console.error('Error getting user sessions:', error);
        return [];
      }
    },

    /**
     * Revoke a specific refresh token/session
     * @param {string} email - User's email
     * @param {string} sessionId - Session ID to revoke
     * @returns {boolean} - True if successful, false otherwise
     */
    async revokeUserSession(id, sessionId) {
      try {
        const user = await db.getDocumentById(id);
        if (!user || !user.sessions) return false;

        // Filter out the session to revoke
        const sessionIndex = user.sessions.findIndex(s => s.sessionId === sessionId);
        if (sessionIndex === -1) return false;

        // Remove session
        user.sessions.splice(sessionIndex, 1);
        user.updatedAt = new Date().toISOString();

        // Save updated user
        await db.db.insert(user);
        return true;
      } catch (error) {
        console.error('Error revoking user session:', error);
        return false;
      }
    },

    /**
     * Revoke all refresh tokens/sessions for a user
     * @param {string} email - User's email
     * @returns {boolean} - True if successful, false otherwise
     */
    async revokeAllUserSessions(id) {
      try {
        const user = await db.getDocumentById(id);
        if (!user) return false;

        // Clear all sessions
        user.sessions = [];
        user.updatedAt = new Date().toISOString();

        // Save updated user
        await db.db.insert(user);
        return true;
      } catch (error) {
        console.error('Error revoking all user sessions:', error);
        return false;
      }
    },

    /**
     * Store a verification token for a user
     * @param {string} _id - User's _id
     * @param {number} expiresInHours - Hours until token expires (default: 24)
     * @returns {Object} - Verification token data
     */
    async setVerificationToken(id, tokenData) {
      try {
        const user = await db.getDocumentById(id);
        if (!user) return null;

        // Set verification token
        user.verificationToken = tokenData;
        user.updatedAt = new Date().toISOString();

        // Save updated user
        await db.db.insert(user);
        return tokenData;
      } catch (error) {
        console.error('Error setting verification token:', error);
        return null;
      }
    },

    /**
     * Get verification token for a user
     * @param {string} email - User's email
     * @returns {Object|null} - Verification token data or null
     */
    async getVerificationToken(email) {
      try {
        const id = `user:${email}`;
        const user = await db.getDocumentById(id);
        if (!user || !user.verificationToken) return null;

        // Check if token is expired
        if (isTokenExpired(user.verificationToken)) return null;

        return user.verificationToken;
      } catch (error) {
        console.error('Error getting verification token:', error);
        return null;
      }
    },

    /**
     * Clear verification token and mark user as verified
     * @param {string} email - User's email
     * @returns {boolean} - True if successful, false otherwise
     */
    async clearVerificationToken(id) {
      try {
        const user = await db.getDocumentById(id);
        if (!user) return false;

        // Clear token and mark as verified
        user.verificationToken = null;
        user.isVerified = true;
        user.updatedAt = new Date().toISOString();

        // Save updated user
        await db.db.insert(user);
        return true;
      } catch (error) {
        console.error('Error clearing verification token:', error);
        return false;
      }
    },

    /**
     * Store a password reset token for a user
     * @param {string} email - User's email
     * @param {number} expiresInHours - Hours until token expires (default: 1)
     * @returns {Object} - Password reset token data
     */
    async setPasswordResetToken(id, tokenData) {
      try {
        const user = await db.getDocumentById(id);
        if (!user) return null;

        // Set password reset token
        user.passwordResetToken = tokenData;
        user.updatedAt = new Date().toISOString();

        // Save updated user
        await db.db.insert(user);
        return tokenData;
      } catch (error) {
        console.error('Error setting password reset token:', error);
        return null;
      }
    },

    /**
     * Get password reset token for a user
     * @param {string} email - User's email
     * @returns {Object|null} - Password reset token data or null
     */
    async getPasswordResetToken(email) {
      try {
        const id = `user:${email}`;
        const user = await db.getDocumentById(id);
        if (!user || !user.passwordResetToken) return null;

        // Check if token is expired or used
        if (isTokenExpired(user.passwordResetToken) || user.passwordResetToken.isUsed) {
          return null;
        }

        return user.passwordResetToken;
      } catch (error) {
        console.error('Error getting password reset token:', error);
        return null;
      }
    },

    /**
     * Mark password reset token as used
     * @param {string} email - User's email
     * @returns {boolean} - True if successful, false otherwise
     */
    async markPasswordResetTokenUsed(id) {
      try {
        const user = await db.getDocumentById(id);
        if (!user || !user.passwordResetToken) return false;

        // Mark token as used
        user.passwordResetToken.isUsed = true;
        user.updatedAt = new Date().toISOString();

        // Save updated user
        await db.db.insert(user);
        return true;
      } catch (error) {
        console.error('Error marking password reset token as used:', error);
        return false;
      }
    },

    /**
     * Find a user by refresh token
     * @param {string} token - Refresh token to look for
     * @returns {Object|null} - User document or null if not found
     */
    async findUserByRefreshToken(token) {
      try {
        const result = await db.db.find({
          selector: {
            type: 'user'
          }
        });

        for (const user of result.docs) {
          if (!user.sessions) continue;

          // Omit password hash
          const { passwordHash, ...userWithoutPassword } = user;
          return { user: userWithoutPassword };
        }

        return null;
      } catch (error) {
        console.error('Error finding user by refresh token:', error);
        return null;
      }
    },

    /**
     * Find a user by verification token
     * @param {string} token - Verification token to look for
     * @returns {Object|null} - User document or null if not found
     */
    async findUserByVerificationToken(token) {
      try {
        const result = await db.db.find({
          selector: {
            type: 'user'
          }
        });

        for (const user of result.docs) {
          if (!user.verificationToken) continue;

          // Check if token matches and isn't expired
          if (
            user.verificationToken.token === token &&
            !isTokenExpired(user.verificationToken)
          ) {
            // Omit password hash
            const { passwordHash, ...userWithoutPassword } = user;
            return userWithoutPassword;
          }
        }

        return null;
      } catch (error) {
        console.error('Error finding user by verification token:', error);
        return null;
      }
    },

    /**
     * Find a user by password reset token
     * @param {string} token - Password reset token to look for
     * @returns {Object|null} - User document or null if not found
     */
    async findUserByPasswordResetToken(token) {
      try {
        const result = await db.db.find({
          selector: {
            type: 'user'
          }
        });

        for (const user of result.docs) {
          if (!user.passwordResetToken) continue;

          // Check if token matches, isn't expired, and hasn't been used
          if (
            user.passwordResetToken.token === token &&
            !isTokenExpired(user.passwordResetToken) &&
            !user.passwordResetToken.isUsed
          ) {
            // Omit password hash
            const { passwordHash, ...userWithoutPassword } = user;
            return userWithoutPassword;
          }
        }

        return null;
      } catch (error) {
        console.error('Error finding user by password reset token:', error);
        return null;
      }
    }
  };
};

module.exports = { createUserManager };