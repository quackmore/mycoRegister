// login.js - Component for handling login UI visibility

class LoginComponent {
    constructor() {
        this.loginContainer = null;
        this.appContainer = null;
        this.init();
    }

    init() {
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            // Get reference to the login container
            this.loginContainer = document.getElementById('login-container');
            
            if (!this.loginContainer) {
                console.error('Login container not found in the DOM');
                return;
            }

            this.appContainer = document.getElementById('app-container');
            
            if (!this.appContainer) {
                console.error('App container not found in the DOM');
                return;
            }

            // Set up auth event listeners
            this.setupAuthListeners();
            
            // Initial UI state based on current auth status
            this.updateLoginVisibility();
        });
    }

    setupAuthListeners() {
        // Listen for authentication events from the auth service
        authService.addEventListener('auth:authenticated', () => {
            this.hideLoginForm();
        });
        
        authService.addEventListener('auth:unauthenticated', () => {
            this.showLoginForm();
        });
        
        authService.addEventListener('auth:login-success', () => {
            this.hideLoginForm();
            document.getElementById("password").value = "";
        });
        
        authService.addEventListener('auth:offline-login-success', () => {
            this.hideLoginForm();
        });
        
        authService.addEventListener('auth:logout', () => {
            this.showLoginForm();
        });
    }

    updateLoginVisibility() {
        // Check current auth status and update UI accordingly
        if (authService.isAuthenticated()) {
            this.hideLoginForm();
        } else {
            this.showLoginForm();
        }
    }

    showLoginForm() {
        if (this.loginContainer) {
            // Remove 'hidden' class to show the login form
            this.loginContainer.classList.remove('hidden');
            // Add 'hidden' class to hide the app-container
            this.appContainer.classList.add('hidden');
        }
    }

    hideLoginForm() {
        if (this.loginContainer) {
            // Add 'hidden' class to hide the login form
            this.loginContainer.classList.add('hidden');
            // Remove 'hidden' class to show the app-container
            this.appContainer.classList.remove('hidden');
        }
    }
}

// Create and export singleton instance
const loginComponent = new LoginComponent();
console.log('Login component initialized');
// Export for global access
window.loginComponent = loginComponent;