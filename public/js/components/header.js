// Header component
const Header = {
  // Initialize header
  init: function() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;
    
    // Create header content
    const header = document.createElement('header');
    header.className = 'app-header';
    header.innerHTML = `
      <div class="header-content">
        <div class="logo-container">
          <a href="index.html">
            <img src="img/logo.png" alt="fungiDB Logo" class="logo">
          </a>
        </div>
        <div class="title-container">
          <h1>Fungi Database</h1>
        </div>
      </div>
    `;

    // Insert header into container
    headerContainer.appendChild(header);
    
  }
};

// Initialize header when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Header.init();
  console.log('Header initialized');
});