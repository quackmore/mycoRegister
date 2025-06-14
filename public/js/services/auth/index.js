// auth/index.js
// just for easy loading of main auth modules

import authService from './auth.service.js';
import authStorage from './auth.storage.js';
import authEvents from './auth.events.js';
// auth.password, auth.registration and auth.users are dynamically imported in the components

// Export only main modules
export default {
    authService,
    authStorage,
    authEvents,
};