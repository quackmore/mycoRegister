// pwa-registration.js - Service Worker registration and update handling

// Import the sync service
import syncService from './sync.js';

// Check if service worker is supported
if ('serviceWorker' in navigator) {
    console.log('PWA starting...');
    window.addEventListener('load', () => {
        registerServiceWorker();
        handleServiceWorkerUpdates();
    });
} else {
    console.warn('Service Worker not supported in this browser');
}

// Register the service worker
async function registerServiceWorker() {
    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered with scope:', registration.scope);
        // Set up the background sync when supported
        if ('sync' in registration) {
            console.log('Background Sync is supported');
            document.addEventListener('online', () => {
                registration.sync.register('sync-pending-operations')
                    .then(() => console.log('Sync registered'))
                    .catch(err => console.error('Sync registration failed:', err));
            });
        }

        // Setup update notification
        setupUpdateNotification(registration);
    } catch (error) {
        console.error('Service Worker registration failed:', error);
    }
}

// Handle updates to the Service Worker
function handleServiceWorkerUpdates() {
    // Debounce controller change events
    let controllerChangeTimeout;

    // Track service worker state changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed');

        // Debounce multiple controller change events
        clearTimeout(controllerChangeTimeout);
        controllerChangeTimeout = setTimeout(() => {
            // Update notification UI
            const updateNotification = document.getElementById('update-notification');
            if (updateNotification) {
                updateNotification.classList.remove('hidden');
            }
        }, 1000); // Wait 1 second before showing the notification
    });

    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_STARTED') {
            console.log('Background sync started');

            // Update UI to show sync is happening
            syncService.updateSyncStatus('syncing');
        }
    });

    // Check for updates
    setInterval(() => {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'CHECK_FOR_UPDATES' });
        }
    }, 60 * 60 * 1000); // Check hourly
}

// Setup update notification
function setupUpdateNotification(registration) {
    const updateNotification = document.getElementById('updateNotification-container');
    const updateBtn = document.getElementById('update-btn');
    const updateLaterBtn = document.getElementById('update-later-btn');

    if (!updateNotification || !updateBtn || !updateLaterBtn) {
        console.warn('Update notification elements not found in DOM');
        return;
    }

    // Hide notification if clicked outside
    document.addEventListener('click', (event) => {
        if (!updateNotification.contains(event.target) &&
            !updateNotification.classList.contains('hidden')) {
            updateNotification.classList.add('hidden');
        }
    });

    // Update button handler - check for pending sync operations first
    updateBtn.addEventListener('click', async () => {
        // Check sync status
        if (syncService.getSyncStatus() === 'syncing') {
            // Show sync in progress confirmation
            if (!confirm('Sync is currently in progress. Updating now might cause data loss. Wait for sync to complete?')) {
                // User wants to update anyway
                performUpdate(registration);
            }
        } else if (syncService.pendingOperations && syncService.pendingOperations.length > 0) {
            // Show pending operations confirmation
            if (confirm('There are unsaved changes. Do you want to sync these changes before updating?')) {
                try {
                    // Try to process the queue first
                    await syncService.processQueuedOperations();
                    performUpdate(registration);
                } catch (error) {
                    console.error('Failed to process operations before update:', error);
                    if (confirm('Failed to sync changes. Update anyway? (May cause data loss)')) {
                        performUpdate(registration);
                    }
                }
            } else {
                performUpdate(registration);
            }
        } else {
            // No pending operations, proceed with update
            performUpdate(registration);
        }
    });

    // Update later button handler
    updateLaterBtn.addEventListener('click', () => {
        updateNotification.classList.add('hidden');
    });
}

// Perform the actual update
function performUpdate(registration) {
    if (registration && registration.waiting) {
        // Send message to the waiting service worker
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }

    // Reload the page to apply updates
    window.location.reload();
}

// document.addEventListener('DOMContentLoaded', () => {
// });

// Export for external use
export { registerServiceWorker, handleServiceWorkerUpdates };