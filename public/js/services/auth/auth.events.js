// auth/auth.events.js - Centralized event management for authentication

/**
 * Authentication events module
 * Provides a centralized system for event dispatching and subscription
 */
class AuthEvents {
    constructor() {
        // Create event target for event handling
        this.eventTarget = new EventTarget();
        
        // For event history/logging
        this.eventHistory = [];
        this.maxHistorySize = 50; // Keep last 50 events
        this.eventLoggingEnabled = false;
        
        // Standard event types
        this.eventTypes = {
            // Authentication state
            AUTHENTICATED: 'auth:authenticated',
            UNAUTHENTICATED: 'auth:unauthenticated',
            
            // Login events
            LOGIN_START: 'auth:login-start',
            LOGIN_SUCCESS: 'auth:login-success',
            LOGIN_FAILED: 'auth:login-failed',
            
            // Logout events
            LOGOUT_START: 'auth:logout-start',
            LOGOUT_SUCCESS: 'auth:logout-success',
            
            // Token refresh events
            REFRESH_START: 'auth:refresh-start',
            REFRESH_SUCCESS: 'auth:refresh-success',
            REFRESH_FAILED: 'auth:refresh-failed',
            
            // User events
            USER_UPDATED: 'auth:user-updated',
            
            // sync mode events
            SYNC_ONLINE: 'auth:sync-online',
            SYNC_OFFLINE: 'auth:sync-offline',
            
            // Registration/verification events
            REGISTRATION_START: 'auth:registration-start',
            REGISTRATION_SUCCESS: 'auth:registration-success',
            REGISTRATION_FAILED: 'auth:registration-failed',
            VERIFICATION_START: 'auth:verification-start',
            VERIFICATION_SUCCESS: 'auth:verification-success',
            VERIFICATION_FAILED: 'auth:verification-failed',
            
            // Password events
            PASSWORD_RESET_START: 'auth:password-reset-start',
            PASSWORD_RESET_SUCCESS: 'auth:password-reset-success',
            PASSWORD_RESET_FAILED: 'auth:password-reset-failed',
            PASSWORD_CHANGE_SUCCESS: 'auth:password-change-success',
            PASSWORD_CHANGE_FAILED: 'auth:password-change-failed',
            
            // General error
            ERROR: 'auth:error'
        };
    }
    
    /**
     * Add an event listener
     * @param {string} eventType - Event type to listen for
     * @param {Function} callback - Callback function
     */
    on(eventType, callback) {
        this.eventTarget.addEventListener(eventType, callback);
    }
    
    /**
     * Add a one-time event listener
     * @param {string} eventType - Event type to listen for
     * @param {Function} callback - Callback function
     */
    once(eventType, callback) {
        const onceWrapper = (event) => {
            this.eventTarget.removeEventListener(eventType, onceWrapper);
            callback(event);
        };
        
        this.eventTarget.addEventListener(eventType, onceWrapper);
    }
    
    /**
     * Remove an event listener
     * @param {string} eventType - Event type
     * @param {Function} callback - Callback function to remove
     */
    off(eventType, callback) {
        this.eventTarget.removeEventListener(eventType, callback);
    }
    
    /**
     * Dispatch an event
     * @param {string} eventType - Event type to dispatch
     * @param {Object} detail - Event details
     */
    dispatch(eventType, detail = {}) {
        // Add timestamp to event
        const eventDetail = {
            ...detail,
            timestamp: new Date().toISOString()
        };
        
        // Create and dispatch the event
        const event = new CustomEvent(eventType, { detail: eventDetail });
        this.eventTarget.dispatchEvent(event);
        
        // Log the event if enabled
        if (this.eventLoggingEnabled) {
            this._logEvent(eventType, eventDetail);
        }
    }
    
    /**
     * Enable event history logging
     * @param {boolean} enable - Whether to enable event logging
     * @param {number} maxSize - Maximum number of events to store in history
     */
    enableEventLogging(enable = true, maxSize = 50) {
        this.eventLoggingEnabled = enable;
        
        if (maxSize > 0) {
            this.maxHistorySize = maxSize;
        }
        
        // Clear history if disabling
        if (!enable) {
            this.clearEventHistory();
        }
    }
    
    /**
     * Clear the event history
     */
    clearEventHistory() {
        this.eventHistory = [];
    }
    
    /**
     * Get the event history
     * @returns {Array} - Array of logged events
     */
    getEventHistory() {
        return [...this.eventHistory];
    }
    
    /**
     * Filter event history by type
     * @param {string} eventType - Event type to filter by
     * @returns {Array} - Filtered event history
     */
    getEventHistoryByType(eventType) {
        return this.eventHistory.filter(event => event.type === eventType);
    }
    
    /**
     * Get events within a time range
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {Array} - Events within the time range
     */
    getEventsByTimeRange(startTime, endTime) {
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        
        return this.eventHistory.filter(event => {
            const eventTime = new Date(event.timestamp).getTime();
            return eventTime >= start && eventTime <= end;
        });
    }
    
    /**
     * Log an event to the history
     * @param {string} type - Event type
     * @param {Object} detail - Event details
     * @private
     */
    _logEvent(type, detail) {
        // Add to history
        this.eventHistory.push({
            type,
            detail,
            timestamp: detail.timestamp || new Date().toISOString()
        });
        
        // Trim history if needed
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }
}

// Create singleton instance
const authEvents = new AuthEvents();
export default authEvents;