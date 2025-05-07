// sync.js - Synchronization service for handling data sync with remote CouchDB

import authService from './auth.js';
import { createPouchDbUrl } from '../utils/pouchDb-helper.js';

class SyncService {
    constructor() {
        // State
        this.syncState = 'offline'; // 'offline', 'online', 'syncing'
        this.syncHandler = null;
        this.remoteDb = null;
        this.pendingOperations = [];

        // Event handling
        this.eventTarget = new EventTarget();

        // Initialize
        this.init();
    }

    init() {
        // Set up online/offline detection
        window.addEventListener('online', () => this.handleConnectionChange(true));
        window.addEventListener('offline', () => this.handleConnectionChange(false));

        // Listen for auth events - REVISED for JWT
        authService.addEventListener('auth:authenticated', () => this.initializeSync());
        authService.addEventListener('auth:login-success', () => this.initializeSync());
        authService.addEventListener('auth:offline-authenticated', () => {
            if (navigator.onLine) {
                this.initializeSync();
            } else {
                this.updateSyncStatus('offline');
            }
        });
        authService.addEventListener('auth:offline-login-success', () => {
            this.updateSyncStatus('offline');
            this.dispatchEvent('sync:waiting-for-connection');
        });
        authService.addEventListener('auth:logout', () => this.stopSync());
        authService.addEventListener('auth:unauthenticated', () => this.stopSync());
        authService.addEventListener('auth:session-expired', () => {
            this.stopSync();
            this.dispatchEvent('sync:auth-expired');
        });
        authService.addEventListener('auth:token-refreshed', () => {
            // Reinitialize sync when token is refreshed
            this.stopSync();
            this.initializeSync();
        });

        // Initialize offlineOperationQueue from localStorage if exists
        this.loadPendingOperations();

        // Setup sync status UI updates
        document.addEventListener('DOMContentLoaded', () => {
            this.setupSyncStatusUI();
        });

        // Listen for service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data && event.data.type === 'SYNC_STARTED') {
                    this.processQueuedOperations();
                }
            });
        }
    }

    // Event subscription methods
    addEventListener(event, callback) {
        this.eventTarget.addEventListener(event, callback);
    }

    removeEventListener(event, callback) {
        this.eventTarget.removeEventListener(event, callback);
    }

    // Dispatch events to subscribers
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        this.eventTarget.dispatchEvent(event);
    }

    // Get CSRF token from auth service
    async getCsrfToken() {
        return await authService.getCsrfToken();
    }

    // Initialize sync with remote database
    async initializeSync() {
        if (!authService.isAuthenticated()) {
            console.log('Cannot initialize sync: not authenticated');
            return;
        }

        try {
            // Get sync configuration
            const syncConfig = await this.getSyncConfig();

            // Setup remote connection using JWT auth
            this.setupRemoteConnection(syncConfig.config.dbUrl);

            // Process any pending operations
            if (this.pendingOperations.length > 0) {
                this.processQueuedOperations();
            }
        } catch (error) {
            console.error('Failed to initialize sync:', error);
            this.updateSyncStatus('offline');
            this.dispatchEvent('sync:error', { error });
        }
    }

    // Setup remote connection to CouchDB with JWT auth
    setupRemoteConnection(dbUrl) {
        // JWT auth is handled via HttpOnly cookies, so we just need to 
        // ensure credentials are included with each request
        
        // Initialize remote database with correct authentication
        this.remoteDb = new PouchDB(createPouchDbUrl(dbUrl), {
            skip_setup: true,
            fetch: (url, opts) => {
                // Always include credentials to send cookies with each request
                opts.credentials = 'include';
                
                // Add CSRF token for non-GET requests
                if (opts.method && opts.method !== 'GET') {
                    return this.getCsrfToken().then(csrfToken => {
                        if (!opts.headers) {
                            opts.headers = {};
                        }
                        
                        // Add CSRF token header
                        if (csrfToken) {
                            opts.headers['X-CSRF-Token'] = csrfToken;
                        }
                        
                        return fetch(url, opts);
                    });
                }
                
                return fetch(url, opts);
            }
        });

        // Start sync
        this.startSync();
    }

    // Start continuous sync with remote database
    startSync() {
        if (this.syncHandler) {
            // Cancel any existing sync
            this.syncHandler.cancel();
        }

        if (!navigator.onLine) {
            this.updateSyncStatus('offline');
            return;
        }

        this.updateSyncStatus('syncing');

        // Get local database instance
        const db = window.dbService.getLocalDb();

        if (!db) {
            console.error('Cannot start sync: local database not initialized');
            this.updateSyncStatus('offline');
            return;
        }

        // Set up two-way sync
        this.syncHandler = db.sync(this.remoteDb, {
            live: true,
            retry: true,
            heartbeat: 10000 // Check connection every 10 seconds
        })
            .on('change', (info) => {
                console.log('Sync change:', info);
                this.dispatchEvent('sync:change', { info });
            })
            .on('paused', () => {
                this.updateSyncStatus('online');
                this.dispatchEvent('sync:paused');
            })
            .on('active', () => {
                this.updateSyncStatus('syncing');
                this.dispatchEvent('sync:active');
            })
            .on('denied', (err) => {
                console.error('Sync denied:', err);
                this.updateSyncStatus('offline');
                this.dispatchEvent('sync:denied', { error: err });

                // If error is due to authentication, notify auth service
                if (err.status === 401 || err.status === 403) {
                    // Try to refresh token first
                    authService.refreshAccessToken().then(refreshed => {
                        if (!refreshed) {
                            authService.dispatchEvent('auth:session-expired');
                        } else {
                            // If token was refreshed successfully, restart sync
                            this.startSync();
                        }
                    });
                }
            })
            .on('error', (err) => {
                console.error('Sync error:', err);
                this.updateSyncStatus('offline');
                this.dispatchEvent('sync:error', { error: err });

                // If error is due to authentication, attempt to refresh
                if (err.status === 401 || err.status === 403) {
                    authService.refreshAccessToken().then(refreshed => {
                        if (!refreshed) {
                            authService.dispatchEvent('auth:session-expired');
                        } else {
                            // If token was refreshed successfully, restart sync
                            this.startSync();
                        }
                    });
                }
            });
    }

    // Stop synchronization
    stopSync() {
        if (this.syncHandler) {
            this.syncHandler.cancel();
            this.syncHandler = null;
            this.remoteDb = null;
        }

        this.updateSyncStatus('offline');
    }

    // Handle connection status changes
    handleConnectionChange(isOnline) {
        if (isOnline) {
            if (authService.isAuthenticated() && !this.syncHandler) {
                this.initializeSync();
            }
        } else {
            this.updateSyncStatus('offline');
        }
    }

    // Update sync status
    updateSyncStatus(status) {
        this.syncState = status;

        // Update UI if available
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) {
            const statusText = syncStatus.querySelector('.status-text');

            if (statusText) {
                // Only show text when syncing, otherwise empty
                if (status === 'syncing') {
                    statusText.textContent = 'Syncing...';
                    syncStatus.classList.add('active');
                } else {
                    statusText.textContent = '';
                    syncStatus.classList.remove('active');
                }
            }
        }

        // Dispatch status change event
        this.dispatchEvent('sync:status-changed', { status });
    }

    // Setup sync status UI
    setupSyncStatusUI() {
        const syncStatus = document.getElementById('sync-status');
        if (!syncStatus) return;

        // Initial status update
        this.updateSyncStatus(navigator.onLine ? 'online' : 'offline');
    }

    // Get current sync status
    getSyncStatus() {
        return this.syncState;
    }

    // Get changes from server
    async getChanges() {
        try {
            const response = await fetch('/api/sync/changes', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to get changes');
            }

            const changes = await response.json();
            return changes;
        } catch (error) {
            console.error('Failed to get changes:', error);
            this.dispatchEvent('sync:error', { error });
            throw error;
        }
    }

    // Get sync configuration
    async getSyncConfig() {
        try {
            const response = await fetch('/api/sync/config', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to get sync configuration');
            }

            const config = await response.json();
            return config;
        } catch (error) {
            console.error('Failed to get sync config:', error);
            this.dispatchEvent('sync:error', { error });
            throw error;
        }
    }

    // Handle conflict resolution
    async resolveConflict(conflictData) {
        try {
            // Get CSRF token for the POST request
            const csrfToken = await this.getCsrfToken();
            
            const response = await fetch('/api/sync/conflicts/resolve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify(conflictData),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to resolve conflict');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to resolve conflict:', error);
            this.dispatchEvent('sync:conflict-error', { error });

            // If offline, queue the operation
            if (!navigator.onLine) {
                this.queueOperation(() => this.resolveConflict(conflictData));
            }

            throw error;
        }
    }

    // Queue operations for offline mode
    queueOperation(operation) {
        // Add operation to the queue
        this.pendingOperations.push({
            operation: operation.toString(), // Convert function to string
            timestamp: Date.now()
        });

        // Save to persistent storage
        this.savePendingOperations();

        // Request background sync if available
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('sync-pending-operations')
                    .catch(err => console.error('Sync registration failed:', err));
            });
        }

        this.dispatchEvent('sync:operation-queued');
    }

    // Save pending operations to localStorage
    savePendingOperations() {
        try {
            localStorage.setItem('sync_pending_operations', JSON.stringify(this.pendingOperations));
        } catch (error) {
            console.error('Failed to save pending operations:', error);
        }
    }

    // Load pending operations from localStorage
    loadPendingOperations() {
        try {
            const savedOperations = localStorage.getItem('sync_pending_operations');
            if (savedOperations) {
                this.pendingOperations = JSON.parse(savedOperations);
            }
        } catch (error) {
            console.error('Failed to load pending operations:', error);
            this.pendingOperations = [];
        }
    }

    // Process queued operations when back online
    async processQueuedOperations() {
        if (this.pendingOperations.length === 0) {
            return;
        }

        this.updateSyncStatus('syncing');

        try {
            // Process each queued operation
            const operationsToProcess = [...this.pendingOperations];
            this.pendingOperations = [];

            for (const opData of operationsToProcess) {
                try {
                    // Convert string back to function and execute
                    const operation = new Function('return ' + opData.operation)();
                    await operation();
                } catch (error) {
                    console.error('Failed to process queued operation:', error);
                    // Re-queue the operation for later retry
                    this.pendingOperations.push(opData);
                }
            }

            // Save updated queue
            this.savePendingOperations();

            // Update status based on remaining operations
            if (this.pendingOperations.length === 0) {
                this.updateSyncStatus('online');
                this.dispatchEvent('sync:queue-processed');
            } else {
                this.updateSyncStatus('offline');
                this.dispatchEvent('sync:queue-partial', {
                    remaining: this.pendingOperations.length
                });
            }
        } catch (error) {
            console.error('Error processing queued operations:', error);
            this.updateSyncStatus('offline');
            this.dispatchEvent('sync:queue-error', { error });
        }
    }
}

// Create and export singleton instance
const syncService = new SyncService();
window.syncService = syncService;
export default syncService;