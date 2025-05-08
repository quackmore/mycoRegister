// pwa-registration.js - Service Worker registration and update handling

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
        const { type, data } = event.data;
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
        performUpdate(registration);
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