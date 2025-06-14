// auth/auth.service.js - Core authentication service with fixed circular dependencies

import connectionService from '../connection.js';
import authStorage from './auth.storage.js';
import authEvents from './auth.events.js';

class AuthService {
    constructor() {
        this.API_BASE_URL = '/api/auth';
        // Determine if running as installed PWA
        this.isPwa = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://');
        this.tokenKey = 'mycoRegister_auth_token';
        this.sessionKey = 'mycoRegister_session';
        this.userAuthenticated = false;
        this.syncOnline = false;

        // Auto-refresh token setup
        this.refreshTimeout = null;
        this.tokenRefreshThreshold = 120000; // 2 minute before expiry
    }

    async init() {
        try {
            // Initialize storage first
            await authStorage.init();
            await this.checkAuthenticationStatus();
            this.setupConnectionListeners();
        } catch (error) {
            console.error('Auth initialization failed:', error.message);
            throw error;
        }
    }

    static async create(config = {}) {
        // Prepare any data needed for constructor
        const instanceConfig = {
            // Could add any pre-computed values here
            ...config
        };
        const instance = new AuthService(instanceConfig);
        await instance.init();
        return instance;
    }

    async validStoredSession() {
        const session = await authStorage.retrieveSecurely(this.sessionKey);
        if (!session) {
            console.log('AUTH: no session found in storage');
            return null;
        }
        const validSession = session.hasOwnProperty('expiresAt') && new Date(session.expiresAt) > new Date();
        if (!validSession) {
            console.log('AUTH: expired session found in storage');
            return null;
        }
        // if (session.hasOwnProperty('rememberMe') && !session.rememberMe) {
        //     console.log('AUTH: rememberMe found in storage set to false');
        //     return null;
        // }
        return session;
    }

    async validStoredToken() {
        const { token, expiresAt } = await authStorage.retrieveSecurely(this.tokenKey);
        // Check if we have both token and expiry time
        if (!token || !expiresAt) {
            return {};
        }
        // Check if token is expired
        if (new Date(expiresAt) <= new Date()) {
            return {};
        }
        // Token is valid
        return {
            token,
            expiresAt
        };
    }

    async checkAuthenticationStatus() {
        try {
            // at startup we need to manage it differently as we don't
            // know where any session was stored
            const session = JSON.parse(await authStorage.findExistingSession(this.sessionKey));
            if (!session) {
                throw new Error('Non è stata trovata alcuna sessione precedente');
            }
            const validSession = session.hasOwnProperty('expiresAt') && new Date(session.expiresAt) > new Date();
            if (!validSession) {
                throw new Error('Non è stata trovata alcuna sessione valida');
            }
            if (session.hasOwnProperty('rememberMe')) {
                authStorage.setRememberMe(session.rememberMe);
            }
            // Valid session found
            if (!connectionService.online()) {
                // consider the user authenticated while offline
                this.emitAuthenticated();
                this.emitSyncOffline();
                console.log('AUTH: offline with valid session found, user is authenticated');
                return;
            }
            // Valid session found and online
            const { token, expiresAt } = await this.validStoredToken();
            const validRefreshToken = session.hasOwnProperty('refreshToken') && session.refreshToken && session.hasOwnProperty('refreshTokenExpiryAt') && new Date(session.refreshTokenExpiryAt) > new Date();
            if (token) {
                this.emitAuthenticated();
                this.emitSyncOnline();
                console.log('AUTH: online with valid token found, user is authenticated');
                this.setupTokenRefresh(expiresAt);
                return;
            }
            // No valid token, check if we can refresh
            if (validRefreshToken) {
                console.log('AUTH: online with no valid token found, trying to refresh token');
                await this.refreshTokenSilently();
                return;
                // refreshTokenSilently will dispatch 
                // authenticated or unauthenticated events
            }
            // valid session but no token and cannot refresh it
            if (confirm("Sei online, ma non sono state trovate credenziali valide per sincronizzare il database.\n Puoi scegliere di continuare a lavorare con una copia locale dei dati o effettuare un nuovo login.\n Vuoi effettuare un nuovo login?")) {
                this.emitUnAuthenticated();
                this.emitSyncOffline();
                await this.clearSession();
                console.log('AUTH: going to new login, clearing seesion');
                return false;
            } else {
                this.emitAuthenticated();
                this.emitSyncOffline();
                console.log('AUTH: working offline');
                return false;
            }
        } catch (error) {
            this.emitUnAuthenticated();
            this.emitSyncOffline();
            console.log(`AUTH: No valid session found [${error.message}], user is unauthenticated`);
        }
    }

    async setupConnectionListeners() {
        // Handle online state
        connectionService.on('online', async () => {
            // Connection is now online
            await this.syncOfflineAuthentication();
        });

        // Handle offline state
        connectionService.on('offline', () => {
            // Connection is now offline
            this.emitSyncOffline();
        });
    }

    async clearRefreshTimeout() {
        // Clear refresh interval
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = null;
        }
    }

    /**
     * Authentication state checking
     */
    isAuthenticated() {
        return this.userAuthenticated;
    }

    isSyncOnline() {
        return this.syncOnline;
    }

    /*
    / Provide session information for non authentication uses
    */
    async getSessionInfo() {
        try {
            const session = await authStorage.retrieveSecurely(this.sessionKey);
            if (!session) return null;
            return session;
        } catch (error) {
            console.error('Failed to retrieve remote DB name:', error);
            return null;
        }
    }

    async getToken() {
        try {
            const { token } = await authStorage.retrieveSecurely(this.tokenKey);
            if (!token) return null;
            return token;
        } catch (error) {
            console.error('Failed to retrieve token:', error);
            return null;
        }
    }

    emitAuthenticated() {
        this.userAuthenticated = true;
        authEvents.dispatch('auth:authenticated');
    }

    emitUnAuthenticated() {
        this.userAuthenticated = false;
        authEvents.dispatch('auth:unauthenticated');
    }

    emitSyncOnline() {
        this.syncOnline = true;
        authEvents.dispatch('auth:sync-online');
    }

    emitSyncOffline() {
        this.syncOnline = false;
        authEvents.dispatch('auth:sync-offline');
    }

    async clearSession() {
        // Clear session data
        await authStorage.removeSecurely(this.sessionKey);
        await authStorage.removeSecurely(this.tokenKey);
        await this.clearRefreshTimeout();
    }
    /**
     * Token refresh functionality
     */
    setupTokenRefresh(expiresAt) {
        // Clear any existing timeout
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        // Calculate time until we should refresh (threshold before expiry)
        const timeUntilRefresh = new Date(expiresAt).getTime() - Date.now() - this.tokenRefreshThreshold;

        if (timeUntilRefresh <= 0) {
            // Already past or very close to threshold, refresh soon but not immediately
            // This avoids potential recursion during initialization
            setTimeout(() => {
                this.refreshTokenSilently().catch(console.error);
            }, 100);
            return;
        }

        // Set timeout to refresh just before expiry
        this.refreshTimeout = setTimeout(() => {
            this.refreshTokenSilently().catch(console.error);
        }, timeUntilRefresh);
    }

    async refreshTokenSilently() {
        // Guard against re-entry (prevent multiple simultaneous refresh attempts)
        if (this._refreshingToken) {
            return this._refreshingTokenPromise;
        }

        // Dispatch refresh start event
        authEvents.dispatch('auth:refresh-start');

        this._refreshingToken = true;
        this._refreshingTokenPromise = (async () => {
            try {
                const session = await this.validStoredSession();
                if (!session) {
                    this.emitUnAuthenticated();
                    this.emitSyncOffline();
                    authEvents.dispatch('auth:refresh-failed', {
                        reason: 'Nessuna sessione valida disponibile'
                    });
                    console.log('Refreshing token: No valid session found, user is unauthenticated');
                    return false;
                }
                // valid session found
                if (!connectionService.online()) {
                    // cannot refresh when offline, keep the user authenticated
                    this.emitAuthenticated();
                    this.emitSyncOffline();
                    authEvents.dispatch('auth:refresh-success');
                    console.log('Refreshing token: offline with valid session found, user is authenticated');
                    return true;
                }
                // check for valid refresh token
                const validRefreshToken = session.hasOwnProperty('refreshToken') && session.refreshToken && session.hasOwnProperty('refreshTokenExpiryAt') && new Date(session.refreshTokenExpiryAt) > new Date();
                if (!validRefreshToken) {
                    this.emitUnAuthenticated();
                    this.emitSyncOffline();
                    // Dispatch refresh failed event
                    authEvents.dispatch('auth:refresh-failed', {
                        reason: 'Nessun token di aggiornamento valido disponibilie'
                    });
                    console.log('Refreshing token: no valid refresh token found, user is unauthenticated');
                    return false;
                }
                // valid refresh token found
                const response = await fetch(`${this.API_BASE_URL}/refresh-token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ refreshToken: session.refreshToken })
                });
                if (!response.ok) {
                    throw new Error('Aggiornamento token fallito');
                }
                const responseData = await response.json();
                // Check for proper response structure
                if (!responseData.data || !responseData.data.token || !responseData.data.expiresAt) {
                    throw new Error('Il server ha inviato una risposta con un formato non corretto');
                }
                const { token, expiresAt } = responseData.data;
                // Store the token
                await authStorage.storeSecurely(this.tokenKey, { token, expiresAt });
                // Notify that we've successfully refreshed
                authEvents.dispatch('auth:refresh-success', {
                    token: token,
                    expiresIn: expiresAt
                });
                this.emitAuthenticated();
                this.emitSyncOnline();
                this.setupTokenRefresh(expiresAt);
                return true;
            } catch (error) {
                await this.clearSession();
                authEvents.dispatch('auth:refresh-failed', {
                    reason: error.message
                });
                // Notify system we're no longer authenticated
                this.emitUnAuthenticated();
                this.emitSyncOffline();
                console.error('Silent token refresh failed:', error);
                return false;
            } finally {
                this._refreshingToken = false;
                this._refreshingTokenPromise = null;
            }
        })();

        return this._refreshingTokenPromise;
    }

    // Handle login form submission
    async handleLogin(username, password, rememberMe = false) {
        // Dispatch login start event
        authEvents.dispatch('auth:login-start', { username });

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
                    throw new Error(`${response.status} - Login failed`);
                }

                const responseData = await response.json();

                // Check for proper response structure
                if (!responseData.data || !responseData.data.user || !responseData.data.token || !responseData.data.refreshToken || !responseData.data.tokenExpiresAt || !responseData.data.refreshTokenExpiresAt || !responseData.data.dbName) {
                    throw new Error('Il server ha inviato una risposta con un formato non corretto');
                }

                const { token, refreshToken, tokenExpiresAt, refreshTokenExpiresAt, dbName } = responseData.data;
                const userData = responseData.data.user;

                // Store the session data
                let session = {
                    username: userData.username,
                    email: userData.email,
                    role: userData.role,
                    remoteDbName: dbName,
                    refreshToken: refreshToken,
                    refreshTokenExpiryAt: refreshTokenExpiresAt,
                    rememberMe: rememberMe,
                };
                if (rememberMe) {
                    authStorage.setRememberMe(true);
                    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
                } else {
                    authStorage.setRememberMe(false);
                    session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day
                }
                await authStorage.storeSecurely(this.sessionKey, session);
                // Store the token
                await authStorage.storeSecurely(this.tokenKey, { token, expiresAt: tokenExpiresAt });
                this.setupTokenRefresh(tokenExpiresAt);

                // Dispatch login success event
                authEvents.dispatch('auth:login-success', userData);

                // Also dispatch general authenticated event
                this.emitAuthenticated();
                this.emitSyncOnline();

                return true;
            }
            throw new Error('Impossibile effettuare il login mentre la connessione è offline.');
        } catch (error) {
            console.error('Login error:', error);

            authEvents.dispatch('auth:login-failed', {
                error: error.message,
                username
            });
            return false;
        }
    }

    // Handle logout
    async handleLogout() {
        // Dispatch logout start event
        authEvents.dispatch('auth:logout-start');

        try {
            // Only attempt to contact server if online
            if (connectionService.online()) {
                const { token } = await this.validStoredToken();
                // Call logout API to invalidate the token on server
                await fetch(`${this.API_BASE_URL}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }

            authEvents.dispatch('auth:logout-success');
            this.emitUnAuthenticated();
            this.emitSyncOffline();
            // Clear session and tokens regardless of API call success
            await this.clearSession();

            return true;
        } catch (error) {
            console.error('Logout error:', error);
            authEvents.dispatch('auth:error', { error: error.message });

            // If offline, or whatever, still clear local auth state
            this.emitUnAuthenticated();
            this.emitSyncOffline();
            // Clear session and tokens regardless of API call success
            await this.clearSession();
            // Locally the user is logged out
            authEvents.dispatch('auth:logout-success');

            return false;
        }
    }

    /**
    * Sync offline activity when returning online
    * Call this when network connectivity is restored
    */
    async syncOfflineAuthentication() {
        const session = await this.validStoredSession();
        if (!session) {
            if (this.isAuthenticated()) {
                console.log('SyncOfflineAuth: no valid session found, cannot sync offline data');
                alert("Sei online ma non sono state trovate credenziali valide per sincronizzare il database.\n Effettua un nuovo login.");
                this.emitUnAuthenticated();
                this.emitSyncOffline();
                this.clearSession();
            }
            return false;
        } else {
            if (!connectionService.online()) {
                // working offline, nothing to sync
                this.emitSyncOffline();
                console.log('SyncOfflineAuth: working offline, nothing to sync');
                return true;
            } else {
                const { token, expiresAt } = await this.validStoredToken();
                const validRefreshToken = session.hasOwnProperty('refreshToken') && session.refreshToken && session.hasOwnProperty('refreshTokenExpiryAt') && new Date(session.refreshTokenExpiryAt) > new Date();
                if (token) {
                    console.log('SyncOfflineAuth: found token, user is authenticated');
                    this.emitAuthenticated();
                    this.emitSyncOnline();
                    this.setupTokenRefresh(expiresAt);
                    return true;
                }
                // No valid token, check if we can refresh
                if (validRefreshToken) {
                    console.log('SyncOfflineAuth: online with no valid token found, trying to refresh token');
                    const res = await this.refreshTokenSilently();
                    if (res) {
                        console.log('SyncOfflineAuth: successfully refreshed token');
                        return true;
                    }
                }
                // valid session but cannot refresh token
                if (confirm("Sei online, ma non sono state trovate credenziali valide per sincronizzare il database.\n Puoi scegliere di continuare a lavorare con una copia locale dei dati o effettuare un nuovo login.\n Vuoi effettuare un nuovo login?")) {
                    this.emitUnAuthenticated();
                    this.emitSyncOffline();
                    await this.clearSession();
                    console.log('SyncOfflineAuth: going to new login, clearing seesion');
                    return false;
                } else {
                    this.emitSyncOffline();
                    console.log('SyncOfflineAuth: working offline');
                    return false;
                }
            }
        }
    }

    async getCurrentUser() {
        try {
            // If online and we have a token, verify from server
            if (connectionService.online()) {
                const { token } = await this.validStoredToken();
                if (token) {
                    try {
                        const response = await fetch(`${this.API_BASE_URL}/me`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        if (response.ok) {
                            const serverData = await response.json();

                            if (serverData && serverData.data) {
                                return serverData.data.user;
                            }
                        } else {
                            // If unauthorized, trigger proper handling
                            if (response.status === 401) {
                                console.warn('Unauthorized access, clearing session');
                                this.emitUnAuthenticated();
                                this.emitSyncOffline();
                                this.clearSession();
                                return null;
                            }
                            const error = (await response.json()).message;
                            throw new Error(`${response.status} - ${error}`);
                        }
                    } catch (fetchError) {
                        console.warn('Error fetching user data from server:', fetchError);
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Error in getCurrentUser:', error);
            return null;
        }
    }

    async changePassword(username, oldPassword, newPassword) {
        try {
            // If online and we have a token, verify from server
            if (connectionService.online()) {
                const { token } = await this.validStoredToken();
                if (token) {
                    try {
                        const response = await fetch(`${this.API_BASE_URL}/change-password`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                username: username,
                                currentPassword: oldPassword,
                                newPassword: newPassword
                            })
                        });
                        if (response.ok) {
                            return true;
                        } else {
                            // If unauthorized, trigger proper handling
                            if (response.status === 401) {
                                console.warn('Unauthorized access, clearing session');
                                this.emitUnAuthenticated();
                                this.emitSyncOffline();
                                this.clearSession();
                                throw new Error('Unauthorized access, session cleared');
                            }
                            const error = (await response.json()).message;
                            throw new Error(`${response.status} - ${error}`);
                        }
                    } catch (fetchError) {
                        console.warn('Error fetching user data from server:', fetchError);
                        throw fetchError;
                    }
                }
                throw new Error('No valid token found.');
            }
            throw new Error('Cannot change password while offline.');
        } catch (error) {
            console.error('Error in changePassword:', error.message);
            throw error;
        }
    }
}

// Create singleton instance
const authService = await AuthService.create();
console.log('AuthService initialized');

// Module exports
export default authService;