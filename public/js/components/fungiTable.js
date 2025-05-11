// fungiTable.js - Component for displaying fungi samples in a responsive table

class FungiTableComponent {
  constructor() {
    // DOM elements
    this.tableBody = document.getElementById('fungi-table-body');
    this.searchInput = document.getElementById('search-fungi');
    this.newButton = document.getElementById('new-fungi-btn');
    this.editButton = document.getElementById('edit-fungi-btn');
    this.deleteButton = document.getElementById('delete-fungi-btn');
    this.noRecordsMessage = document.getElementById('no-records-message');
    
    // Component state
    this.fungiSamples = [];
    this.selectedSampleId = null;
    this.isLoading = true;
    
    // Initialize
    this.init();
  }
  
  async init() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Load initial data
    await this.loadFungiSamples();
    
    // Set up sync listeners
    this.setupSyncListeners();
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
  }
  
  setupSyncListeners() {
    // Listen for sync state changes
    // window.dbService.addEventListener('sync:state-changed', this.handleSyncStateChanged.bind(this));
    
    // Listen for sync changes that might affect our data
    window.dbService.addEventListener('sync:change', this.handleSyncDataChange.bind(this));
  }
  
  async loadFungiSamples(searchTerm = '') {
    this.setLoading(true);
    
    try {
      // Use search if provided, otherwise get all samples
      if (searchTerm) {
        this.fungiSamples = await window.FungiService.search(searchTerm);
      } else {
        this.fungiSamples = await window.FungiService.getAll();
      }
      
      // Render the data
      this.renderTable();
    } catch (error) {
      console.error('Error loading fungi samples:', error);
      this.showError('Failed to load fungi samples. Please try again.');
    } finally {
      this.setLoading(false);
    }
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
      
      // Create cell content
      row.innerHTML = `
        <td>${this.escapeHtml(sample.taxonGenus || '')}</td>
        <td>${this.escapeHtml(sample.taxonSpecies || '')}</td>
        <td>${this.formatDate(sample.collectionDate)}</td>
        <td>${this.escapeHtml(sample.locality || '')}</td>
        <td class="hide-mobile">${this.escapeHtml(sample.collector || '')}</td>
        <td class="hide-mobile">${this.escapeHtml(sample.habitat || '')}</td>
      `;
      
      this.tableBody.appendChild(row);
    });
  }
  
  setLoading(isLoading) {
    this.isLoading = isLoading;
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
    
    if (confirm(`Are you sure you want to delete ${selectedSample.taxonGenus} ${selectedSample.taxonSpecies}?`)) {
      try {
        await window.FungiService.delete(selectedSample._id);
        
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
        this.showError('Failed to delete fungi sample. Please try again.');
      }
    }
  }
  
  // handleSyncStateChanged(event) {
  //   const { newState } = event.detail;
  //   
  //   // Update sync status indicator
  //   this.syncStatus.classList.toggle('active', newState !== 'inactive' && newState !== 'complete');
  //   
  //   const statusTextEl = this.syncStatus.querySelector('.status-text');
  //   switch (newState) {
  //     case 'change':
  //       statusTextEl.textContent = 'Syncing changes...';
  //       break;
  //     default:
  //       this.syncStatus.classList.remove('active');
  //   }
  // }
  
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
    
    return unsafe
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the component
  window.fungiTableComponent = new FungiTableComponent();
});