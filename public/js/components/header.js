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
            <img src="img/logo.png" alt="Persons PWA Logo" class="logo">
          </a>
        </div>
        <div class="title-container">
          <h1>Persons Database</h1>
        </div>
      </div>
    `;

// header with menu    
//    header.innerHTML = `
//      <div class="header-content">
//        <div class="logo-container">
//          <a href="index.html">
//            <img src="img/logo.png" alt="Persons PWA Logo" class="logo">
//          </a>
//        </div>
//        <div class="title-container">
//          <h1>Persons Database</h1>
//        </div>
//        <div class="menu-toggle" id="menu-toggle">
//          <span class="bar"></span>
//          <span class="bar"></span>
//          <span class="bar"></span>
//        </div>
//      </div>
//      <nav class="main-nav" id="main-nav">
//        <ul>
//          <li><a href="persons.html">Manage Persons</a></li>
//          <li><a href="queries.html">Query Persons</a></li>
//          <li><a href="#" id="sync-button">Sync Data</a></li>
//          <li><a href="#" id="logout-button">Logout</a></li>
//        </ul>
//      </nav>
//    `;

    // Insert header into container
    headerContainer.appendChild(header);
    
    // Initialize menu
//     Menu.init();
  }
};

// Initialize header when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Header.init();
});