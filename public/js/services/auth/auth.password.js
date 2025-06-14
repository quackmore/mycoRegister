import connectionService from '../connection.js';
import authEvents from './auth.events.js';

const API_BASE_URL = '/api/auth';

const passwordReset = async (email) => {
    // Dispatch logout start event
    authEvents.dispatch('auth:password-reset-start');

    try {
        // Only attempt to contact server if online
        if (connectionService.online()) {
            // Call logout API to invalidate the token on server
            await fetch(`${API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email })
            });
            authEvents.dispatch('auth:password-reset-success', { message: 'Richiesta reset password accettata. Controlla la tua posta.' });
            return true;
        } else {
            authEvents.dispatch('auth:password-reset-failed', { error: 'Richiesta reset password fallita. Non sei online.' });
            return false;
        }
    } catch (error) {
        authEvents.dispatch('auth:password-reset-success', { message: 'Richiesta reset password accettata. Controlla la tua posta.' });
        return true;
    }
}

const changePassword = async (session) => {
    console.log('Changing password for user:', session.username);
}

// Module exports
export {
    passwordReset,
    changePassword
};