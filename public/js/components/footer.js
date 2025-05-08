// Footer component

const Footer = {
  // Initialize footer
  init: function () {
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

  initConnectionStatus: function () {
    const connectionIndicator = document.getElementById('connection-indicator');
    if (!connectionIndicator) return;

    connectionService.on('online', () => {
      connectionIndicator.textContent = 'Online';
      connectionIndicator.className = 'online';
    });

    connectionService.on('offline', () => {
      connectionIndicator.textContent = 'Offline';
      connectionIndicator.className = 'offline';
    });

    connectionService.on('checking', () => {
      connectionIndicator.textContent = 'Checking...';
      connectionIndicator.className = 'checking';
    });
  }
};

// Initialize footer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Footer.init();
  console.log('Footer initialized');
});