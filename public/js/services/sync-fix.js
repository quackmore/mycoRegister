// sync-fix.js - Fix for PouchDB sync issues

// Apply these fixes to your sync.js file

class SyncFix {
    constructor() {
        // This method will check and fix your sync configuration
        this.fixSyncConfiguration();
    }

    async fixSyncConfiguration() {
        console.log('[SyncFix] Checking sync configuration...');

        if (!window.dbService || !window.syncService) {
            console.error('[SyncFix] Services not available yet. Please load this after your app is initialized.');
            return;
        }

        // Common issue #1: Check if the sync URL is correctly formatted
        if (window.syncService.remoteDb) {
            const remoteDbUrl = window.syncService.remoteDb.name;
            console.log('[SyncFix] Current remote DB URL:', remoteDbUrl);

            // Check for common URL issues
            if (remoteDbUrl.includes('//')) {
                if (!remoteDbUrl.startsWith('http://') && !remoteDbUrl.startsWith('https://')) {
                    console.warn('[SyncFix] Remote URL might be malformed:', remoteDbUrl);
                }
            }
        } else {
            console.warn('[SyncFix] No remote database is currently initialized.');
        }

        // Common issue #2: Fix sync handler options
        if (window.syncService.startSync) {
            const originalStartSync = window.syncService.startSync;
            
            window.syncService.startSync = function() {
                console.log('[SyncFix] Starting sync with improved options');
                
                if (this.syncHandler) {
                    this.syncHandler.cancel();
                }
                
                if (!navigator.onLine) {
                    this.updateSyncStatus('offline');
                    return;
                }
                
                this.updateSyncStatus('syncing');
                
                const db = window.dbService.getLocalDb();
                
                if (!db) {
                    console.error('[SyncFix] Cannot start sync: local database not initialized');
                    this.updateSyncStatus('offline');
                    return;
                }
                
                // Enhanced sync options
                this.syncHandler = db.sync(this.remoteDb, {
                    live: true,
                    retry: true,
                    heartbeat: 10000,
                    back_off_function: function (delay) {
                        if (delay === 0) {
                            return 1000;
                        }
                        return delay * 1.5;
                    },
                    timeout: 30000,  // Increase timeout for slow connections
                    batch_size: 50   // Smaller batch size for reliable syncs
                })
                .on('change', (info) => {
                    console.log('[SyncFix] Sync change detected:', info);
                    if (info.direction === 'pull') {
                        console.log('[SyncFix] Received', info.change.docs_read, 'docs from remote');
                    } else {
                        console.log('[SyncFix] Sent', info.change.docs_read, 'docs to remote');
                    }
                    this.dispatchEvent('sync:change', { info });
                })
                .on('paused', (err) => {
                    if (err) {
                        console.warn('[SyncFix] Sync paused with error:', err);
                    } else {
                        console.log('[SyncFix] Sync paused - up to date');
                    }
                    this.updateSyncStatus('online');
                    this.dispatchEvent('sync:paused');
                })
                .on('active', () => {
                    console.log('[SyncFix] Sync active - transferring data');
                    this.updateSyncStatus('syncing');
                    this.dispatchEvent('sync:active');
                })
                .on('denied', (err) => {
                    console.error('[SyncFix] Sync denied:', err);
                    this.updateSyncStatus('offline');
                    this.dispatchEvent('sync:denied', { error: err });
                    
                    // If error is due to authentication, notify auth service
                    if (err.status === 401 || err.status === 403) {
                        window.authService.dispatchEvent('auth:session-expired');
                    }
                })
                .on('error', (err) => {
                    console.error('[SyncFix] Sync error:', err);
                    
                    // Handle specific error types
                    if (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504) {
                        console.warn('[SyncFix] Network-related error, will retry when network is available');
                    } else if (err.status === 401 || err.status === 403) {
                        window.authService.dispatchEvent('auth:session-expired');
                    } else if (err.status === 409) {
                        console.warn('[SyncFix] Conflict detected during sync');
                    }
                    
                    this.updateSyncStatus('offline');
                    this.dispatchEvent('sync:error', { error: err });
                });
                
                console.log('[SyncFix] Sync started with enhanced options');
            };
            
            console.log('[SyncFix] Improved sync start method installed');
        }
        
        // Common issue #3: Check and fix remote connection setup
        if (window.syncService.setupRemoteConnection) {
            const originalSetupRemote = window.syncService.setupRemoteConnection;
            
            window.syncService.setupRemoteConnection = function(dbUrl, credentials) {
                console.log('[SyncFix] Setting up remote connection with improved options');
                
                // Ensure URL is properly formatted
                if (!dbUrl.startsWith('http://') && !dbUrl.startsWith('https://')) {
                    console.warn('[SyncFix] Adding protocol to URL:', dbUrl);
                    dbUrl = 'http://' + dbUrl.replace(/^\/\//, '');
                }
                
                // Use more reliable fetch wrapper
                const customFetch = (url, opts) => {
                    console.log('[SyncFix] Making request to:', url);
                    
                    // Add credentials
                    opts.credentials = 'include';
                    
                    // Add timeout
                    return Promise.race([
                        fetch(url, opts),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Request timeout')), 30000)
                        )
                    ]);
                };
                
                // Initialize remote database with better options
                this.remoteDb = new PouchDB(dbUrl, {
                    skip_setup: false,  // Try to create the DB if it doesn't exist
                    fetch: customFetch,
                    ajax: {
                        timeout: 30000,
                        withCredentials: true
                    }
                });
                
                console.log('[SyncFix] Remote connection established to:', dbUrl);
                
                // Start sync
                this.startSync();
            };
            
            console.log('[SyncFix] Improved remote connection setup installed');
        }
        
        // Common issue #4: Reconnect when service seems disconnected
        if (window.syncService.syncHandler === null && window.authService && window.authService.isAuthenticated()) {
            console.log('[SyncFix] Detected authenticated session with no active sync, reconnecting...');
            try {
                window.syncService.initializeSync();
            } catch (error) {
                console.error('[SyncFix] Failed to reinitialize sync:', error);
            }
        }
        
        // Common issue #5: Validate that indexes aren't blocking sync
        window.dbService.getLocalDb().info()
            .then(info => {
                console.log('[SyncFix] Local database info:', info);
                return window.dbService.getLocalDb().allDocs({include_docs: false});
            })
            .then(result => {
                console.log('[SyncFix] Local database contains', result.rows.length, 'documents');
                
                // Check if we need to force a sync
                if (result.rows.length > 0 && (!window.syncService.syncHandler || window.syncService.getSyncStatus() === 'offline')) {
                    console.log('[SyncFix] Found documents but sync is inactive. Attempting to restart sync...');
                    
                    if (window.authService && window.authService.isAuthenticated() && navigator.onLine) {
                        window.syncService.initializeSync();
                    }
                }
            })
            .catch(error => {
                console.error('[SyncFix] Error checking database:', error);
            });
        
        console.log('[SyncFix] Sync configuration check completed');
    }
}

// Create the fix instance when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for services to be available
    const checkInterval = setInterval(() => {
        if (window.dbService && window.syncService && window.authService) {
            clearInterval(checkInterval);
            
            // Initialize the fix
            const syncFix = new SyncFix();
            
            // Make it accessible for debugging
            window.syncFix = syncFix;
            
            console.log('[SyncFix] PouchDB sync fixes applied');
        }
    }, 200);
});