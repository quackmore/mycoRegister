import connectionService from './connection.js';
import authService from './auth/auth.service.js';

const API_BASE_URL = '/api/admin';

const addAllowedEmail = async (email, notes) => {
    try {
        // Only attempt to contact server if online
        if (!connectionService.online()) {
            throw new Error('Impossibile aggiungere email autorizzate mentre la connessione è offline.');
        }
        const { token } = await authService.validStoredToken();
        if (!token) {
            throw new Error('No valid token found.');
        }
        const response = await fetch(`${API_BASE_URL}/allowed`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email, notes
            })
        });
        if (response.ok) {
            return true;
        }
        const error = (await response.json()).message || 'Unknown error';
        throw new Error(`${response.status} - ${error}`);
    } catch (error) {
        console.error('Error in addAllowedEmail:', error.message);
        throw error;
    }
}

const getAllowedEmails = async () => {
    try {
        // Only attempt to contact server if online
        if (!connectionService.online()) {
            throw new Error('Impossibile recuperare email autorizzate mentre la connessione è offline.');
        }
        const { token } = await authService.validStoredToken();
        if (!token) {
            throw new Error('No valid token found.');
        }
        const response = await fetch(`${API_BASE_URL}/allowed`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            return await response.json();
        }
        const error = (await response.json()).message || 'Unknown error';
        throw new Error(`${response.status} - ${error}`);
    } catch (error) {
        console.error('Error in getAllowedEmails:', error.message);
        throw error;
    }
}

const removeAllowedEmail = async (email) => {
    try {
        // Only attempt to contact server if online
        if (!connectionService.online()) {
            throw new Error('Impossibile rimuovere email autorizzate mentre la connessione è offline.');
        }
        const { token } = await authService.validStoredToken();
        if (!token) {
            throw new Error('No valid token found.');
        }
        const response = await fetch(`${API_BASE_URL}/allowed/${encodeURIComponent(email)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            return true;
        }
        const error = (await response.json()).message || 'Unknown error';
        throw new Error(`${response.status} - ${error}`);
    } catch (error) {
        console.error('Error in removeAllowedEmail:', error.message);
        throw error;
    }
}

const updateAllowedEmail = async (email, newEmail, notes) => {
    try {
        // Only attempt to contact server if online
        if (!connectionService.online()) {
            throw new Error('Impossibile aggiornare email autorizzate mentre la connessione è offline.');
        }
        const { token } = await authService.validStoredToken();
        if (!token) {
            throw new Error('No valid token found.');
        }
        const response = await fetch(`${API_BASE_URL}/allowed/${encodeURIComponent(email)}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                newEmail,
                notes
            })
        });
        if (response.ok) {
            return true;
        }
        const error = (await response.json()).message || 'Unknown error';
        throw new Error(`${response.status} - ${error}`);
    } catch (error) {
        console.error('Error in updateAllowedEmail:', error.message);
        throw error;
    }
}

const setUserAdminStatus = async (email, isAdmin) => {
    try {
        // Only attempt to contact server if online
        if (!connectionService.online()) {
            throw new Error('Impossibile modificare il ruolo di un utente mentre la connessione è offline.');
        }
        const { token } = await authService.validStoredToken();
        if (!token) {
            throw new Error('No valid token found.');
        }
        const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(email)}/admin-status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                isAdmin
            })
        });
        if (response.ok) {
            return true;
        }
        const error = (await response.json()).message || 'Unknown error';
        throw new Error(`${response.status} - ${error}`);
    } catch (error) {
        console.error('Error in setUserAdminStatus:', error.message);
        throw error;
    }
}

const getAdminUsers = async () => {
    try {
        // Only attempt to contact server if online
        if (!connectionService.online()) {
            throw new Error('Impossibile recuperare la lista degli admin mentre la connessione è offline.');
        }
        const { token } = await authService.validStoredToken();
        if (!token) {
            throw new Error('No valid token found.');
        }
        const response = await fetch(`${API_BASE_URL}/users/admins`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            return await response.json();
        }
        const error = (await response.json()).message || 'Unknown error';
        throw new Error(`${response.status} - ${error}`);
    } catch (error) {
        console.error('Error in getAdminUsers:', error.message);
        throw error;
    }
}

export {
    addAllowedEmail,
    getAllowedEmails,
    removeAllowedEmail,
    updateAllowedEmail,
    setUserAdminStatus,
    getAdminUsers
};