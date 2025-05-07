// updateManager.js - Handles safe app updates with data preservation

import syncService from './sync.js';

class UpdateManager {
    constructor() {
        this.updatePending = false;
        this.formStates = new Map();
        this.unsavedForms = new Set();
        
        // Initialize
        this.init();
    }
    
    init() {
        // Setup beforeunload handler to warn about unsaved changes
        window.addEventListener('beforeunload', (event) => {
            if (this.hasUnsavedChanges()) {
                const message = 'You have unsaved changes. Are you sure you want to leave?';
                event.returnValue = message;
                return message;
            }
        });
        
        // Track form changes
        this.setupFormTracking();
        
        // Listen for update events
        document.addEventListener('DOMContentLoaded', () => {
            const updateBtn = document.getElementById('update-btn');
            if (updateBtn) {
                updateBtn.addEventListener('click', () => this.prepareForUpdate());
            }
        });
    }
    
    // Setup form tracking to detect unsaved changes
    setupFormTracking() {
        document.addEventListener('DOMContentLoaded', () => {
            // Find all forms with data-track-changes attribute
            const forms = document.querySelectorAll('form[data-track-changes]');
            
            forms.forEach(form => {
                // Store initial form state
                this.formStates.set(form, this.getFormState(form));
                
                // Add change listener
                form.addEventListener('input', () => this.handleFormChange(form));
                
                // Track form submission
                form.addEventListener('submit', () => {
                    this.unsavedForms.delete(form);
                });
            });
        });
    }
    
    // Get serialized form state
    getFormState(form) {
        const formData = new FormData(form);
        return JSON.stringify(Array.from(formData.entries()));
    }
    
    // Handle form changes
    handleFormChange(form) {
        const initialState = this.formStates.get(form);
        const currentState = this.getFormState(form);
        
        if (initialState !== currentState) {
            this.unsavedForms.add(form);
        } else {
            this.unsavedForms.delete(form);
        }
    }
    
    // Check if there are any unsaved changes
    hasUnsavedChanges() {
        return this.unsavedForms.size > 0 || 
               syncService.getSyncStatus() === 'syncing' ||
               (syncService.pendingOperations && syncService.pendingOperations.length > 0);
    }
    
    // Prepare for update by ensuring data is saved
    async prepareForUpdate() {
        if (!this.hasUnsavedChanges()) {
            return true; // Safe to update
        }
        
        this.updatePending = true;
        
        // Handle unsaved forms
        if (this.unsavedForms.size > 0) {
            if (!confirm('You have unsaved changes in forms. These changes will be lost if you update now. Continue?')) {
                this.updatePending = false;
                return false;
            }
        }
        
        // Handle sync operations
        if (syncService.pendingOperations && syncService.pendingOperations.length > 0) {
            try {
                // Try processing the queue
                if (navigator.onLine) {
                    await syncService.processQueuedOperations();
                } else {
                    if (!confirm('You have pending sync operations that cannot be processed while offline. These changes may be lost if you update now. Continue?')) {
                        this.updatePending = false;
                        return false;
                    }
                }
            } catch (error) {
                console.error('Error syncing data before update:', error);
                if (!confirm('Error syncing data. Your changes may be lost if you update now. Continue anyway?')) {
                    this.updatePending = false;
                    return false;
                }
            }
        }
        
        // Handle active sync
        if (syncService.getSyncStatus() === 'syncing') {
            return new Promise(resolve => {
                // Create a temporary UI to show sync progress
                this.showSyncProgressUI();
                
                // Listen for sync completion
                const syncCompleteListener = (event) => {
                    if (event.detail.status === 'online') {
                        syncService.removeEventListener('sync:status-changed', syncCompleteListener);
                        this.hideSyncProgressUI();
                        resolve(true);
                    }
                };
                
                syncService.addEventListener('sync:status-changed', syncCompleteListener);
                
                // Provide cancel option
                const cancelBtn = document.getElementById('sync-progress-cancel');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        syncService.removeEventListener('sync:status-changed', syncCompleteListener);
                        this.hideSyncProgressUI();
                        this.updatePending = false;
                        resolve(false);
                    });
                }
            });
        }
        
        return true;
    }
    
    // Show sync progress UI
    showSyncProgressUI() {
        // Create sync progress element if it doesn't exist
        let syncProgress = document.getElementById('sync-progress-overlay');
        if (!syncProgress) {
            syncProgress = document.createElement('div');
            syncProgress.id = 'sync-progress-overlay';
            syncProgress.innerHTML = `
                <div class="sync-progress-container">
                    <h3>Syncing Data</h3>
                    <p>Please wait while your data is being synced...</p>
                    <div class="sync-progress-bar">
                        <div class="sync-progress-value"></div>
                    </div>
                    <button id="sync-progress-cancel" class="update-btn secondary">Cancel</button>
                </div>
            `;
            syncProgress.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
            `;
            document.body.appendChild(syncProgress);
        }
        
        syncProgress.classList.remove('hidden');
    }
    
    // Hide sync progress UI
    hideSyncProgressUI() {
        const syncProgress = document.getElementById('sync-progress-overlay');
        if (syncProgress) {
            syncProgress.classList.add('hidden');
        }
    }
}

// Create and export singleton instance
const updateManager = new UpdateManager();
export default updateManager;