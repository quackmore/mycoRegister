// auth.js - Authentication service for managing user sessions

class AuthService {
    constructor() {
        // State
        this.authenticated = false;
        this.username = null;
        this._couchdb = null;
        this.sub = null;
        this.exp = null;

        // Event handling
        this.eventTarget = new EventTarget();

        this.refreshTimer = null;

        // Initialize
        this.init();
    }

    init() {
        // Check authentication status on load
        this.checkAuthStatus();

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

    // Get CSRF token from cookie
    getCsrfToken() {
        // Try to get from non-HttpOnly cookie
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrf_token_exposed='))
            ?.split('=')[1];
      
        if (cookieValue) {
            return cookieValue;
        }
      
        // If no cookie found, fetch from API endpoint
        return this.fetchCsrfToken();
    }
    
    // Fetch CSRF token from API endpoint if needed
    async fetchCsrfToken() {
        try {
            const response = await fetch('/api/csrf-token');
            const data = await response.json();
            return data.csrfToken;
        } catch (error) {
            console.error('Failed to fetch CSRF token:', error);
            return null;
        }
    }

    // Check if user is already authenticated
    async checkAuthStatus() {
        try {
            // Try to get auth status from server
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                // User is authenticated
                const data = await response.json();
                this.authenticated = true;
                this.username = data.username;
                this._couchdb = data._couchdb;
                this.sub = data.sub;
                this.exp = data.exp;

                // Dispatch authentication event
                this.dispatchEvent('auth:authenticated', { 
                    username: data.username,
                    _couchdb: data._couchdb,
                    sub: data.sub,
                    exp: data.exp
                });
                
                // Schedule token refresh (access token expires in 30m as per server config)
                this.scheduleTokenRefresh();
                return true;
            } else if (response.status === 401) {
                // Try to refresh token if unauthorized
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Retry verify after refresh
                    return this.checkAuthStatus();
                } else {
                    this.resetAuthState();
                    this.dispatchEvent('auth:unauthenticated');
                    return false;
                }
            } else {
                this.resetAuthState();
                this.dispatchEvent('auth:unauthenticated');
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);

            // If offline, try to use stored credentials
            if (!navigator.onLine) {
                const hasStoredAuth = this.checkStoredAuthStatus();
                if (hasStoredAuth) {
                    this.dispatchEvent('auth:offline-authenticated');
                    return true;
                }
            }

            this.resetAuthState();
            this.dispatchEvent('auth:error', { error });
            return false;
        }
    }

    // Schedule token refresh before expiry (5 minutes before the 30-minute expiry)
    scheduleTokenRefresh() {
        // Clear any existing timer
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        
        // Access tokens last 30 minutes; refresh 5 minutes before expiry
        const refreshInterval = 25 * 60 * 1000; // 25 minutes
        this.refreshTimer = setTimeout(() => {
            this.refreshAccessToken();
        }, refreshInterval);
    }

    // Refresh access token using /refresh endpoint
    async refreshAccessToken() {
        try {
            // Get CSRF token for the refresh request
            const csrfToken = await this.getCsrfToken();
            
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRF-Token': csrfToken
                }
            });
            
            if (response.ok) {
                this.dispatchEvent('auth:token-refreshed');
                // Schedule next refresh
                this.scheduleTokenRefresh();
                return true;
            } else {
                this.resetAuthState();
                this.dispatchEvent('auth:session-expired');
                return false;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.resetAuthState();
            this.dispatchEvent('auth:error', { error });
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
                const csrfToken = await this.getCsrfToken();
                
                // Online login
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();

                    // Store auth status for offline use
                    this.storeAuthStatus(username);
                    // Store credentials hash for offline auth
                    await this.storeOfflineCredentials(username, password);

                    // Verify authentication to get user details
                    const verifyResponse = await fetch('/api/auth/verify', {
                        method: 'GET'
                    });

                    if (verifyResponse.ok) {
                        const userData = await verifyResponse.json();
                        // Update state
                        this.authenticated = true;
                        this.username = userData.username;
                        this._couchdb = userData._couchdb;
                        this.sub = userData.sub;
                        this.exp = userData.exp;

                        // Dispatch event with complete user data
                        this.dispatchEvent('auth:login-success', { 
                            username: userData.username,
                            _couchdb: userData._couchdb,
                            sub: userData.sub,
                            exp: userData.exp
                        });

                        // Schedule token refresh
                        this.scheduleTokenRefresh();
                    } else {
                        // Still dispatch login success but with limited data
                        this.authenticated = true;
                        this.username = username;
                        this.dispatchEvent('auth:login-success', { username });
                        this.scheduleTokenRefresh();
                    }

                    return true;
                } else {
                    let error = { error: 'Login failed' };
                    try {
                        error = await response.json();
                    } catch (e) {
                        // If response is not JSON
                    }
                    
                    this.resetAuthState();

                    if (loginError) {
                        loginError.textContent = error.error || 'Login failed';
                    }

                    this.dispatchEvent('auth:login-failed', { error: error.error });
                    return false;
                }
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
            // Get CSRF token for the logout request
            const csrfToken = await this.getCsrfToken();
            
            // Call logout endpoint
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRF-Token': csrfToken
                }
            });

            this.resetAuthState();
            this.clearStoredAuth();

            this.dispatchEvent('auth:logout');

            return true;
        } catch (error) {
            console.error('Logout error:', error);
            this.dispatchEvent('auth:error', { error });

            // If offline, still clear local auth state
            if (!navigator.onLine) {
                this.resetAuthState();
                this.clearStoredAuth();
                this.dispatchEvent('auth:logout');
                return true;
            }

            return false;
        }
    }

    // Check if stored credentials exist for offline login
    checkStoredAuthStatus() {
        const storedAuth = localStorage.getItem('auth_status');
        if (storedAuth) {
            try {
                const authData = JSON.parse(storedAuth);
                this.authenticated = true;
                this.username = authData.username;
                this._couchdb = authData._couchdb || null;
                this.sub = authData.sub || null;
                this.exp = authData.exp || null;
                return true;
            } catch (e) {
                console.error('Failed to parse stored auth data:', e);
                return false;
            }
        }
        return false;
    }

    // Handle offline authentication
    async handleOfflineAuthentication(username, password) {
        try {
            const storedCredHash = localStorage.getItem('auth_cred_hash');

            if (!storedCredHash) {
                return false; // No stored credentials
            }

            // Create a simple hash of the credentials
            const inputHash = await this.simpleHash(`${username}:${password}`);

            // Compare hashes
            if (inputHash === storedCredHash) {
                // Offline authentication successful
                this.authenticated = true;
                this.username = username;
                
                // Try to load additional user data if available
                const storedAuth = localStorage.getItem('auth_status');
                if (storedAuth) {
                    try {
                        const authData = JSON.parse(storedAuth);
                        this._couchdb = authData._couchdb || null;
                        this.sub = authData.sub || null;
                        this.exp = authData.exp || null;
                    } catch (e) {
                        console.error('Failed to parse stored auth data:', e);
                    }
                }
                
                return true;
            }

            return false;
        } catch (error) {
            console.error('Offline authentication error:', error);
            return false;
        }
    }

    // Store authentication status for offline use
    storeAuthStatus(username) {
        localStorage.setItem('auth_status', JSON.stringify({
            username,
            _couchdb: this._couchdb,
            sub: this.sub,
            exp: this.exp
        }));
    }

    // Store authentication credentials for offline use
    async storeOfflineCredentials(username, password) {
        try {
            // Create a simple hash of the credentials
            const credHash = await this.simpleHash(`${username}:${password}`);

            // Store the hash
            localStorage.setItem('auth_cred_hash', credHash);
        } catch (error) {
            console.error('Failed to store offline credentials:', error);
        }
    }

    // Reset authentication state
    resetAuthState() {
        this.authenticated = false;
        this.username = null;
        this._couchdb = null;
        this.sub = null;
        this.exp = null;
        
        // Clear refresh timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    // Clear stored authentication data
    clearStoredAuth() {
        localStorage.removeItem('auth_status');
        // Optionally, you might want to keep the credential hash for future offline logins
        // localStorage.removeItem('auth_cred_hash');
    }

    // Get current authentication status
    isAuthenticated() {
        return this.authenticated;
    }

    // Get current username
    getCurrentUsername() {
        return this.username;
    }
    
    // Get user _couchdb
    getUser_couchdb() {
        return this._couchdb;
    }
    
    // Get CouchDB user ID
    getsub() {
        return this.sub;
    }

    // Simple hash function - replace with proper crypto in production
    async simpleHash(str) {
        // This is a very basic hash function for example purposes only
        // In a real app, use SubtleCrypto API or a proper crypto library
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }
}

// Create and export singleton instance
const authService = new AuthService();
window.authService = authService;
export default authService;