// client/utils/pouchdb-helper.js

/**
 * Creates a proper URL for PouchDB remote connections
 * Converts relative paths to absolute URLs based on current window location
 * 
 * @param {string} dbPath - Database path (can be relative or absolute)
 * @returns {string} Full URL suitable for PouchDB remote connection
 */
export function createPouchDbUrl(dbPath) {
    // If it's already a full URL, return it as is
    if (dbPath.startsWith('http://') || dbPath.startsWith('https://')) {
      return dbPath;
    }
    
    // Make sure path starts with a slash
    const normalizedPath = dbPath.startsWith('/') ? dbPath : `/${dbPath}`;
    
    // Get the current origin (protocol + hostname + port)
    const origin = window.location.origin;
    
    // Combine them into a full URL
    return `${origin}${normalizedPath}`;
  }
  