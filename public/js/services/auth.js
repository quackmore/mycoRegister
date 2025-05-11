// auth.service.js - Service for handling authentication

// const connectionService = require("./connection");

class AuthService {
    constructor() {
        this.API_BASE_URL = '/api/auth';
        this.tokenKey = 'app_auth_token';
        this.refreshTokenKey = 'app_refresh_token';
        this.tokenExpiryKey = 'app_token_expiry';
        this.eventListeners = {};
        this.dbName = 'auth_storage_db';
        this.storeName = 'auth_store';
        this.dbPromise = null;
        this.initPromise = null;

        // Auto-refresh token setup
        this.refreshTimeout = null;
        this.tokenRefreshThreshold = 60000; // 1 minute before expiry

        // Event handling
        this.eventTarget = new EventTarget();

        // Determine if running as installed PWA
        this.isPwa = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://');
        // this.isPwa = true; // Force PWA mode for testing
        // Initialize
        this.init();
    }

    async init() {
        if (!this.initPromise) {
            this.initPromise = (async () => {
                // Initialize storage first
                if (this.isPwa) {
                    await this._initIndexedDB();
                }

                // Check authentication status on load
                this.checkTokenOnInit();

                // Set up event listeners for auth-related UI elements
                document.addEventListener('DOMContentLoaded', () => {
                    const loginForm = document.getElementById('login-form');
                    const logoutBtn = document.getElementById('logout-btn');

                    if (loginForm) {
                        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
                    }

                    if (logoutBtn) {
                        logoutBtn.addEventListener('click', () => this.handleLogout());
                    }
                });
            })();
        }
        return this.initPromise;
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

    /**
     * IndexedDB initialization for PWA mode
     */
    async _initIndexedDB() {
        if (!window.indexedDB) {
            console.warn('IndexedDB not supported, falling back to sessionStorage');
            this.isPwa = false;
            return false;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

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

    /**
     * IndexedDB operations
     */
    async _dbStore(key, value) {
        if (!this.dbPromise) {
            return false;
        }

        try {
            const db = await this.dbPromise;
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                // Encrypt the value first
                const encryptedValue = this._encryptValue(value);

                const request = store.put({ key, value: encryptedValue });

                request.onsuccess = () => resolve(true);
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error('_dbStore error:', error);
            return false;
        }
    }

    async _dbRetrieve(key) {
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
                        const decryptedValue = this._decryptValue(data.value);
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
            console.error('_dbRetrieve error:', error);
            return null;
        }
    }

    async _dbRemove(key) {
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
            console.error('_dbRemove error:', error);
            return false;
        }
    }

    /**
     * Encryption helpers for IndexedDB
     */
    _encryptValue(value) {
        // Get browser fingerprint for encryption key
        const browserKey = this._getBrowserFingerprint();

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

    _decryptValue(encrypted) {
        if (!encrypted) return null;

        try {
            // First decode from base64
            const encryptedBytes = atob(encrypted);
            const browserKey = this._getBrowserFingerprint();

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
    async _storeSecurely(key, value) {
        if (this.isPwa && this.dbPromise) {
            return await this._dbStore(key, value);
        } else if (this._isSecureStorageAvailable()) {
            sessionStorage.setItem(key, value);
            return true;
        } else {
            // Fallback to encrypted localStorage
            this._encryptAndStore(key, value);
            return true;
        }
    }

    async _retrieveSecurely(key) {
        if (this.isPwa && this.dbPromise) {
            return await this._dbRetrieve(key);
        } else if (this._isSecureStorageAvailable()) {
            return sessionStorage.getItem(key);
        } else {
            return this._retrieveAndDecrypt(key);
        }
    }

    async _removeSecurely(key) {
        if (this.isPwa && this.dbPromise) {
            return await this._dbRemove(key);
        } else if (this._isSecureStorageAvailable()) {
            sessionStorage.removeItem(key);
            return true;
        } else {
            localStorage.removeItem(key);
            return true;
        }
    }

    /**
     * Token management - using secure storage when available
     */
    async storeTokens(token, refreshToken, expiresIn) {
        // Calculate expiry time
        const expiryTime = Date.now() + (expiresIn * 1000);

        try {
            // Store using the hybrid approach
            await this._storeSecurely(this.tokenKey, token);
            await this._storeSecurely(this.refreshTokenKey, refreshToken);
            await this._storeSecurely(this.tokenExpiryKey, expiryTime.toString());

            // Setup auto refresh
            this.setupTokenRefresh(expiryTime);

            return true;
        } catch (error) {
            console.error('Failed to store auth tokens:', error);
            return false;
        }
    }

    async getToken() {
        if (this.initPromise) await this.initPromise;
        try {
            return await this._retrieveSecurely(this.tokenKey);
        } catch (error) {
            console.error('Failed to retrieve auth token:', error);
            return null;
        }
    }

    async getRefreshToken() {
        if (this.initPromise) await this.initPromise;
        try {
            return await this._retrieveSecurely(this.refreshTokenKey);
        } catch (error) {
            console.error('Failed to retrieve refresh token:', error);
            return null;
        }
    }

    async getTokenExpiry() {
        if (this.initPromise) await this.initPromise;
        try {
            const expiryStr = await this._retrieveSecurely(this.tokenExpiryKey);
            return expiryStr ? parseInt(expiryStr) : null;
        } catch (error) {
            console.error('Failed to retrieve token expiry:', error);
            return null;
        }
    }

    async clearTokens() {
        if (this.initPromise) await this.initPromise;
        try {
            await this._removeSecurely(this.tokenKey);
            await this._removeSecurely(this.refreshTokenKey);
            await this._removeSecurely(this.tokenExpiryKey);

            // Clear refresh interval
            if (this.refreshTimeout) {
                clearInterval(this.refreshTimeout);
                this.refreshTimeout = null;
            }

            return true;
        } catch (error) {
            console.error('Failed to clear auth tokens:', error);
            return false;
        }
    }

    /**
     * Helper methods for secure storage
     */
    _isSecureStorageAvailable() {
        // Modern browsers with secure context
        return window.isSecureContext;
    }

    // Simple encryption for localStorage (not truly secure but better than plaintext)
    _encryptAndStore(key, value) {
        if (!value) return;

        // Simple XOR encryption with a dynamic key 
        const browserKey = this._getBrowserFingerprint();

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

    _retrieveAndDecrypt(key) {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;

        try {
            // First decode from base64
            const encryptedBytes = atob(encrypted);
            const browserKey = this._getBrowserFingerprint();

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

    _getBrowserFingerprint() {
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

    _xorEncrypt(str, key) {
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

    /**
     * Authentication state checking
     */
    async isAuthenticated() {
        if (this.initPromise) await this.initPromise;
        const token = await this.getToken();
        const expiry = await this.getTokenExpiry();

        // Check if we have both token and expiry time
        if (!token || !expiry) {
            return false;
        }

        // Check if token is expired
        if (Date.now() >= expiry) {
            // Token expired, try to refresh
            await this.refreshTokenSilently();
            return false;
        }

        return true;
    }

    async checkTokenOnInit() {
        // Check if we have a valid token on initialization
        if (await this.isAuthenticated()) {
            this.dispatchEvent('auth:authenticated');

            // Setup token refresh if needed
            const expiry = await this.getTokenExpiry();
            if (expiry) {
                this.setupTokenRefresh(expiry);
            }
        } else {
            // We either have no token or it's expired
            const refreshToken = await this.getRefreshToken();
            if (refreshToken) {
                // Try to refresh the token
                await this.refreshTokenSilently();
            } else {
                this.dispatchEvent('auth:unauthenticated');
            }
        }
    }

    /**
     * Token refresh functionality
     */
    setupTokenRefresh(expiryTime) {
        // Clear any existing timeout
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        // Calculate time until we should refresh (threshold before expiry)
        const now = Date.now();
        const timeUntilRefresh = expiryTime - now - this.tokenRefreshThreshold;

        if (timeUntilRefresh <= 0) {
            // Already past or very close to threshold, refresh now
            this.refreshTokenSilently().catch(console.error);;
            return;
        }

        // Set timeout to refresh just before expiry
        this.refreshTimeout = setTimeout(() => {
            this.refreshTokenSilently().catch(console.error);;
        }, timeUntilRefresh);
    }

    async refreshTokenSilently() {
        if (this.initPromise) await this.initPromise;
        try {
            const refreshToken = await this.getRefreshToken();
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch(`${this.API_BASE_URL}/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const responseData = await response.json();

            // Check for proper response structure
            if (!responseData.data || !responseData.data.token || !responseData.data.expiresIn) {
                throw new Error('Invalid response format from server');
            }

            const { token, expiresIn } = responseData.data;

            // Store new tokens
            await this.storeTokens(token, refreshToken, expiresIn);

            // Notify that we've successfully refreshed
            this.dispatchEvent('auth:token-refreshed', {
                token: token,
                expiresIn: expiresIn
            });

            // Ensure system knows we're authenticated
            this.dispatchEvent('auth:authenticated');

            return true;
        } catch (error) {
            console.error('Silent token refresh failed:', error);

            // Clear tokens as they're now invalid
            await this.clearTokens();

            // Notify system we're no longer authenticated
            this.dispatchEvent('auth:unauthenticated');

            return false;
        }
    }

    // Handle login form submission
    async handleLogin(event) {
        if (this.initPromise) await this.initPromise;
        event.preventDefault();

        const loginForm = event.target;
        const username = loginForm.querySelector('#username').value;
        const password = loginForm.querySelector('#password').value;
        const loginError = document.getElementById('login-error');

        if (loginError) loginError.textContent = '';

        try {
            // Check if online first
            if (connectionService.online()) {
                const response = await fetch(`${this.API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Login failed');
                }

                const responseData = await response.json();

                // Check for proper response structure
                if (!responseData.data || !responseData.data.user || !responseData.data.token || !responseData.data.refreshToken || !responseData.data.expiresIn) {
                    throw new Error('Invalid response format from server');
                }

                const { token, refreshToken, expiresIn } = responseData.data;
                const userData = responseData.data.user;

                // Store the tokens
                await this.storeTokens(token, refreshToken, expiresIn);

                // Store credentials for offline authentication
                // Don't store the actual password but a hash of it
                await this.storeOfflineCredentials(
                    username,
                    password,
                    responseData.data.user
                );

                // Dispatch login success event
                this.dispatchEvent('auth:login-success', {
                    user: userData
                });

                // Also dispatch general authenticated event
                this.dispatchEvent('auth:authenticated');

                return true;
            } else {
                // Offline login attempt
                const offlineAuthSuccess = await this.handleOfflineAuthentication(username, password);

                if (offlineAuthSuccess) {
                    this.dispatchEvent('auth:offline-login-success', { username });
                    return true;
                } else {
                    if (loginError) {
                        loginError.textContent = 'Cannot verify credentials while offline';
                    }

                    this.dispatchEvent('auth:offline-login-failed');
                    return false;
                }
            }
        } catch (error) {
            console.error('Login error:', error);

            if (loginError) {
                loginError.textContent = 'Connection error. Please try again.';
            }

            this.dispatchEvent('auth:error', { error });
            return false;
        }
    }

    // Handle logout
    async handleLogout() {
        if (this.initPromise) await this.initPromise;
        try {
            // Get current token for authorization header
            const token = await this.getToken();

            if (token) {
                // Call logout API to invalidate the token on server
                await fetch(`${this.API_BASE_URL}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }

            // Clear tokens regardless of API call success
            await this.clearTokens();

            // Dispatch logout event
            this.dispatchEvent('auth:logout');

            // Also dispatch general unauthenticated event
            this.dispatchEvent('auth:unauthenticated');

            return true;
        } catch (error) {
            console.error('Logout error:', error);
            this.dispatchEvent('auth:error', { error });

            // If offline, still clear local auth state
            if (!connectionService.online()) {
                await this.clearTokens();
                this.dispatchEvent('auth:logout');
                return true;
            }

            return false;
        }
    }

    /**
    * Check if the app is in offline authentication mode
    * @returns {boolean} - Whether the app is in offline mode
    */
    isInOfflineMode() {
        return localStorage.getItem('app_offline_mode') === 'true';
    }

    /**
     * Handle offline authentication by verifying credentials against locally stored data
     * @param {string} username - The username to authenticate
     * @param {string} password - The password to authenticate
     * @returns {Promise<boolean>} - Whether authentication was successful
     */
    async handleOfflineAuthentication(username, password) {
        if (this.initPromise) await this.initPromise;
        try {
            // Check if we have stored offline credentials
            const storedCredentialsKey = 'app_offline_creds';
            let storedCredentials = await this._retrieveSecurely(storedCredentialsKey);

            if (!storedCredentials) {
                console.warn('No stored offline credentials found');
                return false;
            }

            // Parse the stored credentials
            const credentials = JSON.parse(storedCredentials);

            // Check if we have credentials for this username
            if (!credentials[username]) {
                console.warn('No stored credentials for this username');
                return false;
            }

            // Get stored password hash and salt
            const { hash: storedHash, salt, userData } = credentials[username];

            // Hash the provided password with the stored salt for comparison
            const calculatedHash = await this._hashPassword(password, salt);

            // Compare hashes
            if (storedHash === calculatedHash) {
                // Generate a temporary offline token
                const offlineToken = this._generateOfflineToken();
                const offlineExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

                // Store offline token
                await this.storeTokens(offlineToken, null, 86400); // 24 hours in seconds

                // Store user data in local storage
                if (userData) {
                    localStorage.setItem('app_offline_user', JSON.stringify(userData));
                }

                // Flag that we're in offline mode
                localStorage.setItem('app_offline_mode', 'true');

                return true;
            }

            return false;
        } catch (error) {
            console.error('Offline authentication error:', error);
            return false;
        }
    }

    /**
     * Store user credentials for offline authentication
     * This should be called after successful online authentication
     * @param {string} username - The username to store
     * @param {string} password - The password to store 
     * @param {Object} userData - User data to store for offline use
     * @returns {Promise<boolean>} - Whether credentials were stored successfully
     */
    async storeOfflineCredentials(username, password, userData) {
        try {
            // Generate a random salt
            const salt = this._generateSalt();

            // Hash the password with the salt
            const hash = await this._hashPassword(password, salt);

            // Get existing credentials if any
            const storedCredentialsKey = 'app_offline_creds';
            let storedCredentials = await this._retrieveSecurely(storedCredentialsKey);
            let existingCredentials = {};

            if (storedCredentials) {
                existingCredentials = JSON.parse(storedCredentials);
            }

            // Add/update credentials for this username
            existingCredentials[username] = {
                hash,
                salt,
                userData,
                lastUpdated: Date.now()
            };

            // Store updated credentials
            const credentialsString = JSON.stringify(existingCredentials);
            await this._storeSecurely(storedCredentialsKey, credentialsString);

            return true;
        } catch (error) {
            console.error('Failed to store offline credentials:', error);
            return false;
        }
    }

    /**
     * Generate a random salt for password hashing
     * @returns {string} - A random salt string
     */
    _generateSalt() {
        // Generate a random array of 16 bytes
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);

        // Convert to hex string
        return Array.from(array)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Hash a password with a salt using SubtleCrypto if available, or a fallback method
     * @param {string} password - The password to hash
     * @param {string} salt - The salt to use
     * @returns {Promise<string>} - The hashed password
     */
    async _hashPassword(password, salt) {
        try {
            // Check if SubtleCrypto is available
            if (window.crypto && window.crypto.subtle) {
                // Convert password and salt to ArrayBuffer
                const encoder = new TextEncoder();
                const passwordData = encoder.encode(password + salt);

                // Hash using SHA-256
                const hashBuffer = await window.crypto.subtle.digest('SHA-256', passwordData);

                // Convert to hex string
                return Array.from(new Uint8Array(hashBuffer))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            } else {
                // Fallback to a simpler hash for browsers without SubtleCrypto
                // Note: This is less secure and should be avoided when possible
                return this._fallbackHash(password + salt);
            }
        } catch (error) {
            console.error('Password hashing error:', error);
            // Fallback if SubtleCrypto fails
            return this._fallbackHash(password + salt);
        }
    }

    /**
     * A fallback hashing function for browsers without SubtleCrypto
     * This is less secure than proper crypto hashing
     * @param {string} str - The string to hash
     * @returns {string} - A hash string
     */
    _fallbackHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }

    /**
     * Generate a temporary offline token
     * @returns {string} - A random token string
     */
    _generateOfflineToken() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
    * Sync offline activity when returning online
    * Call this when network connectivity is restored
    * @returns {Promise<boolean>} - Whether sync was successful
    */
    async syncOfflineData() {
        try {
            if (!this.isInOfflineMode()) {
                return true; // Not in offline mode, nothing to sync
            }

            // Get stored credentials
            const storedCredentialsKey = 'app_offline_creds';
            let storedCredentials = await this._retrieveSecurely(storedCredentialsKey);

            if (!storedCredentials) {
                return false;
            }

            // Get the username from offline user data
            const offlineUser = JSON.parse(localStorage.getItem('app_offline_user') || '{}');
            const username = offlineUser.username;

            if (!username) {
                return false;
            }

            // Clear offline mode flag
            localStorage.removeItem('app_offline_mode');

            // Try to refresh token
            return await this.refreshTokenSilently();
        } catch (error) {
            console.error('Failed to sync offline data:', error);
            return false;
        }
    }

    async getCurrentUser() {
        try {
            const token = await this.getToken();

            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`${this.API_BASE_URL}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get user data');
            }

            const userData = await response.json();
            return userData.data;
        } catch (error) {
            console.error('Error fetching current user:', error);

            // If unauthorized, clear tokens and update state
            if (error.message === 'Not authenticated' ||
                error.message === 'Failed to get user data') {
                await this.clearTokens();
                this.dispatchEvent('auth:unauthenticated');
            }

            return null;
        }
    }

    /**
     * Helper to get auth header for external API calls
     */
    async getAuthHeader() {
        const token = await this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * For PouchDB/CouchDB integration
     */
    async getPouchDbAuthHeaders() {
        const token = await this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
}

// Create singleton instance
const authService = new AuthService();
console.log('AuthService initialized');
// Export for global access
window.authService = authService;