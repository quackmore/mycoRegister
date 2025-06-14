// User Profile Modal component
import ModalUtils from '../utils/modal.js';
import authService from '../services/auth/auth.service.js';

const changePasswordModal = {
  constructor() {
    this.modal = null;
  },

  init: async function (session) {
    const self = this;
    this.modal = ModalUtils.create('Modifica Password', function (modalBody) {
      modalBody.innerHTML = `
          <div>    
              <form autocomplete="off">
                  <div class="form-group">
                    <label for="password">Password attuale:</label>
                    <div class="auth-password-field">
                      <input type="password" id="current-password" name="current-password" required autocomplete="off">
                      <button type="button" class="auth-password-toggle">Mostra</button>
                    </div>
                  </div>
                  <div></div>
                  <div class="form-group">
                    <label for="password">Nuova password:</label>
                    <div class="auth-password-field">
                      <input type="password" id="new-password" name="new-password" required minlength="8" autocomplete="new-password">
                      <button type="button" class="auth-password-toggle">Mostra</button>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="password">Conferma nuova password:</label>
                    <div class="auth-password-field">
                      <input type="password" id="confirm-password" name="confirm-password" required minlength="8" autocomplete="new-password">
                      <button type="button" class="auth-password-toggle">Mostra</button>
                    </div>
                  </div>
                  <div class="btnColumn">
                      <button type="submit" class="btn primary maxWidth">Conferma</button>
                      <button type="button" id="cancel-btn" class="btn primary maxWidth">Annulla</button>
                  </div>    
              </form>
              <div id="modal-message"></div>
          </div>
          `;
      Promise.resolve().then(() => {
        const submitBtn = modalBody.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            const currentPassword = modalBody.querySelector('#current-password').value.trim();
            const newPassword = modalBody.querySelector('#new-password').value.trim();
            const confirmPassword = modalBody.querySelector('#confirm-password').value.trim();
            const messageDiv = modalBody.querySelector('#modal-message');
            messageDiv.textContent = '';
            messageDiv.className = 'modal-error';

            if (!currentPassword || !newPassword || !confirmPassword) {
              messageDiv.className = 'modal-error';
              messageDiv.textContent = 'Compila tutti i campi necessari.';
              return;
            }

            if (newPassword !== confirmPassword) {
              messageDiv.className = 'modal-error';
              messageDiv.textContent = 'Le password non corrispondono.';
              return;
            }

            try {
              const success = await authService.changePassword(session.username, currentPassword, newPassword);
              if (success) {
                messageDiv.className = 'modal-success';
                messageDiv.textContent = 'Password modificata';
                await new Promise(resolve => setTimeout(resolve, 2000));
                self.modal.destroy();
                self.modal = null;
              } else {
                messageDiv.className = 'modal-error';
                messageDiv.textContent = 'Errore durante la modifica della password. Prova ancora.';
              }
            } catch (error) {
              messageDiv.className = 'modal-error';
              messageDiv.textContent = error.message || 'Errore durante la modifica della password.';
            }
          });
        }
        const cancelBtn = modalBody.querySelector('#cancel-btn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', async () => {
            self.modal.destroy();
            self.modal = null;
          });
        }
        const passwordField = modalBody.querySelector('#current-password');
        const passwordToggleBtn = passwordField.nextElementSibling;
        if (passwordToggleBtn) {
          passwordToggleBtn.addEventListener('click', async () => {
            if (passwordField.type === 'password') {
              passwordField.type = 'text';
              passwordToggleBtn.textContent = 'Nascondi';
            } else {
              passwordField.type = 'password';
              passwordToggleBtn.textContent = 'Mostra';
            }
          });
        }
        const newPasswordField = modalBody.querySelector('#new-password');
        const newPasswordToggleBtn = newPasswordField.nextElementSibling;
        if (newPasswordToggleBtn) {
          newPasswordToggleBtn.addEventListener('click', async () => {
            if (newPasswordField.type === 'password') {
              newPasswordField.type = 'text';
              newPasswordToggleBtn.textContent = 'Nascondi';
            } else {
              newPasswordField.type = 'password';
              newPasswordToggleBtn.textContent = 'Mostra';
            }
          });
        }
        const confirmPasswordField = modalBody.querySelector('#confirm-password');
        const confirmPasswordToggleBtn = confirmPasswordField.nextElementSibling;
        if (confirmPasswordToggleBtn) {
          confirmPasswordToggleBtn.addEventListener('click', async () => {
            if (confirmPasswordField.type === 'password') {
              confirmPasswordField.type = 'text';
              confirmPasswordToggleBtn.textContent = 'Nascondi';
            } else {
              confirmPasswordField.type = 'password';
              confirmPasswordToggleBtn.textContent = 'Mostra';
            }
          });
        }
      });
    });
  },

  show: async function (session) {
    if (!this.modal) await this.init(session);
    this.modal.show();
  }
};

const deleteAccountModal = {
  constructor() {
    this.modal = null;
  },

  init: async function (session) {
    const self = this;
    this.modal = ModalUtils.create('Rimuovi Account', function (modalBody) {
      modalBody.innerHTML = `
          <div>    
              <div>
                  <p>Eseguendo questa azione</p>
                  <p>sarai scollegato e il tuo account</p>
                  <p>sarà rimosso permanentemente.</p>
                  <p>Dovrai registrarti di nuovo per poter accedere.</p>
                  <p>Conferma inserendo la password.</p>
              </div>    
              <br>
              <form autocomplete="off">
                  <div class="form-group">
                    <label for="password">Password:</label>
                    <div class="auth-password-field">
                      <input type="password" id="password" name="password" required autocomplete="off">
                      <button type="button" class="auth-password-toggle">Mostra</button>
                    </div>
                  </div>
                  <div class="btnColumn">
                      <button type="submit" class="btn primary maxWidth">Conferma</button>
                      <button type="button" id="cancel-btn" class="btn primary maxWidth">Annulla</button>
                  </div>    
              </form>
              <div id="modal-message"></div>
          </div>
          `;
      Promise.resolve().then(() => {
        const submitBtn = modalBody.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            const password = modalBody.querySelector('#password').value.trim();
            const messageDiv = modalBody.querySelector('#modal-message');
            messageDiv.textContent = '';
            messageDiv.className = 'modal-error';

            if (!password) {
              messageDiv.className = 'modal-error';
              messageDiv.textContent = 'Inserisci la password';
              return;
            }

            try {
              const authUser = await import('../services/auth/auth.users.js');
              const success = await authUser.deleteAccount(session, password);
              if (success) {
                messageDiv.className = 'modal-success';
                messageDiv.textContent = 'Account rimosso.';
              } else {
                messageDiv.className = 'modal-error';
                messageDiv.textContent = "Errore durante la rimozione dell'account. Prova ancora.";
              }
              await new Promise(resolve => setTimeout(resolve, 2000));
              self.modal.destroy();
              self.modal = null;
              await authService.handleLogout();
            } catch (error) {
              messageDiv.className = 'modal-error';
              messageDiv.textContent = error.message || "Errore durante la rimozione dell'account.";
            }
          });
        }
        const cancelBtn = modalBody.querySelector('#cancel-btn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', async () => {
            self.modal.destroy();
            self.modal = null;
          });
        }
        const passwordField = modalBody.querySelector('#password');
        const toggleBtn = passwordField.nextElementSibling;
        if (toggleBtn) {
          toggleBtn.addEventListener('click', async () => {
            if (passwordField.type === 'password') {
              passwordField.type = 'text';
              toggleBtn.textContent = 'Nascondi';
            } else {
              passwordField.type = 'password';
              toggleBtn.textContent = 'Mostra';
            }
          });
        }
      });
    });
  },

  show: async function (session) {
    if (!this.modal) await this.init(session);
    this.modal.show();
  }
};

const userProfileModal = {
  constructor() {
    this.modal = null;
  },

  init: async function () {
    const session = await authService.getSessionInfo();
    const self = this;
    this.modal = ModalUtils.create('Profilo utente', function (modalBody) {
      modalBody.innerHTML = `
          <div>    
              <p>Nome utente: ${session.username}</p>
              <p>Email: ${session.email}</p>
              <div id="admin-keys" class="hidden">
                  <p>Ruolo: ${session.role}</p>
              </div>
              <br>
              <hr>
              <br>
              <div class="btnColumn">
                  <div id="admin-actions" class="btnColumn maxWidth hidden">
                      <button id="manage-allowed-btn" class="btn primary maxWidth">Gestisci le autorizzazioni</button>
                  </div>
                  <button id="change-password-btn" class="btn primary maxWidth">Modifica Password</button>
                  <button id="logout-btn" class="btn primary maxWidth">Esci</button>
                  <br>
                  <a href="#" id="delete-account">Rimuovi account</a>
              </div>    
          </div>    
          `;
      Promise.resolve().then(() => {
        const changePasswordBtn = modalBody.querySelector('#change-password-btn');
        if (changePasswordBtn) {
          changePasswordBtn.addEventListener('click', async () => {
            changePasswordModal.show(session);
          });
        }
        const logoutBtn = modalBody.querySelector('#logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => {
            authService.handleLogout()
            self.modal.destroy();
            self.modal = null;
          });
        }
        const deleteAccountBtn = modalBody.querySelector('#delete-account');
        if (deleteAccountBtn) {
          deleteAccountBtn.addEventListener('click', async () => {
            await deleteAccountModal.show(session);
            self.modal.destroy();
            self.modal = null;
          });
        }
        if (session.role === 'admin') {
          const adminKeys = modalBody.querySelector('#admin-keys');
          if (adminKeys) {
            adminKeys.classList.remove('hidden');
          } else {
            console.error('Admin keys section not found in modal!');
          }
          const adminActions = modalBody.querySelector('#admin-actions');
          if (adminActions) {
            adminActions.classList.remove('hidden');
          } else {
            console.error('Admin actions section not found in modal!');
          }
          const manageAllowedBtn = modalBody.querySelector('#manage-allowed-btn');
          if (manageAllowedBtn) {
            manageAllowedBtn.addEventListener('click', () => {
              document.getElementById('app-container').classList.add('hidden');
              document.getElementById('admin-container').classList.remove('hidden');
              const allowedEmailTable = import('./allowedEmailTable.js')
                .then(async allowedEmailTable => {
                  console.log('allowedEmailTable module loaded and ready!');
                })
                .catch(error => {
                  console.error('Error loading allowedEmailTable module:', error);
                });
              self.modal.destroy();
              self.modal = null;
            });
          }
        }
      });
    });
  },

  show: async function () {
    if (!this.modal) await this.init();
    this.modal.show();
  }
};

export {
  userProfileModal
};