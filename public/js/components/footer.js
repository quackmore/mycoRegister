// Footer component
const Footer = {
    // Initialize footer
    init: function() {
      const footerContainer = document.getElementById('footer-container');
      if (!footerContainer) return;
      
      // Create footer content
      const footer = document.createElement('footer');
      footer.className = 'app-footer';
      footer.innerHTML = `
        <div class="footer-content">
          <div class="copyright">
            <p>Made by <a href="https://github.com/quackmore">quackmore</a> with <a href="https://claude.ai">claude.ai</a></p>
          </div>
          <div class="connection-status">
            <span id="sync-status" class="sync-status">
              <span class="status-text"></span>
            </span>
            <span id="connection-indicator" class="online">Online</span>
            <button id="logout-btn" class="btn secondary">Logout</button>
          </div>
        </div>
      `;
      
      // Insert footer into container
      footerContainer.appendChild(footer);
      
      // Initialize connection status
      this.initConnectionStatus();
    },
    
    initConnectionStatus: function() {
      const connectionIndicator = document.getElementById('connection-indicator');
      if (!connectionIndicator) return;
    
      const testUrl = '/api/status';
      let isChecking = false;
      let retryCount = 0;
      const maxRetryInterval = 300000; // 5 minutes
      const initialRetryInterval = 30000; // Start with 30s
    
      const updateStatus = async () => {
        connectionIndicator.textContent = 'Checking...';
        connectionIndicator.className = 'checking';
    
        // Immediate offline detection
        if (!navigator.onLine) {
          setOffline();
          return;
        }
    
        if (isChecking) return;
        isChecking = true;
    
        try {
          const response = await fetch(testUrl, {
            method: 'HEAD',
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
            signal: AbortSignal.timeout(3000)
          });
    
          // Successful contact with host
          retryCount = 0; // Reset counter on success
          setOnline();
          
        } catch (error) {
          retryCount++;
          const delay = Math.min(
            initialRetryInterval * Math.pow(2, retryCount - 1),
            maxRetryInterval
          );
    
          if (error.name === 'AbortError') {
            connectionIndicator.textContent = `Timeout (Retrying in ${delay/1000}s)`;
          } else {
            setOffline();
          }
    
          // Schedule retry with backoff
          setTimeout(() => {
            if (navigator.onLine) updateStatus();
          }, delay);
          
        } finally {
          isChecking = false;
        }
      };
    
      const setOnline = () => {
        connectionIndicator.textContent = 'Online';
        connectionIndicator.className = 'online';
      };
    
      const setOffline = () => {
        connectionIndicator.textContent = 'Offline';
        connectionIndicator.className = 'offline';
      };
    
      // Initial check
      updateStatus();
    
      // Event listeners
      window.addEventListener('online', () => {
        retryCount = 0; // Reset counter when connection resumes
        updateStatus();
      });
    
      window.addEventListener('offline', () => {
        retryCount = 0; // Reset counter on manual disconnection
        setOffline();
      });
    
      // Regular background polling (independent of retry mechanism)
      const poll = () => {
        updateStatus().finally(() => {
          // FIXME: uncomment the following
          // setTimeout(poll, initialRetryInterval); // Base 30s interval
        });
      };
      poll();
    }
    
  };
  
  // Initialize footer when the DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    Footer.init();
  });