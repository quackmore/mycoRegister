/**
 * OnlineService - Browser connectivity detection with API health checks
 * Emits 'online' and 'offline' events based on actual connectivity
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

    // New polling option for background checks when online
    this.pollingInterval = options.pollingInterval || 60000; // 1min default
    this.pollingEnabled = options.pollingEnabled !== undefined ? options.pollingEnabled : true;
    this.pollingTimer = null;

    this.retryCount = 0;
    this.currentStatus = navigator.onLine ? 'online' : 'offline';
    this.checkTimer = null;

    // Event handlers
    this.eventHandlers = {
      'online': [],
      'offline': []
    };

    // Set up window online/offline event listeners with scoped references
    this._onOnlineHandler = () => this.checkConnection();
    this._onOfflineHandler = () => this.emitOffline();
    window.addEventListener('online', this._onOnlineHandler);
    window.addEventListener('offline', this._onOfflineHandler);

    // Initial check
    this.checkConnection();
  }

  async fetchHealthApi() {
    return fetch(this.healthEndpoint, {
      method: 'HEAD',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(this.checkTimeout)
    });
  }

  /**
   * Check the actual connection status by fetching the health endpoint
   */
  async checkConnection() {
    // Quick check for navigator.onLine - fail fast
    if (!navigator.onLine) {
      this.emitOffline();
      this.scheduleRetry();
      return;
    }

    try {
      const response = await this.fetchHealthApi();
      if (response.ok) {
        this.emitOnline();
        this.retryCount = 0; // Reset retry counter on success
        this.startPolling(); // Start background polling on success
      } else {
        this.emitOffline();
        this.scheduleRetry();
      }
    } catch (error) {
      this.emitOffline();
      this.scheduleRetry();
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

    // Stop any background polling when offline
    this.stopPolling();
  }

  /**
   * Start background polling to detect API outages while online
   */
  startPolling() {
    // Don't start polling if it's disabled
    if (!this.pollingEnabled) return;

    // Clear any existing polling timer
    this.stopPolling();

    // Set up new polling timer
    this.pollingTimer = setInterval(() => {
      // Only run check if we're not already checking and we're in online state
      if (!this.isChecking && this.currentStatus === 'online') {
        this.checkConnection();
      }
    }, this.pollingInterval);
  }

  /**
   * Stop background polling
   */
  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
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

      // Ensure polling is stopped when going offline
      this.stopPolling();
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
    if (navigator.onLine === false) {
      return false;
    }
    return this.currentStatus === 'online';
  }

  /**
   * Enable or disable background polling
   * @param {boolean} enabled - Whether polling should be enabled
   */
  setPolling(enabled) {
    this.pollingEnabled = !!enabled;

    if (enabled && this.currentStatus === 'online') {
      this.startPolling();
    } else {
      this.stopPolling();
    }

    return this; // Allow chaining
  }

  /**
   * Update polling interval
   * @param {number} interval - New interval in milliseconds
   */
  setPollingInterval(interval) {
    if (typeof interval !== 'number' || interval < 1000) {
      throw new Error('Polling interval must be a number >= 1000ms');
    }

    this.pollingInterval = interval;

    // Restart polling with new interval if active
    if (this.pollingTimer && this.pollingEnabled) {
      this.startPolling();
    }

    return this; // Allow chaining
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
   * Remove all event listeners
   * @param {string} [event] - Optional event name to clear only specific event
   */
  offAll(event) {
    if (event && this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    } else if (!event) {
      for (const evt in this.eventHandlers) {
        this.eventHandlers[evt] = [];
      }
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

  /**
   * Clean up resources - call before disposing
   */
  destroy() {
    this.stopPolling();
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
    }

    // Use properly scoped functions for event listener removal
    window.removeEventListener('online', this._onOnlineHandler || (() => { }));
    window.removeEventListener('offline', this._onOfflineHandler || (() => { }));

    this.offAll();

    if (OnlineService.instance === this) {
      OnlineService.instance = null;
    }
  }
}

// Create and export a singleton instance
const connectionService = new OnlineService();
console.log('ConnectionService initialized');
export default connectionService;