import connectionService from '../connection.js';
import authEvents from './auth.events.js';

class AuthRegistration {
    constructor() {
        this.API_BASE_URL = '/api/auth';
    }

    async handleRegistration(name, email, password) {
        // Dispatch logout start event
        authEvents.dispatch('auth:registration-start');

        try {
            // Only attempt to contact server if online
            if (connectionService.online()) {
                // Call logout API to invalidate the token on server
                const response = await fetch(`${this.API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: name,
                        email: email,
                        password: password
                    })
                });
                const msg = (await response.json()).message;
                if (response.status === 201) {
                    authEvents.dispatch('auth:registration-success', { message: msg });
                    return true;
                }
                else {
                    authEvents.dispatch('auth:registration-failed', { error: msg });
                    return false;
                }
            } else {
                authEvents.dispatch('auth:registration-failed', { error: 'Richiesta registrazione fallita. Non sei online.' });
                return false;
            }
        } catch (error) {
            console.error('Registration error:', error);
            authEvents.dispatch('auth:registration-failed', { error: error.message });
            return true;
        }
    }
}

// Module exports
export default AuthRegistration;