import {
  addAllowedEmail,
  getAllowedEmails,
  removeAllowedEmail,
  updateAllowedEmail,
  setUserAdminStatus
} from '../services/admin.service.js';
import ModalUtils from '../utils/modal.js';

var allowedEmailTableComponent = null;

const editAllowedEmailModal = {
  constructor() {
    this.modal = null;
  },

  init: async function (email = '', notes = '') {
    const self = this;
    this.modal = ModalUtils.create('Email autorizzate', function (modalBody) {
      modalBody.innerHTML = `
          <div>    
              <form >
                  <div class="form-group">
                    <label for="allowedEmail">Email autorizzate:</label>
                    <input type="email" id="allowedEmail" name="allowed-email" value="${email}" required>
                  </div>
                  <div class="form-group">
                    <label for="notes">Notes:</label>
                    <input type="text" id="notes" name="notes" value="${notes}" required>
                  </div>
                  <div class="btnColumn">
                      <button type="submit" class="btn primary maxWidth">Salva</button>
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
            const newEmail = modalBody.querySelector('#allowedEmail').value.trim();
            const notes = modalBody.querySelector('#notes').value.trim();
            const messageDiv = modalBody.querySelector('#modal-message');
            messageDiv.textContent = '';
            messageDiv.className = 'modal-error';

            try {
              let success = null;
              if (email === '') {
                success = await addAllowedEmail(newEmail, notes);
              } else {
                success = await updateAllowedEmail(email, newEmail, notes);
              }
              if (success) {
                messageDiv.className = 'modal-success';
                if (email === '')
                  messageDiv.textContent = 'Email autorizzata aggiunta.';
                else
                  messageDiv.textContent = 'Email autorizzata modificata.';
                await new Promise(resolve => setTimeout(resolve, 2000));
                allowedEmailTableComponent.loadAllowedEmails();
                self.modal.destroy();
                self.modal = null;
              } else {
                messageDiv.className = 'modal-error';
                if (email === '')
                  messageDiv.textContent = "Errore durante l'aggiunta di una nuova email autorizzata.";
                else
                  messageDiv.textContent = 'Errore durante la modific di una email autorizzata.';
              }
            } catch (error) {
              messageDiv.className = 'modal-error';
              if (email === '')
                messageDiv.textContent = error.message || "Errore durante l'aggiunta di una nuova email autorizzata.";
              else
                messageDiv.textContent = error.message || 'Errore durante la modific di una email autorizzata.';
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
      });
    });
  },

  show: async function (email, notes) {
    if (!this.modal) await this.init(email, notes);
    this.modal.show();
  }
};

class AllowedEmailTableComponent {
  constructor() {
    // DOM elements
    this.tableContainer = document.getElementById('allowedEmailTable');
    this.tableHead = this.tableContainer.querySelector('.table thead');
    this.tableBody = this.tableContainer.querySelector('.table tbody');
    this.searchInput = document.getElementById('search-allowed');
    this.homeButton = document.getElementById('home-btn');
    this.newButton = document.getElementById('new-allowed-btn');
    this.editButton = document.getElementById('edit-allowed-btn');
    this.deleteButton = document.getElementById('delete-allowed-btn');
    this.noRecordsMessage = document.getElementById('allowed-email-message');

    // Component state
    this.alloweds = [];
    this.selectedId = null;
    this.isLoading = true;
    this.sortField = 'email'; // Default sort field
    this.sortDirection = 'asc'; // Default sort direction
    // Define visible fields with their display properties
    this.visibleFields = [
      { field: 'email', label: 'Email', sortable: true },
      { field: 'notes', label: 'Note', sortable: true }
    ];

    // Initialize
    // this.init();
  }

  async init() {
    console.log('Initializing AllowedEmailTableComponent...');
    // Generate table headers based on visible fields
    this.generateTableHeaders();

    // Set up event listeners
    this.setupEventListeners();

    // Load initial data
    await this.loadAllowedEmails();
  }

  generateTableHeaders() {
    // Clear existing headers
    const headerRow = this.tableHead.querySelector('tr');
    headerRow.innerHTML = '';

    // Generate headers based on visible fields
    this.visibleFields.forEach(field => {
      const th = document.createElement('th');
      th.textContent = field.label;

      if (field.sortable) {
        th.classList.add('sortable');
        th.setAttribute('data-field', field.field);

        // Add sort indicator
        const sortIcon = document.createElement('span');
        sortIcon.classList.add('sort-icon');
        sortIcon.innerHTML = '▲▼'; // Unicode triangles
        sortIcon.classList.add('unsorted'); // Default state is unsorted/gray
        th.appendChild(sortIcon);

        // Mark active sort column
        if (this.sortField === field.field) {
          th.classList.add('sorted');
          th.classList.add(this.sortDirection);
        }
      }

      headerRow.appendChild(th);
    });
  }

  setupEventListeners() {
    // Search input
    this.searchInput.addEventListener('input', this.handleSearch.bind(this));

    // Action buttons
    this.homeButton.addEventListener('click', () => {
      document.getElementById('admin-container').classList.add('hidden');
      document.getElementById('app-container').classList.remove('hidden');
      // window.location.href = '/';
    });
    this.newButton.addEventListener('click', this.handleNew.bind(this));
    this.editButton.addEventListener('click', this.handleEdit.bind(this));
    this.deleteButton.addEventListener('click', this.handleDelete.bind(this));

    // Delegated event for table row selection
    this.tableBody.addEventListener('click', this.handleRowClick.bind(this));

    // Add click event for sortable headers
    this.tableHead.addEventListener('click', this.handleHeaderClick.bind(this));
  }

  async loadAllowedEmails(searchTerm = '') {
    this.setLoading(true);

    try {
      // Use search if provided, otherwise get all samples
      if (searchTerm) {
        this.alloweds = (await getAllowedEmails()).data;
        this.alloweds = this.alloweds.filter(item => item.email.toLowerCase().includes(searchTerm) || (item.notes && item.notes.toLowerCase().includes(searchTerm)));
      } else {
        this.alloweds = (await getAllowedEmails()).data;
      }

      // Sort the data
      this.sortData();

      // Render the data
      this.renderTable();
    } catch (error) {
      console.error('Error loading alloweds:', error);
      this.showError('Errore durante il caricamento delle email autorizzate. Prova ancora.');
    } finally {
      this.setLoading(false);
    }

  }

  sortData() {
    const field = this.sortField;
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    this.alloweds.sort((a, b) => {
      // Handle standard string comparisons
      const valueA = (a[field] || '').toString().toLowerCase();
      const valueB = (b[field] || '').toString().toLowerCase();

      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }

  renderTable() {
    // Clear current table content
    this.tableBody.innerHTML = '';

    // Show no records message if empty
    if (this.alloweds.length === 0) {
      this.noRecordsMessage.classList.remove('hidden');
      return;
    }

    // Hide no records message if we have data
    this.noRecordsMessage.classList.add('hidden');

    // Render each row
    this.alloweds.forEach(sample => {
      const row = document.createElement('tr');

      // Set data-id attribute for selection
      row.setAttribute('data-id', sample._id);

      // Add selected class if this is the selected row
      if (sample._id === this.selectedId) {
        row.classList.add('selected');
      }

      // Create cells for each visible field
      this.visibleFields.forEach(fieldConfig => {
        const cell = document.createElement('td');

        // Add hide-mobile class if needed
        if (fieldConfig.hideMobile) {
          cell.classList.add('hide-mobile');
        }

        // Format value based on field type
        if (fieldConfig.field === 'collectionDate') {
          cell.textContent = this.formatDate(sample[fieldConfig.field]);
        } else {
          cell.textContent = sample[fieldConfig.field] || '';
        }

        row.appendChild(cell);
      });

      this.tableBody.appendChild(row);
    });

    // Update sort indicators
    this.updateSortIndicators();
  }

  updateSortIndicators() {
    // Reset all headers to unsorted/gray state
    this.tableHead.querySelectorAll('th').forEach(th => {
      th.classList.remove('sorted', 'asc', 'desc');

      // Reset all icons to unsorted state
      const icon = th.querySelector('.sort-icon');
      if (icon) {
        icon.classList.add('unsorted');
        icon.innerHTML = '▲▼'; // Reset to both triangles
      }
    });

    // Add sort classes to current sort field header
    const activeHeader = this.tableHead.querySelector(`th[data-field="${this.sortField}"]`);
    if (activeHeader) {
      activeHeader.classList.add('sorted', this.sortDirection);

      // Update active sort icon
      const sortIcon = activeHeader.querySelector('.sort-icon');
      if (sortIcon) {
        sortIcon.classList.remove('unsorted');
        // Show only the active direction triangle
        sortIcon.innerHTML = this.sortDirection === 'asc' ? '▲' : '▼';
      }
    }
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;

    // You can add a loading indicator here
    if (isLoading) {
      this.tableContainer.classList.add('loading');
    } else {
      this.tableContainer.classList.remove('loading');
    }
  }

  showError(message) {
    // In a real app, you might want to show an error message to the user
    console.error(message);
    // Example implementation could add a toast notification or alert
  }

  getSelectedLine() {
    if (!this.selectedId) return null;
    return this.alloweds.find(sample => sample._id === this.selectedId);
  }

  // Event Handlers

  handleSearch(event) {
    const searchTerm = event.target.value.trim();
    // Debounce this in a real application
    this.loadAllowedEmails(searchTerm);
  }

  handleHeaderClick(event) {
    // Find the closest th element
    const header = event.target.closest('th');
    if (!header || !header.classList.contains('sortable')) return;

    const field = header.getAttribute('data-field');

    // Update sort direction
    if (this.sortField === field) {
      // Toggle direction if already sorting by this field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New sort field, default to ascending
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    // Sort and re-render
    this.sortData();
    this.renderTable();
  }

  handleRowClick(event) {
    // Find the closest tr element
    const row = event.target.closest('tr');
    if (!row) return;

    // Get the data-id value
    const sampleId = row.getAttribute('data-id');
    if (!sampleId) return;

    // Update selection
    this.selectedId = sampleId;

    // Update UI - remove selected class from all rows
    this.tableBody.querySelectorAll('tr').forEach(r => {
      r.classList.remove('selected');
    });

    // Add selected class to clicked row
    row.classList.add('selected');

    // Enable action buttons
    this.editButton.disabled = false;
    this.deleteButton.disabled = false;
  }

  async handleNew() {
    await editAllowedEmailModal.show();
    this.loadAllowedEmails();
  }

  async handleEdit() {
    const selectedSample = this.getSelectedLine();
    if (!selectedSample) return;
    editAllowedEmailModal.show(selectedSample.email, selectedSample.notes);
  }

  async handleDelete() {
    const selectedSample = this.getSelectedLine();
    if (!selectedSample) return;

    if (confirm(`Sei sicuro di voler rimuovere ${selectedSample.email}?`)) {
      try {
        await removeAllowedEmail(selectedSample.email);

        // Remove from local array
        this.alloweds = this.alloweds.filter(sample => sample._id !== selectedSample._id);

        // Clear selection
        this.selectedId = null;
        this.editButton.disabled = true;
        this.deleteButton.disabled = true;

        // Re-render table
        this.renderTable();
      } catch (error) {
        console.error('Error deleting allowed email:', error);
        this.showError('Errore durante rimozione di una email autorizzata. Prova ancora.');
      }
    }
  }

  async handleSyncDataChange(event) {
    const searchTerm = this.searchInput.value.trim();
    await this.loadAllowedEmails(searchTerm);
  }

  // Utility functions

  formatDate(dateString) {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  }

  escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';

    // Return the string directly without HTML escaping
    // This is safe for textContent but would not be safe for innerHTML
    return unsafe.toString();
  }
}

// var allowedEmailTableComponent = null;
// // Initialize when DOM is loaded
// if (document.readyState !== 'loading') {
//   // DOMContentLoaded already fired, run your code directly
//   allowedEmailTableComponent = new AllowedEmailTableComponent();
//   await allowedEmailTableComponent.init();
// } else {
//   // Wait for DOMContentLoaded event
//   document.addEventListener('DOMContentLoaded', async () => {
//     // Initialize the component
//     allowedEmailTableComponent = new AllowedEmailTableComponent();
//     await allowedEmailTableComponent.init();
//   })
// }

allowedEmailTableComponent = new AllowedEmailTableComponent();
allowedEmailTableComponent.init();
// export default allowedEmailTableComponent;
export {
  AllowedEmailTableComponent
};