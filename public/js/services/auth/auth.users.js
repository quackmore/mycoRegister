import connectionService from '../connection.js';
import authService from './auth.service.js';

const API_BASE_URL = '/api/user';

/**
 * Delete user account
 * @param {Object} session - Current session data
 * @returns {Promise<boolean>} - Whether delete was successful
 */
const deleteAccount = async (session, password) => {
    try {
        // Only attempt to contact server if online
        if (!connectionService.online()) {
            throw new Error('Impossibile rimuovere un account mentre la connessione è offline.');
        }
        const { token } = await authService.validStoredToken();
        if (!token) {
            throw new Error('No valid token found.');
        }
        const response = await fetch(`${API_BASE_URL}/account`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: session.username,
                password: password
            })
        });
        if (response.ok) {
            return true;
        }
        const error = (await response.json()).message;
        throw new Error(`${response.status} - ${error}`);
    } catch (error) {
        console.error('Error in deleteAccount:', error.message);
        throw error;
    }
}

export {
    deleteAccount
};