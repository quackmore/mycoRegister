// fungiTable.js - Component for displaying fungi samples in a responsive table
import dbService from '../services/dbService.js';
import FungiService from '../services/fungiService.js';
import fungiSampleModel from '../models/fungiSample.js';
import FungiSampleForm from './fungiSampleForm.js';

class FungiTableComponent {
  constructor() {
    // DOM elements
    this.tableContainer = document.querySelector('.table-container');
    this.tableHead = document.querySelector('.table thead');
    this.tableBody = document.getElementById('table-body');
    this.searchInput = document.getElementById('search-fungi');
    this.newButton = document.getElementById('new-fungi-btn');
    this.editButton = document.getElementById('edit-fungi-btn');
    this.deleteButton = document.getElementById('delete-fungi-btn');
    this.noRecordsMessage = document.getElementById('no-records-message');

    // Component state
    this.fungiSamples = [];
    this.selectedSampleId = null;
    this.isLoading = true;
    this.sortField = 'taxonGenus'; // Default sort field
    this.sortDirection = 'asc'; // Default sort direction

    // DB change debouncing
    this.debounceTimer = null;
    this.debounceDelay = 300; // milliseconds

    // Define visible fields with their display properties
    // this.visibleFields = [
    //   { field: 'taxonGenus', label: 'Genere', sortable: true },
    //   { field: 'taxonSpecies', label: 'Specie', sortable: true },
    //   { field: 'collectionDate', label: 'Data raccolta', sortable: true },
    //   { field: 'locality', label: 'Località', sortable: true },
    //   { field: 'collector', label: 'Raccoglitore', sortable: true },
    //   { field: 'habitat', label: 'Habitat', sortable: true }
    // ];

    this.setVisibleFields(this.getResponsiveFields());

    // Initialize
    // this.init();
  }

  getResponsiveFields() {
    const width = window.innerWidth;

    if (width <= 768) {
      return ['taxonGenus', 'taxonSpecies', 'collectionDate'];
    } else if (width <= 1024) {
      return ['taxonGenus', 'taxonSpecies', 'collectionDate', 'locality', 'habitat'];
    } else {
      return ['taxonGenus', 'taxonSpecies', 'authority', 'collectionDate', 'locality', 'habitat', 'collector'];
    }
  }

  /**
 * Sets visible fields for display in the UI table
 * @param {Array} fields - Array of field objects or field names to display
 * @returns {Array} - The validated and set visible fields
 * @throws {Error} - If any field is not found in tableHeaders
 */
  setVisibleFields(fields) {
    // Handle case when no fields are provided
    if (!fields || fields.length === 0) {
      this.visibleFields = [];
      return this.visibleFields;
    }

    // Create a map of valid fields from tableHeaders for quick lookup
    const validFields = {};
    fungiSampleModel.tableHeaders.forEach(header => {
      validFields[header.field] = header;
    });

    // Process and validate each field
    const processedFields = fields.map(field => {
      // If input is just a string (field name), convert to object format
      const fieldName = typeof field === 'string' ? field : field.field;

      // Verify the field exists in tableHeaders
      if (!validFields[fieldName]) {
        throw new Error(`Field "${fieldName}" is not defined in tableHeaders`);
      }

      // If field is already in correct format, use it; otherwise get from tableHeaders
      return typeof field === 'object' && field.field && field.label ?
        field : validFields[fieldName];
    });

    // Set the visible fields
    this.visibleFields = processedFields;

    return this.visibleFields;
  }

  async init() {
    // Generate table headers based on visible fields
    this.generateTableHeaders();

    // Set up event listeners
    this.setupEventListeners();

    // Load initial data
    await this.loadFungiSamples();

    // Set up sync listeners
    this.setupDbChangeListener();
    // this.setupSyncListeners();

    await FungiSampleForm.init();
  }

  generateTableHeaders() {
    // Clear existing headers
    const headerRow = this.tableHead.querySelector('tr');
    headerRow.innerHTML = '';

    // Generate headers based on visible fields
    this.visibleFields.forEach(field => {
      const th = document.createElement('th');
      th.textContent = field.label;

      if (field.hideMobile) {
        th.classList.add('hide-mobile');
      }

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

  handleResize() {
    // Debounce the resize event to avoid excessive calls
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.updateResponsiveLayout();
    }, 150); // 150ms delay
  }

  updateResponsiveLayout() {
    const newFields = this.getResponsiveFields();

    // Only update if the fields actually changed
    const currentFieldNames = this.visibleFields.map(f => f.field);
    const newFieldNames = newFields;

    if (JSON.stringify(currentFieldNames) !== JSON.stringify(newFieldNames)) {
      this.setVisibleFields(newFields);
      this.generateTableHeaders();
      this.renderTable();
    }
  }

  setupEventListeners() {
    // Search input
    this.searchInput.addEventListener('input', this.handleSearch.bind(this));

    // Action buttons
    this.newButton.addEventListener('click', this.handleNew.bind(this));
    this.editButton.addEventListener('click', this.handleEdit.bind(this));
    this.deleteButton.addEventListener('click', this.handleDelete.bind(this));

    // Delegated event for table row selection
    this.tableBody.addEventListener('click', this.handleRowClick.bind(this));

    // Add click event for sortable headers
    this.tableHead.addEventListener('click', this.handleHeaderClick.bind(this));

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  // Debounced handler
  handleDatabaseChanges = async () => {
    const searchTerm = this.searchInput.value.trim();
    await this.loadFungiSamples(searchTerm);
    if (this.fungiSamples.length > 0) {
      console.log('Updating autocompletion...');
      await FungiSampleForm.refreshAutocompleteData();
      await FungiSampleForm.refreshAuthorityCache();
    }
  }

  setupDbChangeListener() {
    // Listen for sync changes that might affect our data
    dbService.getLocalDatabase().changes({
      since: 'now',
      live: true,
      include_docs: true
    }).on('change', async (change) => {
      let changesIncludeFungiSamples = false;
      if (change.deleted) {
        changesIncludeFungiSamples = true;
      } else {
        if (change.doc && change.doc.type === 'fungiSample')
          changesIncludeFungiSamples = true;
      }
      if (changesIncludeFungiSamples) {
        // Clear existing timer
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }

        // Set new timer
        this.debounceTimer = setTimeout(() => {
          this.handleDatabaseChanges();
          this.debounceTimer = null;
        }, this.debounceDelay);
      }
    })
    // dbService.addEventListener('sync:change', this.handleSyncDataChange.bind(this));
  }

  async loadFungiSamples(searchTerm = '') {
    this.setLoading(true);

    try {
      // Use search if provided, otherwise get all samples
      if (searchTerm) {
        this.fungiSamples = await FungiService.search(searchTerm);
      } else {
        this.fungiSamples = await FungiService.getAll();
      }
      // Sort the data
      this.sortData();

      // Render the data
      this.renderTable();
    } catch (error) {
      console.error('Error loading fungi samples:', error);
      this.showError("Errore durante il caricamento dati. Prova ancora.");
    } finally {
      this.setLoading(false);
    }
  }

  sortData() {
    const field = this.sortField;
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    this.fungiSamples.sort((a, b) => {
      // Special handling for dates
      if (field === 'collectionDate') {
        const dateA = a[field] ? new Date(a[field]) : new Date(0);
        const dateB = b[field] ? new Date(b[field]) : new Date(0);
        return direction * (dateA - dateB);
      }

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
    if (this.fungiSamples.length === 0) {
      this.noRecordsMessage.classList.remove('hidden');
      return;
    }

    // Hide no records message if we have data
    this.noRecordsMessage.classList.add('hidden');

    // Render each row
    this.fungiSamples.forEach(sample => {
      const row = document.createElement('tr');

      // Set data-id attribute for selection
      row.setAttribute('data-id', sample._id);

      // Add selected class if this is the selected row
      if (sample._id === this.selectedSampleId) {
        row.classList.add('selected');
      }

      // Create cells for each visible field
      this.visibleFields.forEach(fieldConfig => {
        const cell = document.createElement('td');

        if (fieldConfig.field === 'taxonGenus' || fieldConfig.field === 'taxonSpecies') {
          cell.classList.add('italic');
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

  getSelectedSample() {
    if (!this.selectedSampleId) return null;
    return this.fungiSamples.find(sample => sample._id === this.selectedSampleId);
  }

  // Event Handlers

  handleSearch(event) {
    const searchTerm = event.target.value.trim();
    // Debounce this in a real application
    this.loadFungiSamples(searchTerm);
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
    this.selectedSampleId = sampleId;

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
    // Here you would open a modal with a form for creating a new fungi sample
    FungiSampleForm.openModal();
  }

  async handleEdit() {
    const selectedSample = this.getSelectedSample();
    if (!selectedSample) return;
    // Here you would open a modal with a form for editing the selected fungi sample
    console.log('Edit fungi sample button clicked', selectedSample);
    FungiSampleForm.loadFungiSampleForEdit(selectedSample._id);
    FungiSampleForm.openModal();
    // Implementation would depend on your modal/form system
  }

  async handleDelete() {
    const selectedSample = this.getSelectedSample();
    if (!selectedSample) return;

    if (confirm(`Sei sicuro di voler rimuovere ${selectedSample.taxonGenus} ${selectedSample.taxonSpecies}?`)) {
      try {
        await FungiService.delete(selectedSample._id);

        // Remove from local array
        this.fungiSamples = this.fungiSamples.filter(sample => sample._id !== selectedSample._id);

        // Clear selection
        this.selectedSampleId = null;
        this.editButton.disabled = true;
        this.deleteButton.disabled = true;

        // Re-render table
        this.renderTable();
      } catch (error) {
        console.error('Error deleting fungi sample:', error);
        this.showError('Errore durante la rimozione del campione. Prova ancora.');
      }
    }
  }

  async handleSyncDataChange(event) {
    const { info } = event.detail;

    // Check if the changes include fungi samples
    if (info && info.direction) {
      const changesIncludeFungiSamples = info.change && info.change.docs &&
        info.change.docs.some(doc => doc.type === 'fungiSample');

      // Reload data if fungi samples were changed
      if (changesIncludeFungiSamples) {
        const searchTerm = this.searchInput.value.trim();
        await this.loadFungiSamples(searchTerm);
      }
    }
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

var fungiTableComponent = null;
// Initialize when DOM is loaded
if (document.readyState !== 'loading') {
  // DOMContentLoaded already fired, run your code directly
  fungiTableComponent = new FungiTableComponent();
  await fungiTableComponent.init();
} else {
  // Wait for DOMContentLoaded event
  document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the component
    fungiTableComponent = new FungiTableComponent();
    await fungiTableComponent.init();
  })
}

export default fungiTableComponent;