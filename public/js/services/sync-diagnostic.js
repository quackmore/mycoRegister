// sync-diagnostics.js - Diagnostic tool for PouchDB sync issues

class SyncDiagnostics {
    constructor() {
        this.logElement = null;
        this.syncEvents = [];
        this.originalConsoleLog = console.log;
        this.originalConsoleError = console.error;
        this.setupUI();
        this.overrideConsole();
        this.hookIntoServices();
    }

    setupUI() {
        // Create UI when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            // Create diagnostics panel
            const panel = document.createElement('div');
            panel.className = 'sync-diagnostics-panel';
            panel.style.cssText = `
                position: fixed;
                bottom: 0;
                right: 0;
                width: 500px;
                height: 300px;
                background: #f5f5f5;
                border: 1px solid #ccc;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                font-family: monospace;
                font-size: 12px;
            `;

            // Header with controls
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 8px;
                background: #e0e0e0;
                border-bottom: 1px solid #ccc;
                display: flex;
                justify-content: space-between;
            `;
            header.innerHTML = `
                <span>PouchDB Sync Diagnostics</span>
                <div>
                    <button id="sync-diag-clear">Clear</button>
                    <button id="sync-diag-test">Test Sync</button>
                    <button id="sync-diag-hide">Hide</button>
                </div>
            `;
            panel.appendChild(header);

            // Log container
            const logContainer = document.createElement('div');
            logContainer.style.cssText = `
                flex: 1;
                overflow-y: auto;
                padding: 8px;
                background: #fff;
            `;
            this.logElement = document.createElement('pre');
            this.logElement.style.margin = '0';
            logContainer.appendChild(this.logElement);
            panel.appendChild(logContainer);

            // Add panel to body
            document.body.appendChild(panel);

            // Set up event handlers
            document.getElementById('sync-diag-clear').addEventListener('click', () => {
                this.clearLogs();
            });
            
            document.getElementById('sync-diag-test').addEventListener('click', () => {
                this.testSync();
            });
            
            document.getElementById('sync-diag-hide').addEventListener('click', () => {
                panel.style.display = 'none';
                
                // Show button to restore
                const showBtn = document.createElement('button');
                showBtn.textContent = 'Show Diagnostics';
                showBtn.style.cssText = `
                    position: fixed;
                    bottom: 10px;
                    right: 10px;
                    z-index: 9999;
                `;
                showBtn.addEventListener('click', () => {
                    panel.style.display = 'flex';
                    document.body.removeChild(showBtn);
                });
                document.body.appendChild(showBtn);
            });
        });
    }

    overrideConsole() {
        // Override console methods to capture logs
        console.log = (...args) => {
            this.originalConsoleLog.apply(console, args);
            if (args[0] && typeof args[0] === 'string' && 
                (args[0].includes('sync') || args[0].includes('PouchDB') || args[0].includes('database'))) {
                this.log('INFO', args);
            }
        };
        
        console.error = (...args) => {
            this.originalConsoleError.apply(console, args);
            this.log('ERROR', args);
        };
    }

    hookIntoServices() {
        // Wait for services to be available
        const checkServices = setInterval(() => {
            if (window.dbService && window.syncService) {
                clearInterval(checkServices);
                this.monitorServices();
            }
        }, 100);
    }

    monitorServices() {
        // Monitor DB Service events
        if (window.dbService) {
            window.dbService.addEventListener('db:changed', (event) => {
                this.log('DB EVENT', 'Document changed', event.detail);
            });
            
            window.dbService.addEventListener('db:document-updated', (event) => {
                this.log('DB EVENT', 'Document updated', event.detail);
            });
            
            window.dbService.addEventListener('db:document-removed', (event) => {
                this.log('DB EVENT', 'Document removed', event.detail);
            });
            
            window.dbService.addEventListener('db:error', (event) => {
                this.log('DB ERROR', event.detail.error);
            });
            
            this.log('INFO', 'Connected to dbService');
        }
        
        // Monitor Sync Service events
        if (window.syncService) {
            window.syncService.addEventListener('sync:change', (event) => {
                this.syncEvents.push({
                    type: 'change',
                    timestamp: new Date(),
                    details: event.detail
                });
                this.log('SYNC EVENT', 'Change detected', event.detail);
            });
            
            window.syncService.addEventListener('sync:paused', () => {
                this.syncEvents.push({
                    type: 'paused',
                    timestamp: new Date()
                });
                this.log('SYNC EVENT', 'Sync paused');
            });
            
            window.syncService.addEventListener('sync:active', () => {
                this.syncEvents.push({
                    type: 'active',
                    timestamp: new Date()
                });
                this.log('SYNC EVENT', 'Sync active');
            });
            
            window.syncService.addEventListener('sync:denied', (event) => {
                this.syncEvents.push({
                    type: 'denied',
                    timestamp: new Date(),
                    error: event.detail.error
                });
                this.log('SYNC ERROR', 'Sync denied', event.detail.error);
            });
            
            window.syncService.addEventListener('sync:error', (event) => {
                this.syncEvents.push({
                    type: 'error',
                    timestamp: new Date(),
                    error: event.detail.error
                });
                this.log('SYNC ERROR', event.detail.error);
            });
            
            window.syncService.addEventListener('sync:status-changed', (event) => {
                this.log('SYNC STATUS', event.detail.status);
            });
            
            this.log('INFO', 'Connected to syncService');
        }
    }

    log(level, ...args) {
        if (!this.logElement) return;
        
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        const prefix = `[${timestamp}] [${level}]`;
        
        let message;
        if (args.length === 1 && typeof args[0] === 'string') {
            message = args[0];
        } else {
            message = args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');
        }
        
        const logLine = document.createElement('div');
        logLine.textContent = `${prefix} ${message}`;
        
        // Color based on level
        if (level === 'ERROR' || level === 'SYNC ERROR') {
            logLine.style.color = '#e53935';
        } else if (level === 'SYNC EVENT') {
            logLine.style.color = '#1976d2';
        } else if (level === 'SYNC STATUS') {
            logLine.style.color = '#43a047';
        }
        
        this.logElement.appendChild(logLine);
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }

    clearLogs() {
        if (this.logElement) {
            this.logElement.innerHTML = '';
        }
    }

    async testSync() {
        try {
            this.log('TEST', 'Starting sync diagnostic test');
            
            // Check if services are available
            if (!window.dbService) {
                this.log('ERROR', 'dbService not available');
                return;
            }
            
            if (!window.syncService) {
                this.log('ERROR', 'syncService not available');
                return;
            }
            
            // Check authentication status
            const isAuthenticated = window.authService && window.authService.isAuthenticated();
            this.log('TEST', `Authentication status: ${isAuthenticated ? 'Logged in' : 'Not logged in'}`);
            
            // Check online status
            this.log('TEST', `Network status: ${navigator.onLine ? 'Online' : 'Offline'}`);
            
            // Check sync status
            const syncStatus = window.syncService.getSyncStatus();
            this.log('TEST', `Current sync status: ${syncStatus}`);
            
            // Test local database
            try {
                const dbInfo = await window.dbService.getInfo();
                this.log('TEST', `Local DB info:`, dbInfo);
            } catch (error) {
                this.log('ERROR', 'Failed to get local DB info', error);
            }
            
            // Test write and sync
            try {
                const testDoc = {
                    _id: `test_${Date.now()}`,
                    type: 'diagnostic_test',
                    timestamp: new Date().toISOString(),
                    testData: 'This is a sync test document'
                };
                
                this.log('TEST', 'Creating test document', testDoc);
                const result = await window.dbService.put(testDoc);
                this.log('TEST', 'Document created', result);
                
                // Check if sync was triggered
                setTimeout(() => {
                    const syncEventsAfterWrite = this.syncEvents.filter(
                        e => e.timestamp > new Date(Date.now() - 5000)
                    );
                    
                    if (syncEventsAfterWrite.length > 0) {
                        this.log('TEST', `Detected ${syncEventsAfterWrite.length} sync events after write`);
                    } else {
                        this.log('WARNING', 'No sync events detected after write');
                    }
                    
                    // Check if sync handler exists
                    if (window.syncService.syncHandler) {
                        this.log('TEST', 'Sync handler is active');
                    } else {
                        this.log('WARNING', 'No active sync handler found');
                    }
                }, 3000);
            } catch (error) {
                this.log('ERROR', 'Test document creation failed', error);
            }
        } catch (error) {
            this.log('ERROR', 'Sync test failed', error);
        }
    }
}

// Create singleton instance
const syncDiagnostics = new SyncDiagnostics();

// Make globally accessible for debugging
window.syncDiagnostics = syncDiagnostics;