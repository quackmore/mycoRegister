// pouchdb-integration.js - Example implementation of PouchDB with auth service

class DatabaseService {
    constructor() {
        this.localDB = null;
        this.remoteDB = null;
        this.syncHandler = null;
        this.serverUrl = '/db';
        this.dbName = 'inventory';
        
        // Set up auth state listeners
        this.setupAuthListeners();
    }
    
    setupAuthListeners() {
        // Initialize or reinitialize DB when auth state changes
        authService.addEventListener('auth:authenticated', () => {
            this.initializeRemoteDB();
            this.startSync();
        });
        
        authService.addEventListener('auth:unauthenticated', () => {
            this.stopSync();
        });
        
        authService.addEventListener('auth:token-refreshed', (data) => {
            // When token is refreshed, we need to reinitialize the remote connection
            this.initializeRemoteDB();
            // Restart sync with new credentials if it was active
            if (this.syncHandler) {
                this.stopSync();
                this.startSync();
            }
        });
        
        // Initialize on startup if user is already authenticated
        if (authService.isAuthenticated()) {
            this.initializeRemoteDB();
        }
    }
    
    initializeLocalDB() {
        if (!this.localDB) {
            this.localDB = new PouchDB(this.dbName);
            console.log('Local PouchDB initialized');
        }
        return this.localDB;
    }
    
    initializeRemoteDB() {
        // Get current auth token
        const token = authService.getToken();
        
        if (!token) {
            console.error('Cannot initialize remote DB: No authentication token');
            return null;
        }
        
        // Create or reinitialize remote DB connection with auth headers
        this.remoteDB = new PouchDB(`${this.serverUrl}/${this.dbName}`, {
            skip_setup: true,
            fetch: (url, opts) => {
                // Add authorization header to each request
                opts.headers = opts.headers || {};
                
                // Get fresh token (in case it was refreshed)
                const currentToken = authService.getToken();
                
                if (currentToken) {
                    opts.headers.Authorization = `Bearer ${currentToken}`;
                }
                
                return PouchDB.fetch(url, opts);
            }
        });
        
        console.log('Remote PouchDB connection initialized with auth token');
        return this.remoteDB;
    }
    
    startSync() {
        // Ensure we have both databases initialized
        this.initializeLocalDB();
        
        if (!this.remoteDB) {
            this.initializeRemoteDB();
        }
        
        if (!this.localDB || !this.remoteDB) {
            console.error('Cannot start sync: databases not initialized');
            return;
        }
        
        // Start bidirectional sync
        this.syncHandler = this.localDB.sync(this.remoteDB, {
            live: true,
            retry: true,
            back_off_function: delay => {
                if (delay === 0) return 1000;
                return delay * 1.5;
            }
        }).on('change', info => {
            console.log('PouchDB sync change:', info);
        }).on('paused', () => {
            console.log('PouchDB sync paused');
        }).on('active', () => {
            console.log('PouchDB sync active');
        }).on('denied', info => {
            console.error('PouchDB sync denied:', info);
        }).on('error', err => {
            console.error('PouchDB sync error:', err);
            
            // Check if error is related to authentication
            if (err.status === 401 || err.status === 403) {
                // Try to refresh token
                authService.refreshTokenSilently();
            }
        });
        
        console.log('PouchDB sync started');
    }
    
    stopSync() {
        if (this.syncHandler) {
            this.syncHandler.cancel();
            this.syncHandler = null;
            console.log('PouchDB sync stopped');
        }
    }
    
    async getDatabase() {
        // Return local DB with sync capabilities if authenticated
        this.initializeLocalDB();
        
        if (authService.isAuthenticated() && !this.syncHandler) {
            this.startSync();
        }
        
        return this.localDB;
    }
}

// Create singleton instance
const dbService = new DatabaseService();
console.log('DatabaseService instance created');
// Initialize local DB on startup
// Export for global access
window.dbService = dbService;