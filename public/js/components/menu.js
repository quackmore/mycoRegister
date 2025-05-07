// Menu component - handles responsive menu and hamburger button
const Menu = {
    // Initialize menu
    init: function() {
      // Get menu elements
      const menuToggle = document.getElementById('menu-toggle');
      const mainNav = document.getElementById('main-nav');
      
      if (!menuToggle || !mainNav) return;
      
      // Toggle menu when hamburger is clicked
      menuToggle.addEventListener('click', () => {
        mainNav.classList.toggle('active');
        menuToggle.classList.toggle('active');
      });
      
      // Close menu when clicking outside
      document.addEventListener('click', (event) => {
        const isClickInside = mainNav.contains(event.target) || menuToggle.contains(event.target);
        
        if (!isClickInside && mainNav.classList.contains('active')) {
          mainNav.classList.remove('active');
          menuToggle.classList.remove('active');
        }
      });
      
      // Close menu when window is resized to desktop
      window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && mainNav.classList.contains('active')) {
          mainNav.classList.remove('active');
          menuToggle.classList.remove('active');
        }
      });
      
      // Handle menu link clicks
      const menuLinks = mainNav.querySelectorAll('a');
      menuLinks.forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 768) {
            mainNav.classList.remove('active');
            menuToggle.classList.remove('active');
          }
        });
      });
    }
  };