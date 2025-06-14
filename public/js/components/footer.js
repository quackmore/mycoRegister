// Footer component
import connectionService from '../services/connection.js';
import authEvents from '../services/auth/auth.events.js';
import authService from '../services/auth/auth.service.js';
import { APP_VERSION } from '../../app-version.js';

async function showUserProfile() {
  const { userProfileModal } = await import('./userProfileModal.js');
  userProfileModal.show();
}

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
            <p class="full-copyright-text">
              mycoRegister ${APP_VERSION} - Made by <a href="https://github.com/quackmore">quackmore</a> with <a href="https://claude.ai">claude.ai</a>
            </p>
            <div class="copyright-mobile">
              i
              <div class="tooltip">
                <p>mycoRegister ${APP_VERSION}</p>
                <p>Made by <a href="https://github.com/quackmore">quackmore</a> with <a href="https://claude.ai">claude.ai</a></p>
              </div>
            </div>
          </div>

          <div class="connection-status">
            <span id="sync-offline" class="sync-offline">
              <span class="sync-offline-text"></span>
            </span>
            <span id="sync-status" class="sync-status">
              <span class="status-text"></span>
            </span>
            <span id="connection-indicator" class="online">Online</span>
            <button id="user-profile-btn" class="btn secondary">User Profile</button>
          </div>
        </div>
      `;

    // Insert footer into container
    footerContainer.appendChild(footer);

    // Initialize
    this.initConnectionStatus();
    this.initSyncStatus();
    this.initSyncOffline();
    this.initUserProfileBtn();
  },

  initConnectionStatus: function () {
    const connectionIndicator = document.getElementById('connection-indicator');
    if (!connectionIndicator) return;

    // checkout connection status at startup in case events were missed
    if (connectionService.online()) {
      connectionIndicator.textContent = 'Online';
      connectionIndicator.className = 'online';
    }
    else {
      connectionIndicator.textContent = 'Offline';
      connectionIndicator.className = 'offline';
    }

    connectionService.on('online', () => {
      connectionIndicator.textContent = 'Online';
      connectionIndicator.className = 'online';
    });

    connectionService.on('offline', () => {
      connectionIndicator.textContent = 'Offline';
      connectionIndicator.className = 'offline';
    });
  },

  initSyncStatus: async function () {
    const syncStatus = document.getElementById('sync-status');
    if (!syncStatus) return;
    const statusText = syncStatus.querySelector('.status-text');
    if (!statusText) return;

    statusText.textContent = '';
    syncStatus.classList.remove('active');

    const dbService = await import('../services/dbService.js');
    dbService.default.addEventListener('sync:state-changed', (event) => {
      const { newState, oldState } = event.detail;
      switch (newState) {
        case 'change':
          statusText.textContent = 'Sinc. dati...';
          syncStatus.classList.add('active');
          break;
        case 'error':
          statusText.textContent = 'Errore di sincronizzazione';
          syncStatus.classList.add('active');
          break;
        default:
          statusText.textContent = '';
          syncStatus.classList.remove('active');
          break;
      }
    });
  },

  initSyncOffline: function () {
    const syncOffline = document.getElementById('sync-offline');
    if (!syncOffline) return;
    const syncOfflineText = syncOffline.querySelector('.sync-offline-text');
    if (!syncOfflineText) return;

    syncOfflineText.textContent = 'Sinc. dati';
    syncOffline.style.textDecoration = 'line-through';
    if (authService.isSyncOnline()) {
      syncOffline.classList.remove('active');
    } else {
      if (authService.isAuthenticated()) {
        syncOffline.classList.add('active');
      }
    }
    authEvents.on(authEvents.eventTypes.SYNC_OFFLINE, async () => {
      if (authService.isAuthenticated()) {
        syncOffline.classList.add('active');
      }
    });
    authEvents.on(authEvents.eventTypes.SYNC_ONLINE, async () => {
      syncOffline.classList.remove('active');
    });
  },

  initUserProfileBtn: function () {
    const userProfileBtn = document.getElementById('user-profile-btn');
    userProfileBtn.style.display = "none";
    userProfileBtn.addEventListener('click', () => showUserProfile());

    if (authService.isAuthenticated()) {
      authService.getSessionInfo().then(session => {
        userProfileBtn.innerHTML = session.username;
        userProfileBtn.style.display = "inline-block";
      });
    }

    authEvents.on(authEvents.eventTypes.AUTHENTICATED, async () => {
      const session = await authService.getSessionInfo();
      userProfileBtn.innerHTML = session.username;
      userProfileBtn.style.display = "inline-block";
    });
    authEvents.on(authEvents.eventTypes.UNAUTHENTICATED, async () => {
      userProfileBtn.style.display = "none";
    });
  }
};

if (document.readyState !== 'loading') {
  // DOMContentLoaded already fired, run your code directly
  Footer.init();
} else {
  // Wait for DOMContentLoaded event
  document.addEventListener('DOMContentLoaded', () => {
    Footer.init()
  });
}
console.log('Footer initialized');

export default Footer;