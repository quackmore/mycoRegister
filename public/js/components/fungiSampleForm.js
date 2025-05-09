// Fungi Sample Form Component
const FungiSampleForm = {
  // Properties
  currentId: null,
  isEditing: false,
  autoCompleteData: {},

  // Initialize form
  init: async function () {
    const formContainer = document.getElementById('fungi-sample-form-container');
    if (!formContainer) return;

    // Get form elements
    this.form = document.getElementById('fungi-sample-form');
    this.formTitle = document.getElementById('form-title');
    this.fungiIdInput = document.getElementById('fungi-id');
    this.cancelBtn = document.getElementById('cancel-edit');

    // Get all form input fields
    this.formFields = {};
    window.fungiSampleModel.allFields.forEach(field => {
      // Skip type and fields starting with _
      if (field === 'type' || field.startsWith('_')) return;

      this.formFields[field] = document.getElementById(field);
    });

    // Fetch and set up autocomplete data
    await this.setupAutocompleteData();

    // Set up event listeners
    this.setupEventListeners();
  },

  // Fetch autocomplete data for all fields
  setupAutocompleteData: async function () {
    try {
      for (const field in this.formFields) {
        if (this.formFields[field]) {
          // Get unique values for this field
          const values = await FungiService.getAllUniqueValues(field);
          this.autoCompleteData[field] = values;

          // Set up autocomplete for this field
          this.setupFieldAutocomplete(field, values);
        }
      }
    } catch (err) {
      console.error('Error setting up autocomplete data', err);
    }
  },

  // Set up autocomplete for a specific field
  setupFieldAutocomplete: function (field, values) {
    const inputElement = this.formFields[field];
    if (!inputElement) return;

    // Disable browser's default autocomplete
    inputElement.setAttribute('autocomplete', 'off');

    // Create autocomplete container
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'autocomplete-container';
    autocompleteContainer.style.display = 'none';
    autocompleteContainer.style.position = 'absolute';
    autocompleteContainer.style.width = '100%';
    autocompleteContainer.style.maxHeight = '200px';
    autocompleteContainer.style.overflowY = 'auto';
    autocompleteContainer.style.backgroundColor = '#fff';
    autocompleteContainer.style.border = '1px solid #ddd';
    autocompleteContainer.style.borderTop = 'none';
    autocompleteContainer.style.zIndex = '1000';

    // Insert container after input
    inputElement.parentNode.style.position = 'relative';
    inputElement.parentNode.insertBefore(autocompleteContainer, inputElement.nextSibling);

    // Add input event listener
    inputElement.addEventListener('input', () => {
      const inputValue = inputElement.value.trim().toLowerCase();

      // Close autocomplete list if input is empty
      if (!inputValue) {
        autocompleteContainer.style.display = 'none';
        return;
      }

      // Filter values
      const matches = values.filter(value =>
        value && value.toString().toLowerCase().includes(inputValue)
      );

      // Display matches
      if (matches.length > 0) {
        autocompleteContainer.innerHTML = '';
        autocompleteContainer.style.display = 'block';

        matches.forEach(match => {
          const item = document.createElement('div');
          item.className = 'autocomplete-item';
          item.textContent = match;
          item.style.padding = '10px';
          item.style.cursor = 'pointer';

          item.addEventListener('click', () => {
            inputElement.value = match;
            autocompleteContainer.style.display = 'none';
          });

          item.addEventListener('mouseover', () => {
            item.style.backgroundColor = '#f0f0f0';
          });

          item.addEventListener('mouseout', () => {
            item.style.backgroundColor = '';
          });

          autocompleteContainer.appendChild(item);
        });
      } else {
        autocompleteContainer.style.display = 'none';
      }
    });

    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target !== inputElement) {
        autocompleteContainer.style.display = 'none';
      }
    });

    // Handle keyboard navigation
    inputElement.addEventListener('keydown', (e) => {
      const items = autocompleteContainer.querySelectorAll('.autocomplete-item');
      let activeItem = autocompleteContainer.querySelector('.autocomplete-item.active');

      // Down arrow
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!activeItem) {
          if (items[0]) {
            items[0].classList.add('active');
            items[0].style.backgroundColor = '#f0f0f0';
          }
        } else {
          const nextItem = activeItem.nextElementSibling;
          if (nextItem) {
            activeItem.classList.remove('active');
            activeItem.style.backgroundColor = '';
            nextItem.classList.add('active');
            nextItem.style.backgroundColor = '#f0f0f0';
          }
        }
      }

      // Up arrow
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeItem) {
          const prevItem = activeItem.previousElementSibling;
          if (prevItem) {
            activeItem.classList.remove('active');
            activeItem.style.backgroundColor = '';
            prevItem.classList.add('active');
            prevItem.style.backgroundColor = '#f0f0f0';
          }
        }
      }

      // Enter
      else if (e.key === 'Enter' && activeItem) {
        e.preventDefault();
        inputElement.value = activeItem.textContent;
        autocompleteContainer.style.display = 'none';
      }

      // Escape
      else if (e.key === 'Escape') {
        autocompleteContainer.style.display = 'none';
      }
    });
  },

  // Set up event listeners
  setupEventListeners: function () {
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
  handleSubmit: async function () {
    try {
      // Validate form data
      if (!this.validateForm()) {
        return;
      }

      // Get form data
      const fungiSampleData = this.getFormData();

      // Determine if creating or updating
      let result;
      if (this.isEditing) {
        result = await FungiService.update(fungiSampleData);
      } else {
        result = await FungiService.create(fungiSampleData);
      }

      // Reset form
      this.resetForm();

      // Show success message
      this.showMessage('success', `Fungi sample ${this.isEditing ? 'updated' : 'created'} successfully`);

      // Trigger event to refresh fungi sample list
      window.dispatchEvent(new CustomEvent('fungi-sample-saved'));

    } catch (err) {
      console.error('Error saving fungi sample', err);
      this.showMessage('error', `Error ${this.isEditing ? 'updating' : 'creating'} fungi sample`);
    }
  },

  // Get form data
  getFormData: function () {
    const fungiSample = {};

    // Get values from all form fields
    for (const field in this.formFields) {
      if (this.formFields[field]) {
        fungiSample[field] = this.formFields[field].value.trim();
      }
    }

    // Add ID if editing
    if (this.isEditing && this.currentId) {
      fungiSample._id = this.currentId;
    }

    return fungiSample;
  },

  // Validate form data
  validateForm: function () {
    // Clear previous error messages
    const errorElements = this.form.querySelectorAll('.error-message');
    errorElements.forEach(el => el.remove());

    let isValid = true;

    // Validate required fields
    window.fungiSampleModel.requiredFields.forEach(field => {
      const inputElement = this.formFields[field];
      if (inputElement && !inputElement.value.trim()) {
        this.showInputError(inputElement, `${this.formatFieldName(field)} is required`);
        isValid = false;
      }
    });

    return isValid;
  },

  // Format field name for display
  formatFieldName: function (field) {
    // Convert camelCase to Title Case
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  },

  // Show input error
  showInputError: function (inputElement, message) {
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
  showMessage: function (type, message) {
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

  // Load fungi sample data into form for editing
  loadFungiSampleForEdit: async function (fungiSampleId) {
    try {
      // Get fungi sample data
      const fungiSample = await FungiService.getById(fungiSampleId);

      // Set form to edit mode
      this.isEditing = true;
      this.currentId = fungiSampleId;
      this.formTitle.textContent = 'Edit Fungi Sample';

      // Set form values for all fields
      for (const field in this.formFields) {
        if (this.formFields[field] && fungiSample[field] !== undefined) {
          this.formFields[field].value = fungiSample[field] || '';
        }
      }

      this.fungiIdInput.value = fungiSampleId;

      // Scroll to form
      this.form.scrollIntoView({ behavior: 'smooth' });

      // Focus first field
      const firstField = Object.values(this.formFields)[0];
      if (firstField) firstField.focus();

    } catch (err) {
      console.error('Error loading fungi sample for edit', err);
      this.showMessage('error', 'Error loading fungi sample data');
    }
  },

  // Reset form
  resetForm: function () {
    // Clear form
    this.form.reset();

    // Reset edit mode
    this.isEditing = false;
    this.currentId = null;
    this.formTitle.textContent = 'Add New Fungi Sample';
    this.fungiIdInput.value = '';

    // Clear any error styling
    for (const field in this.formFields) {
      if (this.formFields[field]) {
        this.formFields[field].style.borderColor = '';
      }
    }
  }
};

// Initialize form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  FungiSampleForm.init();
});