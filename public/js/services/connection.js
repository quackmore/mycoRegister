/**
 * OnlineService - Browser connectivity detection with API health checks
 * Emits 'online', 'offline', and 'checking' events based on actual connectivity
 */
class OnlineService {
  constructor(options = {}) {
    // Prevent multiple instances
    if (OnlineService.instance) {
      return OnlineService.instance;
    }

    OnlineService.instance = this;

    this.healthEndpoint = options.healthEndpoint || '/api/health';
    this.initialRetryInterval = options.initialRetryInterval || 30000; // 30s
    this.maxRetryInterval = options.maxRetryInterval || 300000; // 5min
    this.checkTimeout = options.checkTimeout || 3000; // 3s

    this.isChecking = false;
    this.retryCount = 0;
    this.currentStatus = null;
    this.checkTimer = null;

    // Event handlers
    this.eventHandlers = {
      'online': [],
      'offline': [],
      'checking': []
    };

    // Set up window online/offline event listeners
    window.addEventListener('online', () => this.checkConnection());
    window.addEventListener('offline', () => this.emitOffline());

    // Initial check
    this.checkConnection();
  }

  /**
   * Check the actual connection status by fetching the health endpoint
   */
  async checkConnection() {
    if (this.isChecking) return;

    this.isChecking = true;
    this.emit('checking');

    // Quick check for navigator.onLine - fail fast
    if (!navigator.onLine) {
      this.emitOffline();
      this.scheduleRetry();
      this.isChecking = false;
      return;
    }

    try {
      const response = await fetch(this.healthEndpoint, {
        method: 'HEAD',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(this.checkTimeout)
      });

      if (response.ok) {
        this.emitOnline();
        this.retryCount = 0; // Reset retry counter on success
      } else {
        this.emitOffline();
        this.scheduleRetry();
      }
    } catch (error) {
      this.emitOffline();
      this.scheduleRetry();
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Schedule a retry with exponential backoff
   */
  scheduleRetry() {
    this.retryCount++;

    // Clear any existing timer
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
    }

    const delay = Math.min(
      this.initialRetryInterval * Math.pow(2, this.retryCount - 1),
      this.maxRetryInterval
    );

    this.checkTimer = setTimeout(() => this.checkConnection(), delay);
  }

  /**
   * Emit an online event
   */
  emitOnline() {
    if (this.currentStatus !== 'online') {
      this.currentStatus = 'online';
      this.emit('online');
    }
  }

  /**
   * Emit an offline event
   */
  emitOffline() {
    if (this.currentStatus !== 'offline') {
      this.currentStatus = 'offline';
      this.emit('offline');
    }
  }

  /**
   * Public method to manually check connection status
   */
  check() {
    this.checkConnection();
  }

  /**
   * Public method to get current online status
   * @returns {boolean} True if online, false if offline
   */
  online() {
    return this.currentStatus === 'online';
  }

  /**
   * Add an event listener
   * @param {string} event - Event name ('online', 'offline', 'checking')
   * @param {Function} callback - Function to call when event occurs
   */
  on(event, callback) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(callback);
    }
    return this; // Allow chaining
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Function to remove
   */
  off(event, callback) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(
        handler => handler !== callback
      );
    }
    return this; // Allow chaining
  }

  /**
   * Emit an event
   * @param {string} event - Event name to emit
   */
  emit(event) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler();
        } catch (e) {
          console.error(`Error in ${event} event handler:`, e);
        }
      });
    }
  }
}

// Create and export a singleton instance
const connectionService = new OnlineService();
console.log('ConnectionService initialized');

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = connectionService;
  module.exports.OnlineService = OnlineService; // Also export class for custom instances
} else if (typeof window !== 'undefined') {
  window.connectionService = connectionService;
}