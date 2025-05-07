// auth.service.js - Service for handling authentication

class AuthService {
    constructor() {
        this.API_BASE_URL = '/api/auth';
        this.tokenKey = 'app_auth_token';
        this.refreshTokenKey = 'app_refresh_token';
        this.tokenExpiryKey = 'app_token_expiry';
        this.eventListeners = {};

        // Auto-refresh token setup
        this.refreshInterval = null;
        this.tokenRefreshThreshold = 60000; // 1 minute before expiry

        // Event handling
        this.eventTarget = new EventTarget();

        // Initialize
        this.init();
    }

    init() {
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
     * Token management - using secure storage when available
     */
    storeTokens(token, refreshToken, expiresIn) {
        // Calculate expiry time
        const expiryTime = Date.now() + (expiresIn * 1000);

        try {
            // Try to use secure storage if available
            if (this._isSecureStorageAvailable()) {
                // Store in secure context
                this._secureStore(this.tokenKey, token);
                this._secureStore(this.refreshTokenKey, refreshToken);
                this._secureStore(this.tokenExpiryKey, expiryTime.toString());
            } else {
                // Fallback to encrypted localStorage
                this._encryptAndStore(this.tokenKey, token);
                this._encryptAndStore(this.refreshTokenKey, refreshToken);
                localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
            }

            // Setup auto refresh
            this.setupTokenRefresh(expiryTime);

            return true;
        } catch (error) {
            console.error('Failed to store auth tokens:', error);
            return false;
        }
    }

    getToken() {
        try {
            if (this._isSecureStorageAvailable()) {
                return this._secureRetrieve(this.tokenKey);
            } else {
                return this._retrieveAndDecrypt(this.tokenKey);
            }
        } catch (error) {
            console.error('Failed to retrieve auth token:', error);
            return null;
        }
    }

    getRefreshToken() {
        try {
            if (this._isSecureStorageAvailable()) {
                return this._secureRetrieve(this.refreshTokenKey);
            } else {
                return this._retrieveAndDecrypt(this.refreshTokenKey);
            }
        } catch (error) {
            console.error('Failed to retrieve refresh token:', error);
            return null;
        }
    }

    getTokenExpiry() {
        try {
            let expiryStr;
            if (this._isSecureStorageAvailable()) {
                expiryStr = this._secureRetrieve(this.tokenExpiryKey);
            } else {
                expiryStr = localStorage.getItem(this.tokenExpiryKey);
            }
            return expiryStr ? parseInt(expiryStr) : null;
        } catch (error) {
            console.error('Failed to retrieve token expiry:', error);
            return null;
        }
    }

    clearTokens() {
        try {
            if (this._isSecureStorageAvailable()) {
                sessionStorage.removeItem(this.tokenKey);
                sessionStorage.removeItem(this.refreshTokenKey);
                sessionStorage.removeItem(this.tokenExpiryKey);
            } else {
                localStorage.removeItem(this.tokenKey);
                localStorage.removeItem(this.refreshTokenKey);
                localStorage.removeItem(this.tokenExpiryKey);
            }

            // Clear refresh interval
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
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

    _secureStore(key, value) {
        // In secure context, sessionStorage is preferred over localStorage
        // as it's cleared when the session ends
        sessionStorage.setItem(key, value);
    }

    _secureRetrieve(key) {
        return sessionStorage.getItem(key);
    }

    // Simple encryption for localStorage (not truly secure but better than plaintext)
    _encryptAndStore(key, value) {
        if (!value) return;

        // Simple XOR encryption with a dynamic key derived from the user's browser fingerprint
        // Note: This is not cryptographically secure, just adds a layer of obscurity
        const browserKey = this._getBrowserFingerprint();
        const encrypted = this._xorEncrypt(value, browserKey);
        localStorage.setItem(key, encrypted);
    }

    _retrieveAndDecrypt(key) {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;

        const browserKey = this._getBrowserFingerprint();
        return this._xorEncrypt(encrypted, browserKey); // XOR is symmetric
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
    isAuthenticated() {
        const token = this.getToken();
        const expiry = this.getTokenExpiry();

        // Check if we have both token and expiry time
        if (!token || !expiry) {
            return false;
        }

        // Check if token is expired
        if (Date.now() >= expiry) {
            // Token expired, try to refresh
            this.refreshTokenSilently();
            return false;
        }

        return true;
    }

    checkTokenOnInit() {
        // Check if we have a valid token on initialization
        if (this.isAuthenticated()) {
            this.dispatchEvent('auth:authenticated');

            // Setup token refresh if needed
            const expiry = this.getTokenExpiry();
            if (expiry) {
                this.setupTokenRefresh(expiry);
            }
        } else {
            // We either have no token or it's expired
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
                // Try to refresh the token
                this.refreshTokenSilently();
            } else {
                this.dispatchEvent('auth:unauthenticated');
            }
        }
    }

    /**
     * Token refresh functionality
     */
    setupTokenRefresh(expiryTime) {
        // Clear any existing interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Calculate time until we should refresh (threshold before expiry)
        const now = Date.now();
        const timeUntilRefresh = expiryTime - now - this.tokenRefreshThreshold;

        if (timeUntilRefresh <= 0) {
            // Already past or very close to threshold, refresh now
            this.refreshTokenSilently();
            return;
        }

        // Set timeout to refresh just before expiry
        setTimeout(() => {
            this.refreshTokenSilently();
        }, timeUntilRefresh);
    }

    async refreshTokenSilently() {
        try {
            const refreshToken = this.getRefreshToken();
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
            this.storeTokens(token, refreshToken, expiresIn);

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
            this.clearTokens();

            // Notify system we're no longer authenticated
            this.dispatchEvent('auth:unauthenticated');

            return false;
        }
    }

    // Handle login form submission
    async handleLogin(event) {
        event.preventDefault();

        const loginForm = event.target;
        const username = loginForm.querySelector('#username').value;
        const password = loginForm.querySelector('#password').value;
        const loginError = document.getElementById('login-error');

        if (loginError) loginError.textContent = '';

        try {
            // Check if online first
            if (navigator.onLine) {
                // Get CSRF token for the login request
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
                if (!responseData.data || !responseData.data.token || !responseData.data.refreshToken || !responseData.data.expiresIn) {
                    throw new Error('Invalid response format from server');
                }

                const { token, refreshToken, expiresIn } = responseData.data;
                const userData = responseData.data.user;

                // Store the tokens
                this.storeTokens(token, refreshToken, expiresIn);

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
        try {
            // Get current token for authorization header
            const token = this.getToken();

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
            this.clearTokens();

            // Dispatch logout event
            this.dispatchEvent('auth:logout');

            // Also dispatch general unauthenticated event
            this.dispatchEvent('auth:unauthenticated');

            return true;
        } catch (error) {
            console.error('Logout error:', error);
            this.dispatchEvent('auth:error', { error });

            // If offline, still clear local auth state
            if (!navigator.onLine) {
                this.clearTokens();
                this.dispatchEvent('auth:logout');
                return true;
            }

            return false;
        }
    }

    // Handle offline authentication
    async handleOfflineAuthentication(username, password) {
        try {
            // TODO: Implement offline authentication logic
        } catch (error) {
            console.error('Offline authentication error:', error);
            return false;
        }
    }

    async getCurrentUser() {
        try {
            const token = this.getToken();

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
            return userData;
        } catch (error) {
            console.error('Error fetching current user:', error);

            // If unauthorized, clear tokens and update state
            if (error.message === 'Not authenticated' ||
                error.message === 'Failed to get user data') {
                this.clearTokens();
                this.dispatchEvent('auth:unauthenticated');
            }

            return null;
        }
    }

    /**
     * Helper to get auth header for external API calls
     */
    getAuthHeader() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * For PouchDB/CouchDB integration
     */
    getPouchDbAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
}

// Create singleton instance
const authService = new AuthService();
export default authService;