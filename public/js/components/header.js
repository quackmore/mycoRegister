// Header component
const Header = {
  // Initialize header
  init: function () {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;

    // Create header content
    const header = document.createElement('header');
    header.className = 'app-header';
    header.innerHTML = `
      <div class="header-content">
        <div class="logo-container">
          <a href="index.html">
            <img src="img/logo.png" alt="mycoRegister Logo" class="logo">
          </a>
        </div>
        <div class="title-container">
          <h1>Registro Micologico</h1>
          <p>AMB Villa D'Ogna</p>
        </div>
      </div>
    `;

    // Insert header into container
    headerContainer.appendChild(header);

  }
};

// Initialize header when the DOM is loaded
if (document.readyState !== 'loading') {
  // DOMContentLoaded already fired, run your code directly
  Header.init();
} else {
  // Wait for DOMContentLoaded event
  document.addEventListener('DOMContentLoaded', () => {
    Header.init();
  });
}
console.log('Header initialized');
