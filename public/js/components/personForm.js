// Person Form Component
const PersonForm = {
    // Properties
    currentId: null,
    isEditing: false,
    
    // Initialize form
    init: function() {
      const formContainer = document.getElementById('person-form-container');
      if (!formContainer) return;
      
      // Get form elements
      this.form = document.getElementById('person-form');
      this.formTitle = document.getElementById('form-title');
      this.nameInput = document.getElementById('name');
      this.surnameInput = document.getElementById('surname');
      this.jobInput = document.getElementById('job');
      this.personIdInput = document.getElementById('person-id');
      this.cancelBtn = document.getElementById('cancel-edit');
      
      // Set up event listeners
      this.setupEventListeners();
    },
    
    // Set up event listeners
    setupEventListeners: function() {
      // Form submission
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
      
      // Cancel button
      this.cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetForm();
      });
    },
    
    // Handle form submission
    handleSubmit: async function() {
      try {
        // Validate form data
        if (!this.validateForm()) {
          return;
        }
        
        // Get form data
        const personData = this.getFormData();
        
        // Determine if creating or updating
        let result;
        if (this.isEditing) {
          result = await PersonService.update(personData);
        } else {
          result = await PersonService.create(personData);
        }
        
        // Reset form
        this.resetForm();
        
        // Show success message
        this.showMessage('success', `Person ${this.isEditing ? 'updated' : 'created'} successfully`);
        
        // Trigger event to refresh person list
        window.dispatchEvent(new CustomEvent('person-saved'));
        
      } catch (err) {
        console.error('Error saving person', err);
        this.showMessage('error', `Error ${this.isEditing ? 'updating' : 'creating'} person`);
      }
    },
    
    // Get form data
    getFormData: function() {
      const person = {
        name: this.nameInput.value.trim(),
        surname: this.surnameInput.value.trim(),
        job: this.jobInput.value.trim()
      };
      
      // Add ID if editing
      if (this.isEditing && this.currentId) {
        person._id = this.currentId;
      }
      
      return person;
    },
    
    // Validate form data
    validateForm: function() {
      // Clear previous error messages
      const errorElements = this.form.querySelectorAll('.error-message');
      errorElements.forEach(el => el.remove());
      
      let isValid = true;
      
      // Validate name
      if (!this.nameInput.value.trim()) {
        this.showInputError(this.nameInput, 'Name is required');
        isValid = false;
      }
      
      // Validate surname
      if (!this.surnameInput.value.trim()) {
        this.showInputError(this.surnameInput, 'Surname is required');
        isValid = false;
      }
      
      // Validate job
      if (!this.jobInput.value.trim()) {
        this.showInputError(this.jobInput, 'Job is required');
        isValid = false;
      }
      
      return isValid;
    },
    
    // Show input error
    showInputError: function(inputElement, message) {
      const errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      errorElement.textContent = message;
      errorElement.style.color = '#ea4335';
      errorElement.style.fontSize = '0.875rem';
      errorElement.style.marginTop = '0.25rem';
      
      // Insert error message after input
      inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling);
      
      // Highlight input
      inputElement.style.borderColor = '#ea4335';
      
      // Add event listener to clear error when input changes
      const clearError = () => {
        if (errorElement.parentNode) {
          errorElement.remove();
          inputElement.style.borderColor = '';
          inputElement.removeEventListener('input', clearError);
        }
      };
      
      inputElement.addEventListener('input', clearError);
    },
    
    // Show message
    showMessage: function(type, message) {
      // Check if message container exists
      let messageContainer = document.getElementById('form-message');
      
      // Create if not exists
      if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'form-message';
        this.form.parentNode.insertBefore(messageContainer, this.form);
      }
      
      // Set message
      messageContainer.textContent = message;
      messageContainer.className = `message ${type}`;
      
      // Style message
      if (type === 'success') {
        messageContainer.style.backgroundColor = '#d4edda';
        messageContainer.style.color = '#155724';
      } else {
        messageContainer.style.backgroundColor = '#f8d7da';
        messageContainer.style.color = '#721c24';
      }
      
      messageContainer.style.padding = '0.75rem';
      messageContainer.style.marginBottom = '1rem';
      messageContainer.style.borderRadius = '4px';
      
      // Clear message after delay
      setTimeout(() => {
        messageContainer.remove();
      }, 3000);
    },
    
    // Load person data into form for editing
    loadPersonForEdit: async function(personId) {
      try {
        // Get person data
        const person = await PersonService.getById(personId);
        
        // Set form to edit mode
        this.isEditing = true;
        this.currentId = personId;
        this.formTitle.textContent = 'Edit Person';
        
        // Set form values
        this.nameInput.value = person.name || '';
        this.surnameInput.value = person.surname || '';
        this.jobInput.value = person.job || '';
        this.personIdInput.value = personId;
        
        // Scroll to form
        this.form.scrollIntoView({ behavior: 'smooth' });
        
        // Focus first field
        this.nameInput.focus();
        
      } catch (err) {
        console.error('Error loading person for edit', err);
        this.showMessage('error', 'Error loading person data');
      }
    },
    
    // Reset form
    resetForm: function() {
      // Clear form
      this.form.reset();
      
      // Reset edit mode
      this.isEditing = false;
      this.currentId = null;
      this.formTitle.textContent = 'Add New Person';
      this.personIdInput.value = '';
      
      // Clear any error styling
      const inputs = [this.nameInput, this.surnameInput, this.jobInput];
      inputs.forEach(input => {
        input.style.borderColor = '';
      });
    }
  };
  
  // Initialize form when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    PersonForm.init();
  });