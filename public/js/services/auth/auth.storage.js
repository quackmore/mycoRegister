// auth/auth.storage.js - Secure storage functionality for auth tokens

/**
 * Secure storage module for authentication data
 * Handles IndexedDB, localStorage and sessionStorage with encryption
 */

class AuthStorage {
    constructor() {
        this.authDbName = 'auth_storage_db';
        this.storeName = 'auth_store';
        this.dbPromise = null;
        this.isPwa = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://');
        this.capabilities = {};
        this.rememberMe = false;
        this.keyPrefix = this.isPwa ? 'pwa_' : 'browser_';
    }

    async init() {
        // Detect capabilities
        this.capabilities = {
            indexedDB: 'indexedDB' in window,
            localStorage: typeof Storage !== 'undefined',
            sessionStorage: typeof Storage !== 'undefined'
        };

        // Initialize IndexedDB
        if (this.capabilities.indexedDB) {
            await this.initIndexedDB();
        }
    }

    /**
     * IndexedDB initialization for PWA mode
     */
    async initIndexedDB() {
        if (!window.indexedDB) {
            console.warn('IndexedDB not supported, falling back to sessionStorage');
            this.isPwa = false;
            return false;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.authDbName, 1);

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                this.isPwa = false;
                resolve(false);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                this.dbPromise = Promise.resolve(event.target.result);
                resolve(true);
            };
        });
    }

    setRememberMe(remember) {
        this.rememberMe = remember;
    }

    async findExistingSession(sessionKey) {
        const namespacedKey = this.keyPrefix + sessionKey;

        // Check all storage locations
        const locations = [
            {
                type: 'sessionStorage',
                retrieve: () => sessionStorage.getItem(namespacedKey),
                persistent: false
            },
            {
                type: 'indexedDB',
                retrieve: () => this.dbRetrieve(namespacedKey),
                persistent: true
            },
            {
                type: 'localStorage',
                retrieve: () => this.retrieveAndDecrypt(namespacedKey),
                persistent: true
            }
        ];

        for (const location of locations) {
            try {
                if (!this.capabilities[location.type]) continue;

                const session = await location.retrieve();
                if (session)
                    return session;
            } catch (error) {
                console.debug(`No session found in ${location.type}`);
            }
        }
        return null;
    }

    /**
     * IndexedDB operations
     */
    async dbStore(key, value) {
        if (!this.dbPromise) {
            return false;
        }

        try {
            const db = await this.dbPromise;
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                // Encrypt the value first
                const encryptedValue = this.encryptValue(value);

                const request = store.put({ key, value: encryptedValue });

                request.onsuccess = () => resolve(true);
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error('dbStore error:', error);
            return false;
        }
    }

    async dbRetrieve(key) {
        if (!this.dbPromise) {
            return null;
        }

        try {
            const db = await this.dbPromise;
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(key);

                request.onsuccess = (event) => {
                    const data = event.target.result;
                    if (!data) {
                        resolve(null);
                        return;
                    }

                    // Decrypt the value
                    try {
                        const decryptedValue = this.decryptValue(data.value);
                        resolve(decryptedValue);
                    } catch (e) {
                        console.error('Error decrypting IndexedDB value:', e);
                        resolve(null);
                    }
                };

                request.onerror = (event) => {
                    console.error('Error retrieving from IndexedDB:', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error('dbRetrieve error:', error);
            return null;
        }
    }

    async dbRemove(key) {
        if (!this.dbPromise) {
            return false;
        }

        try {
            const db = await this.dbPromise;
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(key);

                request.onsuccess = () => resolve(true);
                request.onerror = (event) => {
                    console.error('Error removing from IndexedDB:', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error('dbRemove error:', error);
            return false;
        }
    }

    /**
     * Encryption helpers
     */
    encryptValue(value) {
        // Get browser fingerprint for encryption key
        const browserKey = this.getBrowserFingerprint();

        // Apply XOR
        let result = '';
        const keyChars = browserKey.toString();

        for (let i = 0; i < value.length; i++) {
            const keyChar = keyChars[i % keyChars.length].charCodeAt(0);
            const charCode = value.charCodeAt(i) ^ keyChar;
            result += String.fromCharCode(charCode);
        }

        // Convert to base64 for storage
        return btoa(result);
    }

    decryptValue(encrypted) {
        if (!encrypted) return null;

        try {
            // First decode from base64
            const encryptedBytes = atob(encrypted);
            const browserKey = this.getBrowserFingerprint();

            // Then apply XOR
            let result = '';
            const keyChars = browserKey.toString();

            for (let i = 0; i < encryptedBytes.length; i++) {
                const keyChar = keyChars[i % keyChars.length].charCodeAt(0);
                const charCode = encryptedBytes.charCodeAt(i) ^ keyChar;
                result += String.fromCharCode(charCode);
            }

            return result;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    /**
     * Unified storage operations - automatically uses appropriate storage mechanism
     */
    async storeSecurely(key, value) {
        // Convert objects to JSON strings
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
        const namespacedKey = this.keyPrefix + key;

        if (this.rememberMe) {
            // Persistent storage
            if (this.capabilities.indexedDB) {
                if (this.dbPromise) {
                    return await this.dbStore(namespacedKey, stringValue);
                } else {
                    throw new Error('Tentativo di scrittura id IndexDB non inizializzato');
                }
            } else if (this.capabilities.localStorage) {
                return this.encryptAndStore(namespacedKey, stringValue);
            }
        } else {
            // Session storage
            if (this.capabilities.sessionStorage) {
                return sessionStorage.setItem(namespacedKey, stringValue);
            }
        }
        throw new Error('Nessuna capacità di archiviazione disponibile.');
    }

    async retrieveSecurely(key, parseAsJson = false) {
        const namespacedKey = this.keyPrefix + key;
        let retrievedValue;

        // If we know the rememberMe flag, look in the right place
        if (this.rememberMe !== null) {
            if (this.rememberMe) {
                // Look in persistent storage
                if (this.capabilities.indexedDB) {
                    if (this.dbPromise) {
                        retrievedValue = await this.dbRetrieve(namespacedKey);
                    } else {
                        throw new Error('Tentativo di lettura id IndexDB non inizializzato');
                    }
                } else if (this.capabilities.localStorage) {
                    retrievedValue = this.retrieveAndDecrypt(namespacedKey);
                }
            } else {
                // Look in session storage
                if (this.capabilities.sessionStorage) {
                    retrievedValue = sessionStorage.getItem(namespacedKey);
                }
            }
        } else {
            throw new Error('rememberMe flag is not set, cannot determine storage location');
        }

        // If no value found, return null
        if (!retrievedValue) return null;

        // Try to parse as JSON if requested or if it looks like JSON
        if (parseAsJson || (retrievedValue.startsWith('{') || retrievedValue.startsWith('['))) {
            try {
                return JSON.parse(retrievedValue);
            } catch (error) {
                console.warn('Failed to parse retrieved value as JSON:', error);
                return retrievedValue; // Return as string if parsing fails
            }
        }

        return retrievedValue;
    }

    async removeSecurely(key) {
        const namespacedKey = this.keyPrefix + key;
        // If we know the rememberMe flag, look in the right place
        if (this.rememberMe !== null) {
            if (this.rememberMe) {
                // Look in persistent storage
                if (this.capabilities.indexedDB) {
                    return await this.dbRemove(namespacedKey);
                } else if (this.capabilities.localStorage) {
                    retrievedValue = localStorage.removeItem(namespacedKey);
                    return true;
                }
            } else {
                // Look in session storage
                if (this.capabilities.sessionStorage) {
                    retrievedValue = sessionStorage.removeItem(namespacedKey);
                    return true;
                }
            }
        }
        throw new Error('No storage capabilities available or key not found');
    }

    // Simple encryption for localStorage (not truly secure but better than plaintext)
    encryptAndStore(key, value) {
        if (!value) return;

        // Simple XOR encryption with a dynamic key 
        const browserKey = this.getBrowserFingerprint();

        // Apply XOR
        let result = '';
        const keyChars = browserKey.toString();

        for (let i = 0; i < value.length; i++) {
            const keyChar = keyChars[i % keyChars.length].charCodeAt(0);
            const charCode = value.charCodeAt(i) ^ keyChar;
            result += String.fromCharCode(charCode);
        }

        // Convert to base64 for storage
        localStorage.setItem(key, btoa(result));
    }

    retrieveAndDecrypt(key) {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;

        try {
            // First decode from base64
            const encryptedBytes = atob(encrypted);
            const browserKey = this.getBrowserFingerprint();

            // Then apply XOR without calling btoa again
            let result = '';
            const keyChars = browserKey.toString();

            for (let i = 0; i < encryptedBytes.length; i++) {
                const keyChar = keyChars[i % keyChars.length].charCodeAt(0);
                const charCode = encryptedBytes.charCodeAt(i) ^ keyChar;
                result += String.fromCharCode(charCode);
            }

            return result;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    getBrowserFingerprint() {
        // Create a simple fingerprint based on available browser information
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            window.screen.colorDepth,
            window.screen.width + 'x' + window.screen.height
        ].join('|');

        // Simple hash function
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16); // Convert to hex string
    }

    xorEncrypt(str, key) {
        // Simple XOR encryption
        let result = '';
        const keyChars = key.toString();

        for (let i = 0; i < str.length; i++) {
            const keyChar = keyChars[i % keyChars.length].charCodeAt(0);
            const charCode = str.charCodeAt(i) ^ keyChar;
            result += String.fromCharCode(charCode);
        }

        // Convert to base64 for storage
        return btoa(result);
    }
}

// Create singleton instance
const authStorage = new AuthStorage();

// Module exports
export default authStorage;