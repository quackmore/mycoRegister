// Person List Component
const PersonList = {
    // Properties
    persons: [],
    listContainer: null,
    searchInput: null,
    
    // Initialize list
    init: function() {
      // Get list container
      this.listContainer = document.getElementById('fungi-list');
      if (!this.listContainer) return;
      
      // Get search input
      this.searchInput = document.getElementById('search-persons');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load initial data
      this.loadPersons();
    },
    
    // Set up event listeners
    setupEventListeners: function() {
      // Listen for person saved events
      window.addEventListener('person-saved', () => {
        this.loadPersons();
      });
      
      // Set up search functionality
      if (this.searchInput) {
        this.searchInput.addEventListener('input', this.debounce(() => {
          this.filterPersons(this.searchInput.value);
        }, 300));
      }
      
      // Listen for DB changes events
      window.addEventListener('db-changed', () => {
        this.loadPersons();
      });
    },
    
    // Load persons from database
    loadPersons: async function() {
      try {
        // Show loading indicator
        this.showLoading();
        
        // Get all persons
        this.persons = await PersonService.getAll();
        
        // Render list
        this.renderPersonList();
        
      } catch (err) {
        console.error('Error loading persons', err);
        this.showError('Failed to load persons');
      }
    },
    
    // Render person list
    renderPersonList: function() {
      // Clear list
      this.listContainer.innerHTML = '';
      
      // If no persons, show message
      if (this.persons.length === 0) {
        this.showEmptyMessage();
        return;
      }
      
      // Create list items
      this.persons.forEach(person => {
        const personCard = this.createPersonCard(person);
        this.listContainer.appendChild(personCard);
      });
    },
    
    // Create person card element
    createPersonCard: function(person) {
      const card = document.createElement('div');
      card.className = 'person-card';
      card.dataset.id = person._id;
      
      const personInfo = document.createElement('div');
      personInfo.className = 'person-info';
      
      // Create person name
      const nameElement = document.createElement('div');
      nameElement.className = 'person-name';
      nameElement.textContent = `${person.name} ${person.surname}`;
      
      // Create job info
      const jobElement = document.createElement('div');
      jobElement.className = 'person-job';
      jobElement.textContent = person.job;
      
      // Add to info container
      personInfo.appendChild(nameElement);
      personInfo.appendChild(jobElement);
      
      // Create actions
      const actions = document.createElement('div');
      actions.className = 'person-actions';
      
      // Edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'btn primary edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        // Trigger edit event
        if (typeof PersonForm !== 'undefined') {
          PersonForm.loadPersonForEdit(person._id);
        } else {
          console.error('PersonForm component not loaded');
        }
      });
      
      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn danger delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        this.confirmDelete(person);
      });
      
      // Add buttons to actions
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      
      // Add info and actions to card
      card.appendChild(personInfo);
      card.appendChild(actions);
      
      return card;
    },
    
    // Show loading indicator
    showLoading: function() {
      this.listContainer.innerHTML = `
        <div class="loader">Loading persons...</div>
      `;
    },
    
    // Show empty list message
    showEmptyMessage: function() {
      this.listContainer.innerHTML = `
        <div class="empty-message">
          <p>No persons found. Add a new person using the form.</p>
        </div>
      `;
    },
    
    // Show error message
    showError: function(message) {
      this.listContainer.innerHTML = `
        <div class="error-message" style="color: #ea4335; padding: 1rem;">
          <p>${message}</p>
          <button class="btn secondary" style="margin-top: 0.5rem;" 
            onclick="PersonList.loadPersons()">
            Try Again
          </button>
        </div>
      `;
    },
    
    // Filter persons by search term
    filterPersons: async function(searchTerm) {
      try {
        if (!searchTerm) {
          // If search is empty, load all persons
          await this.loadPersons();
          return;
        }
        
        // Show loading
        this.showLoading();
        
        // Search persons
        this.persons = await PersonService.search(searchTerm);
        
        // Render filtered list
        this.renderPersonList();
        
      } catch (err) {
        console.error('Error searching persons', err);
        this.showError('Error searching persons');
      }
    },
    
    // Confirm and delete person
    confirmDelete: function(person) {
      if (confirm(`Are you sure you want to delete ${person.name} ${person.surname}?`)) {
        this.deletePerson(person._id);
      }
    },
    
    // Delete person
    deletePerson: async function(personId) {
      try {
        // Delete person
        await PersonService.delete(personId);
        
        // Reload list
        this.loadPersons();
        
        // Show success message
        const messageContainer = document.createElement('div');
        messageContainer.textContent = 'Person deleted successfully';
        messageContainer.style.backgroundColor = '#d4edda';
        messageContainer.style.color = '#155724';
        messageContainer.style.padding = '0.75rem';
        messageContainer.style.marginBottom = '1rem';
        messageContainer.style.borderRadius = '4px';
        
        // Insert message before list
        this.listContainer.parentNode.insertBefore(messageContainer, this.listContainer);
        
        // Remove message after delay
        setTimeout(() => {
          messageContainer.remove();
        }, 3000);
        
      } catch (err) {
        console.error('Error deleting person', err);
        this.showError('Error deleting person');
      }
    },
    
    // Debounce function for search input
    debounce: function(func, delay) {
      let timeout;
      return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          func.apply(context, args);
        }, delay);
      };
    }
  };
  
  // Initialize list when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    PersonList.init();
  });