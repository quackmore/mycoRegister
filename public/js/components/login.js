// login.js - Component for handling login UI visibility

import authService from '../services/auth/auth.service.js';
import authEvents from '../services/auth/auth.events.js';
import AuthRegistration from '../services/auth/auth.registration.js';

class LoginComponent {
  constructor() {
    this.authContainer = null;
    this.appContainer = null;
    this.adminContainer = null;
    this.init();
  }

  init() {
    console.log('LoginComponent awaiting for DOM loaded...');
    // Wait for DOM to be fully loaded
    if (document.readyState !== 'loading') {
      // DOMContentLoaded already fired, run your code directly
      this.initCode();
    } else {
      // Wait for DOMContentLoaded event
      document.addEventListener('DOMContentLoaded', this.initCode);
    }
  }

  initCode() {
    console.log('Initializing LoginComponent...');
    // Set up references to the DOM elements
    this.setupDOMreferences();
    // Initial UI state based on current auth status
    this.updateLoginVisibility();
    // Set up auth event listeners
    this.setupAuthListeners();
  }

  setupDOMreferences() {
    // Get references to DOM elements
    this.authContainer = document.getElementById('auth-container');
    if (!this.authContainer) console.error('Auth container not found in the DOM');
    this.appContainer = document.getElementById('app-container');
    if (!this.appContainer) console.error('App container not found in the DOM');
    this.adminContainer = document.getElementById('admin-container');
    if (!this.adminContainer) console.error('Admin container not found in the DOM');
    const authToggleLogin = document.getElementById('auth-toggle-login');
    if (!authToggleLogin)
      console.error('Toggle login button not found in the DOM');
    else
      authToggleLogin.addEventListener('click', (e) => this.showForm('login'));
    const authToggleRegister = document.getElementById('auth-toggle-register');
    if (!authToggleRegister)
      console.error('Toggle register button not found in the DOM');
    else
      authToggleRegister.addEventListener('click', (e) => this.showForm('register'));
    const authLoginForm = document.getElementById('auth-login-form');
    if (!authLoginForm)
      console.error('Auth login form not found in the DOM');
    else
      authLoginForm.addEventListener('submit', (e) => this.handleLogin(e));
    const toggleLoginPassword = document.getElementById('toggle-login-password');
    if (!toggleLoginPassword)
      console.error('Toggle login password not found in the DOM');
    else
      toggleLoginPassword.addEventListener('click', (e) => this.togglePassword('login'));
    const authRegisterForm = document.getElementById('auth-register-form');
    if (!authRegisterForm)
      console.error('Auth register form not found in the DOM');
    else
      authRegisterForm.addEventListener('submit', (e) => this.handleRegister(e));
    const toggleRegisterPassword = document.getElementById('toggle-register-password');
    if (!toggleRegisterPassword)
      console.error('Toggle login password not found in the DOM');
    else
      toggleRegisterPassword.addEventListener('click', (e) => this.togglePassword('register'));
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
    if (!toggleConfirmPassword)
      console.error('Toggle login password not found in the DOM');
    else
      toggleConfirmPassword.addEventListener('click', (e) => this.togglePassword('confirm'));
    const authForgotPassword = document.getElementById('auth-forgot-password');
    if (!authForgotPassword)
      console.error('Toggle login password not found in the DOM');
    else
      authForgotPassword.addEventListener('click', (e) => this.forgotPassword(e));
  }

  setupAuthListeners() {
    // Listen for authentication events from the auth service
    authEvents.on(authEvents.eventTypes.AUTHENTICATED, async () => {
      this.hideAuthContainer();
    });
    authEvents.on(authEvents.eventTypes.UNAUTHENTICATED, async () => {
      this.showAuthContainer();
    });
    authEvents.on(authEvents.eventTypes.LOGIN_SUCCESS, async () => {
      this.loginSuccess();
    });
    authEvents.on(authEvents.eventTypes.LOGIN_FAILED, async (payload) => {
      this.loginFail(payload.detail);
    });
    authEvents.on(authEvents.eventTypes.LOGOUT_SUCCESS, async () => {
    });
    authEvents.on(authEvents.eventTypes.PASSWORD_RESET_SUCCESS, async (payload) => {
      this.showMessage(payload.detail.message, 'success');
    });
    authEvents.on(authEvents.eventTypes.PASSWORD_RESET_FAILED, async (payload) => {
      this.showMessage(payload.detail.error, 'error');
    });
    authEvents.on(authEvents.eventTypes.REGISTRATION_SUCCESS, async (payload) => {
      this.showMessage(payload.detail.message, 'success');
    });
    authEvents.on(authEvents.eventTypes.REGISTRATION_FAILED, async (payload) => {
      this.showMessage(payload.detail.error, 'error');
    });
  }

  updateLoginVisibility() {
    // Check current auth status and update UI accordingly
    if (authService.isAuthenticated()) {
      this.hideAuthContainer();
    } else {
      this.showAuthContainer();
    }
  }

  showAuthContainer() {
    if (this.authContainer) {
      // Remove 'hidden' class to show the login form
      this.authContainer.classList.remove('hidden');
      document.getElementById('auth-login-username').focus();
      // Add 'hidden' class to hide the app-container
      this.appContainer.classList.add('hidden');
      this.adminContainer.classList.add('hidden');
    }
  }

  hideAuthContainer() {
    if (this.authContainer) {
      // Add 'hidden' class to hide the login form
      this.authContainer.classList.add('hidden');
      // Remove 'hidden' class to show the app-container
      this.appContainer.classList.remove('hidden');
    }
  }

  loginSuccess() {
    document.getElementById('auth-login-password').value = "";
    this.hideMessages();
  }

  loginFail(payload) {
    this.showMessage(payload.error, 'error');
  }

  showForm(formType) {
    // Update toggle buttons
    document.querySelectorAll('.auth-toggle-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(`auth-toggle-${formType}`).classList.add('active');

    // Hide all forms
    document.querySelectorAll('.auth-form').forEach(form => {
      form.classList.remove('active');
    });

    // Show selected form
    document.getElementById(`auth-${formType}-form`).classList.add('active');

    // Clear messages
    this.hideMessages();
  }

  togglePassword(fieldId) {
    const field = document.getElementById(`auth-${fieldId}-password`);
    const button = field.nextElementSibling;

    if (field.type === 'password') {
      field.type = 'text';
      button.textContent = 'Nascondi';
    } else {
      field.type = 'password';
      button.textContent = 'Mostra';
    }
  }

  showMessage(message, type) {
    this.hideMessages();
    const messageEl = document.getElementById(`auth-${type}-message`);
    messageEl.textContent = message;
    messageEl.style.display = 'block';
  }

  hideMessages() {
    document.getElementById('auth-success-message').style.display = 'none';
    document.getElementById('auth-error-message').style.display = 'none';
  }

  async handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('auth-login-username').value.trim();
    const password = document.getElementById('auth-login-password').value.trim();
    const rememberMe = document.getElementById('auth-remember-me').checked;

    // Simple regex for email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Simple regex for username: letters, numbers, underscores, 3-20 chars
    const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
    if (!(username && password) ||
      (!emailPattern.test(username) && !usernamePattern.test(username))) {
      this.showMessage('Inserisci un indirizzo email valido o il nome utente.', 'error');
      return;
    }

    await authService.handleLogin(username, password, rememberMe);
    // error handling is done via authEvents
  }

  async forgotPassword(event) {
    event.preventDefault();

    const username = document.getElementById('auth-login-username').value.trim();

    // Simple regex for email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Simple regex for username: letters, numbers, underscores, 3-20 chars
    const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
    if (!(username) ||
      (!emailPattern.test(username) && !usernamePattern.test(username))) {
      this.showMessage('Inserisci un indirizzo email valido o il nome utente.', 'error');
      return;
    }

    const authPassword = await import('../services/auth/auth.password.js');
    await authPassword.passwordReset(username);
    // success and error handling is done via authEvents
  }

  async handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('auth-register-name').value.trim();
    const email = document.getElementById('auth-register-email').value.trim();
    const password = document.getElementById('auth-register-password').value.trim();
    const confirmPassword = document.getElementById('auth-confirm-password').value.trim();
    // const terms = formData.get('terms');

    // Validate mane and email
    // Simple regex for email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Simple regex for username: letters, numbers, underscores, 3-20 chars
    const namePattern = /^[a-zA-Z0-9_]{3,20}$/;
    if (!(name && email) ||
      (!emailPattern.test(email) && !namePattern.test(name))) {
      this.showMessage('Inserisci un indirizzo email valido o il nome utente.', 'error');
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      this.showMessage('Le password non corrispondono.', 'error');
      return;
    }

    // Validate terms acceptance
    // if (!terms) {
    //   this.showMessage('Please accept the Terms of Service.', 'error');
    //   return;
    // }

    const authRegistration = new AuthRegistration();
    await authRegistration.handleRegistration(name, email, password);
    // success and error handling is done via authEvents
  }
}

// Create and export singleton instance
const loginComponent = new LoginComponent();

console.log('Login component initialized');