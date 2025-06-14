// pouchdb-integration.js - Implementation of PouchDB with auth service and connection state management
// import PouchDB from 'pouchdb';
import fungiSampleModel from '../models/fungiSample.js';
import authEvents from './auth/auth.events.js';
import authService from './auth/auth.service.js';
import connectionService from './connection.js';

class DatabaseService extends EventTarget {
    constructor() {
        super();
        this.localDB = null;
        this.remoteDB = null;
        this.syncHandler = null;
        this.serverUrl = '/db';
        this.localDbName = 'inventory_local';
        this.remoteDbName = null;
        this.isOnline = connectionService.online();
        this.syncState = 'inactive'; // inactive, active, change, paused, error, complete
        this.syncDebounceTimeout = null;
        this.syncDebounceDelay = 300; // ms - prevents rapid state changes
        this.manuallyStoppedSync = false; // Flag to track if sync was manually stopped
        this.isRemoteDbInitialized = false;

        // Set up auth state listeners
        this.setupAuthListeners();

        // Set up connection state listeners
        this.setupConnectionListeners();
    }

    async setupAuthListeners() {
        // Initialize on startup if user is already authenticated
        if (authService.isSyncOnline() && connectionService.online()) {
            await this.initializeRemoteDB();
            if (this.isOnline && this.isRemoteDbInitialized) {
                await this.startSync();
            }
        }
        // Initialize or reinitialize DB when auth state changes
        authEvents.on(authEvents.eventTypes.SYNC_ONLINE, async () => {
            // Initialize remote DB with the fetched name
            await this.initializeRemoteDB();

            // Only start sync if online and remote DB is properly initialized
            if (this.isOnline && this.isRemoteDbInitialized) {
                await this.startSync();
            }
        });

        authEvents.on(authEvents.eventTypes.SYNC_OFFLINE, async () => {
            this.stopSync();
            this.isRemoteDbInitialized = false;
        });

        authEvents.on(authEvents.eventTypes.UNAUTHENTICATED, async () => {
            this.stopSync();
            this.remoteDbName = null;
            this.isRemoteDbInitialized = false;
        });

        authEvents.on(authEvents.eventTypes.REFRESH_SUCCESS, async () => {
            if (authService.isSyncOnline()) {
                // When token is refreshed, we need to reinitialize the remote connection
                await this.initializeRemoteDB();
                // Restart sync with new credentials if it was active and we're online
                if (this.isOnline) {
                    if (this.syncHandler) {
                        this.stopSync();
                        await this.startSync();
                    } else {
                        await this.startSync();

                    }
                }
            }
        });
    }

    async setupConnectionListeners() {
        if (connectionService.online()) {
            this.isOnline = true;

            // If authenticated, start sync when we go online
            if (authService.isAuthenticated() && authService.isSyncOnline()) {
                // Initialize remote DB if needed
                if (!this.isRemoteDbInitialized) {
                    await this.initializeRemoteDB();
                }

                // Only start sync if remote DB is properly initialized
                if (this.isRemoteDbInitialized) {
                    await this.startSync();
                }
            }
        }

        // Handle online state
        connectionService.on('online', async () => {
            console.log('Connection is now online');
            this.isOnline = true;

            // If authenticated, start sync when we go online
            if (authService.isAuthenticated() && authService.isSyncOnline()) {
                // Initialize remote DB if needed
                if (!this.isRemoteDbInitialized) {
                    await this.initializeRemoteDB();
                }

                // Only start sync if remote DB is properly initialized
                if (this.isRemoteDbInitialized) {
                    await this.startSync();
                }
            }
        });

        // Handle offline state
        connectionService.on('offline', () => {
            console.log('Connection is now offline');
            this.isOnline = false;

            // Mark that we're stopping sync due to connection loss, not user action
            this.manuallyStoppedSync = false;

            // Stop sync when we go offline - we'll continue using local DB
            this.stopSync();

            // Set state to a special "offline" state rather than "inactive"
            this.setSyncState('offline', { reason: 'connection_lost' });
        });
    }

    initializeLocalDB() {
        if (!this.localDB) {
            this.localDB = new PouchDB(this.localDbName);
            console.log(`Local PouchDB initialized with name: ${this.localDbName}`);
            this.localDB.createIndex({
                index: { fields: fungiSampleModel.indexFields }
            });
            console.log('Database indexes created');
        }
        return this.localDB;
    }

    async fetchRemoteDbName() {
        try {
            // Only attempt to fetch if we're online
            if (authService.isAuthenticated()) {
                // Get remote DB name from auth service
                this.remoteDbName = (await authService.getSessionInfo()).remoteDbName;
                console.log(`Fetched remote DB name: ${this.remoteDbName}`);
                return this.remoteDbName;
            }
            return null;
        } catch (error) {
            console.error('Error fetching remote DB name:', error);
        }
    }

    async initializeRemoteDB() {
        // Get current auth token
        const token = await authService.getToken();

        if (!token) {
            console.error('Cannot initialize remote DB: No authentication token');
            this.isRemoteDbInitialized = false;
            return null;
        }

        // Make sure we have a remote DB name
        if (!this.remoteDbName) {
            await this.fetchRemoteDbName();
            if (!this.remoteDbName) {
                console.error('Cannot initialize remote DB: No remote database name available');
                this.isRemoteDbInitialized = false;
                return null;
            }
        }

        // Store the remote DB name for offline use
        // localStorage.setItem('remoteDbName', this.remoteDbName);

        // Create or reinitialize remote DB connection with auth headers
        this.remoteDB = new PouchDB(`${window.location.origin}${this.serverUrl}/${this.remoteDbName}`, {
            skip_setup: true,
            fetch: (url, opts) => {
                // Add authorization header to each request
                if (opts.headers instanceof Headers) {
                    opts.headers.set('Authorization', `Bearer ${token}`);
                } else {
                    opts.headers = opts.headers || {};
                    opts.headers['Authorization'] = `Bearer ${token}`;
                }
                return fetch(url, opts);
            }
        });

        console.log(`Remote PouchDB connection initialized with auth token and DB name: ${this.remoteDbName}`);
        this.isRemoteDbInitialized = true;
        return this.remoteDB;
    }

    // Set sync state with debouncing to prevent rapid UI changes
    setSyncState(newState, detail = {}) {
        clearTimeout(this.syncDebounceTimeout);

        // If it's an important state (like error, offline), update immediately
        // added 'change' state to show sync progress
        if (newState === 'error' || newState === 'offline' || newState === 'change') {
            this._updateSyncState(newState, detail);
            return;
        }

        // Otherwise debounce to prevent flickering
        this.syncDebounceTimeout = setTimeout(() => {
            this._updateSyncState(newState, detail);
        }, this.syncDebounceDelay);
    }

    _updateSyncState(newState, detail = {}) {
        // Only dispatch event if state actually changed
        if (this.syncState !== newState) {
            const oldState = this.syncState;
            this.syncState = newState;

            // Dispatch event with relevant details
            const eventDetail = {
                oldState,
                newState,
                timestamp: Date.now(),
                ...detail
            };

            console.log(`Sync state changed: ${oldState} -> ${newState}`, eventDetail);
            this.dispatchEvent(new CustomEvent('sync:state-changed', {
                detail: eventDetail
            }));

            // Also dispatch specific events for convenience
            this.dispatchEvent(new CustomEvent(`sync:${newState}`, {
                detail: eventDetail
            }));
        }
    }

    async startSync() {
        // Don't start sync if offline
        if (!this.isOnline) {
            console.log('Cannot start sync: device is offline');
            return;
        }

        // Don't start a new sync if one is already running
        if (this.syncHandler) {
            console.log('Sync already in progress');
            return;
        }

        // Ensure we have both databases initialized
        this.initializeLocalDB();

        // Check if remote DB is initialized, if not try to initialize it
        if (!this.isRemoteDbInitialized) {
            await this.initializeRemoteDB();
        }

        // If we still don't have a properly initialized remote DB, we can't sync
        if (!this.isRemoteDbInitialized) {
            console.error('Cannot start sync: remote database not initialized');
            return;
        }

        // Reset manual stop flag when starting new sync
        this.manuallyStoppedSync = false;

        // Set initial state as we begin sync
        this.setSyncState('active', { message: 'Starting synchronization' });

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
            this.setSyncState('change', {
                change: info,
                direction: info.direction,
                docs_read: info.docs_read,
                docs_written: info.docs_written
            });

            // Dispatch detailed change event
            this.dispatchEvent(new CustomEvent('sync:change', {
                detail: { info, timestamp: Date.now() }
            }));
        }).on('paused', info => {
            console.log('PouchDB sync paused');
            this.setSyncState('paused', { info });
        }).on('active', () => {
            console.log('PouchDB sync active');
            this.setSyncState('active');
        }).on('denied', info => {
            console.error('PouchDB sync denied:', info);
            this.setSyncState('error', {
                errorType: 'denied',
                info
            });
        }).on('error', async err => {
            console.error('PouchDB sync error:', err);

            // Set error state immediately (not debounced)
            this.setSyncState('error', {
                errorType: 'sync',
                error: err
            });

            // Check if error is related to authentication
            if (err.status === 401 || err.status === 403) {
                // Try to refresh token
                await authService.refreshTokenSilently();
            } else if (err.status === 0 || err.name === 'network_error') {
                // Handle network errors specifically
                console.log('Network error detected during sync');
            }
        }).on('complete', info => {
            console.log('PouchDB one-time sync complete', info);

            // Only process complete event if sync wasn't manually stopped
            // or if we're not already in an offline state
            if (!this.manuallyStoppedSync && this.syncState !== 'offline') {
                // For one-time sync or when replication completes naturally
                this.setSyncState('complete', { info });

                this.dispatchEvent(new CustomEvent('sync:complete', {
                    detail: { info, timestamp: Date.now() }
                }));
            }
        });

        console.log('PouchDB sync started');
    }

    stopSync() {
        if (this.syncHandler) {
            // Set flag to indicate this was a manual/intentional stop
            this.manuallyStoppedSync = true;

            // Cancel the sync
            this.syncHandler.cancel();
            this.syncHandler = null;
            console.log('PouchDB sync stopped');

            // Only update state if we're not already in offline or error state
            if (this.syncState !== 'offline' && this.syncState !== 'error') {
                // Update state and notify listeners
                this.setSyncState('inactive', { reason: 'sync_stopped' });
            }
        }
    }

    /**
     * Get the local database instance
     * This method will always return the local DB, even if offline or not authenticated
     */
    getLocalDatabase() {
        return this.initializeLocalDB();
    }

    /**
     * Get the database to use for operations
     * This will try to start sync if conditions allow, but will always return the local DB
     */
    async getDatabase() {
        // Always initialize local DB
        this.initializeLocalDB();

        // Try to start sync if authenticated and online but not already syncing
        if (authService.isAuthenticated() && this.isOnline && !this.syncHandler) {
            if (!this.isRemoteDbInitialized) {
                await this.initializeRemoteDB();
            }

            if (this.isRemoteDbInitialized) {
                await this.startSync();
            }
        }

        // Always return local DB regardless of sync status
        return this.localDB;
    }

    /**
     * Force a manual sync attempt if conditions allow
     * Useful for user-triggered sync operations
     */
    async forceSyncNow() {
        if (!this.isOnline) {
            console.log('Cannot force sync: device is offline');
            return { success: false, reason: 'offline' };
        }

        if (!authService.isAuthenticated()) {
            console.log('Cannot force sync: not authenticated');
            return { success: false, reason: 'unauthenticated' };
        }

        // Initialize remote DB if needed
        if (!this.isRemoteDbInitialized) {
            await this.initializeRemoteDB();
            if (!this.isRemoteDbInitialized) {
                console.log('Cannot force sync: unable to initialize remote DB');
                return { success: false, reason: 'remote_db_init_failed' };
            }
        }

        // Stop any existing sync and restart
        this.stopSync();
        await this.startSync();
        return { success: true };
    }
}

// Create singleton instance
const dbService = new DatabaseService();
console.log('DatabaseService instance created');
// Initialize local DB on startup
dbService.initializeLocalDB();

export default dbService;

/**
 * Example of how to use the sync events in your UI:
 * 
 * // Add these listeners in your UI components
 * dbService.addEventListener('sync:state-changed', (event) => {
 *     const { newState, oldState } = event.detail;
 *     console.log(`Sync changed from ${oldState} to ${newState}`);
 *     
 *     // Update UI based on sync state
 *     const syncStatusEl = document.getElementById('sync-status');
 *     
 *     switch(newState) {
 *         case 'active':
 *             syncStatusEl.textContent = 'Syncing...';
 *             syncStatusEl.className = 'sync-active';
 *             break;
 *         case 'paused':
 *             syncStatusEl.textContent = 'Sync paused';
 *             syncStatusEl.className = 'sync-paused';
 *             break;
 *         case 'error':
 *             syncStatusEl.textContent = 'Sync error';
 *             syncStatusEl.className = 'sync-error';
 *             break;
 *         case 'inactive':
 *             syncStatusEl.textContent = 'Not syncing';
 *             syncStatusEl.className = 'sync-inactive';
 *             break;
 *     }
 * });
 * 
 * // For more detailed change monitoring (if needed)
 * dbService.addEventListener('sync:change', (event) => {
 *     const { info } = event.detail;
 *     // Update progress indicators, etc.
 *     document.getElementById('docs-synced').textContent = 
 *         `${info.docs_written} documents synchronized`;
 * });
 */