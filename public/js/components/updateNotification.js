// UpdateNotification component
const UpdateNotification = {
    // Initialize updateNotification
    init: function() {
      const updateNotificationContainer = document.getElementById('updateNotification-container');
      if (!updateNotificationContainer) return;
      
      // Create updateNotification content
      const updateNotification = document.createElement('updateNotification');
      updateNotification.className = 'app-updateNotification';
      updateNotification.innerHTML = `
        <div class="update-notification-content">
          <div class="update-notification-message">
            <h3>App Update Available</h3>
            <p>A new version of the app is available. Update to get the latest features and improvements.</p>
          </div>
          <div class="update-notification-actions">
            <button id="update-btn" class="btn primary">Update Now</button>
            <button id="update-later-btn" class="btn secondary">Later</button>
          </div>
        </div>
      `;
      
      // Insert updateNotification into container
      updateNotificationContainer.appendChild(updateNotification);      
    }    
  };
  
// Initialize updateNotification when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  UpdateNotification.init();
});