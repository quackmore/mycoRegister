// pwa-registration.js - Service Worker registration and update handling

// Check if service worker is supported
if ('serviceWorker' in navigator) {
    console.log('PWA starting...');
    window.addEventListener('load', () => {
        registerServiceWorker();
    });
} else {
    console.warn('Service Worker not supported in this browser');
}


let refreshing = false;

async function registerServiceWorker() {
    try {
        const registration = await navigator.serviceWorker.register('/sw.js', { type: 'module' });
        console.log('Service Worker registered with scope:', registration.scope);

        // Listen for controller change once
        let hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            // Only reload if we had a controller before (i.e., this is an update, not first install)
            if (hadController) {
                refreshing = true;
                console.log('Service Worker updated, reloading...');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                console.log('Service Worker installed for first time, no reload needed');
            }
        });

        // Check if there's an update waiting right now
        if (registration.waiting) {
            promptUserToUpdate(registration);
        }

        // Listen for updates found later
        registration.addEventListener('updatefound', () => {
            console.log('Service Worker found an update');
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New update available
                    promptUserToUpdate(registration);
                }
            });
        });
        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
    }
}

function promptUserToUpdate(registration) {
    // Show your UI notification to user here
    // For example:
    if (confirm("Sono disponibili aggiornamenti. Vuoi aggiornare l'app adesso?")) {
        performUpdate(registration);
    }
}

function performUpdate(registration) {
    if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
        console.log('No update available');
    }
}