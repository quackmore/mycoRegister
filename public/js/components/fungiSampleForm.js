// Fungi Sample Form Component
import fungiSampleModel from '../models/fungiSample.js';
import FungiService from '../services/fungiService.js';

const FungiSampleForm = {
  // Properties
  currentId: null,
  isEditing: false,
  autoCompleteData: {},
  isFormDirty: false,
  originalFormData: {},
  // Cache for genus-species-authority combinations
  genusSpeciesAuthorityCache: {},

  // Initialize form
  init: async function () {
    // Add sample types to the model if not already present
    if (!fungiSampleModel.sampleTypes) {
      // Default sample types if not defined in the model
      fungiSampleModel.sampleTypes = [
        { value: 'exsiccata', label: 'exsiccata' },
        { value: 'collected', label: 'raccolto' }
      ];
    }

    // Get modal elements
    this.modal = document.getElementById('fungi-sample-modal');
    if (!this.modal) return;

    // this.openModalBtn = document.getElementById('open-fungi-modal');
    this.closeModalBtn = document.querySelector('.close-modal');

    // Get form elements
    this.form = document.getElementById('fungi-sample-form');
    this.formTitle = document.getElementById('form-title');
    this.fungiIdInput = document.getElementById('fungi-id');
    this.cancelBtn = document.getElementById('cancel-edit');
    this.sampleTypeSelect = document.getElementById('sampleType');
    this.exsiccataCodeRow = document.getElementById('exsiccataCodeRow');

    // Get all form input fields
    this.formFields = {};
    fungiSampleModel.allFields.forEach(field => {
      // Skip type and fields starting with _
      if (field === 'type' || field.startsWith('_')) return;

      const element = document.getElementById(field);
      if (element) {
        this.formFields[field] = element;
      }
    });

    // Populate sample type dropdown
    this.populateSampleTypes();

    // Fetch genus-species-authority combinations
    await this.fetchGenusSpeciesAuthorities();

    // Fetch and set up autocomplete data
    await this.setupAutocompleteData();

    // Set up event listeners
    this.setupEventListeners();
  },

  // Populate sample types dropdown
  populateSampleTypes: function () {
    const sampleTypes = fungiSampleModel.sampleTypes;
    if (sampleTypes && sampleTypes.length > 0) {
      sampleTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = this.formatFieldName(type.label);
        this.sampleTypeSelect.appendChild(option);
      });
    }
  },

  // Fetch genus-species-authority combinations
  fetchGenusSpeciesAuthorities: async function () {
    try {
      // You'll need to add this method to your FungiService
      const combinations = await FungiService.getGenusSpeciesAuthorities();

      // Create a lookup map: "Genus species" -> "Authority"
      this.genusSpeciesAuthorityCache = {};
      combinations.forEach(combo => {
        if (combo.taxonGenus && combo.taxonSpecies && combo.authority) {
          const key = `${combo.taxonGenus.trim()} ${combo.taxonSpecies.trim()}`.toLowerCase();
          this.genusSpeciesAuthorityCache[key] = combo.authority;
        }
      });

      console.log('Genus-species-authority cache loaded:', Object.keys(this.genusSpeciesAuthorityCache).length, 'entries');
    } catch (err) {
      console.error('Error fetching genus-species-authority combinations:', err);
    }
  },

  refreshAuthorityCache: async function () {
    await this.fetchGenusSpeciesAuthorities();
  },

  // Fetch autocomplete data for all fields
  refreshAutocompleteData: async function () {
    try {
      for (const field in this.formFields) {
        // Skip select elements (already have options)
        if (this.formFields[field].tagName === 'SELECT') continue;

        // Get unique values for this field
        const values = await FungiService.getAllUniqueValues(field);
        this.autoCompleteData[field] = values;

        // Don't recreate the autocomplete setup, just update the data
        // The existing event listeners will use the updated this.autoCompleteData[field]
      }
      console.log('Autocomplete data refreshed');
    } catch (err) {
      console.error('Error refreshing autocomplete data', err);
    }
  },

  // Modify the setupAutocompleteData method to only run once during initialization
  setupAutocompleteData: async function () {
    try {
      for (const field in this.formFields) {
        // Skip select elements (already have options)
        if (this.formFields[field].tagName === 'SELECT') continue;

        // Get unique values for this field
        const values = await FungiService.getAllUniqueValues(field);
        this.autoCompleteData[field] = values;

        // Set up autocomplete for this field (only during initialization)
        this.setupFieldAutocomplete(field, values);
      }
    } catch (err) {
      console.error('Error setting up autocomplete data', err);
    }
  },

  // Set up autocomplete for a specific field
  setupFieldAutocomplete: function (field, initialValues) {
    const inputElement = this.formFields[field];
    if (!inputElement || inputElement.tagName === 'SELECT') return;

    // Check if autocomplete is already set up for this field
    if (inputElement.hasAttribute('data-autocomplete-setup')) {
      return; // Already set up, don't duplicate
    }

    // Mark as set up
    inputElement.setAttribute('data-autocomplete-setup', 'true');

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

    // Store reference to container on the input element
    inputElement.autocompleteContainer = autocompleteContainer;

    // Insert container after input
    inputElement.parentNode.style.position = 'relative';
    inputElement.parentNode.insertBefore(autocompleteContainer, inputElement.nextSibling);

    // Add input event listener
    inputElement.addEventListener('input', () => {
      this.isFormDirty = true;
      const inputValue = inputElement.value.trim().toLowerCase();

      // Close autocomplete list if input is empty
      if (!inputValue) {
        autocompleteContainer.style.display = 'none';
        return;
      }

      // Use current data from this.autoCompleteData (this will be updated when refreshed)
      const currentValues = this.autoCompleteData[field] || [];

      // Filter values
      const matches = currentValues.filter(value =>
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

          item.addEventListener('click', () => {
            inputElement.value = match;
            autocompleteContainer.style.display = 'none';
            this.isFormDirty = true;
          });

          item.addEventListener('mouseover', () => {
            item.classList.add('active');
          });

          item.addEventListener('mouseout', () => {
            item.classList.remove('active');
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
          }
        } else {
          const nextItem = activeItem.nextElementSibling;
          if (nextItem) {
            activeItem.classList.remove('active');
            nextItem.classList.add('active');
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
            prevItem.classList.add('active');
          }
        }
      }

      // Enter
      else if (e.key === 'Enter' && activeItem) {
        e.preventDefault();
        inputElement.value = activeItem.textContent;
        autocompleteContainer.style.display = 'none';
        this.isFormDirty = true;
      }

      // Escape
      else if (e.key === 'Escape') {
        autocompleteContainer.style.display = 'none';
      }
    });
  },

  validateBinomialNomenclature: function (value, type) {
    if (!value || !value.trim()) return value;

    let formatted = value.trim();

    if (type === 'genus') {
      // Genus should be capitalized and contain only letters
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
      // Remove any non-letter characters except spaces/hyphens for compound names
      formatted = formatted.replace(/[^a-zA-Z\s-]/g, '');
    } else if (type === 'species') {
      // Species should be lowercase and contain only letters
      formatted = formatted.toLowerCase();
      // Remove any non-letter characters except spaces/hyphens
      formatted = formatted.replace(/[^a-zA-Z\s-]/g, '');
    }

    return formatted;
  },

  // Check and auto-complete authority field
  checkAndAutoCompleteAuthority: function () {
    const genusField = this.formFields.taxonGenus;
    const speciesField = this.formFields.taxonSpecies;
    const authorityField = this.formFields.authority;

    if (!genusField || !speciesField || !authorityField) return;

    const genus = genusField.value.trim();
    const species = speciesField.value.trim();

    if (!genus || !species) {
      // Clear authority if genus or species is empty
      if (!authorityField.value.trim() || authorityField.dataset.autoCompleted === 'true') {
        authorityField.value = '';
        authorityField.dataset.autoCompleted = 'false';
      }
      return;
    }

    const key = `${genus} ${species}`.toLowerCase();
    const foundAuthority = this.genusSpeciesAuthorityCache[key];

    if (foundAuthority) {
      // Only auto-complete if authority field is empty or was previously auto-completed
      if (!authorityField.value.trim() || authorityField.dataset.autoCompleted === 'true') {
        authorityField.value = foundAuthority;
        authorityField.dataset.autoCompleted = 'true';
      }
    } else {
      // Clear authority if it was auto-completed but combination no longer exists
      if (authorityField.dataset.autoCompleted === 'true') {
        authorityField.value = '';
        authorityField.dataset.autoCompleted = 'false';
      }
    }
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
      this.attemptToCloseForm();
    });

    // Close modal button
    if (this.closeModalBtn) {
      this.closeModalBtn.addEventListener('click', () => {
        this.attemptToCloseForm();
      });
    }

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.attemptToCloseForm();
      }
    });

    // Sample type change
    this.sampleTypeSelect.addEventListener('change', () => {
      this.toggleExsiccataCodeField();
      this.isFormDirty = true;
    });

    // Track form changes with binomial nomenclature validation and authority auto-completion
    for (const field in this.formFields) {
      if (this.formFields[field]) {
        // Special handling for taxonomic fields
        if (field === 'taxonGenus' || field === 'taxonSpecies') {
          this.formFields[field].addEventListener('input', (e) => {
            this.isFormDirty = true;

            // Real-time validation and formatting
            const type = field === 'taxonGenus' ? 'genus' : 'species';
            const currentValue = e.target.value;
            const formattedValue = this.validateBinomialNomenclature(currentValue, type);

            // Only update if the value actually changed (prevents cursor jumping)
            if (currentValue !== formattedValue) {
              const cursorPosition = e.target.selectionStart;
              e.target.value = formattedValue;
              // Restore cursor position
              e.target.setSelectionRange(cursorPosition, cursorPosition);
            }
          });

          // Check for authority auto-completion on blur
          this.formFields[field].addEventListener('blur', (e) => {
            const type = field === 'taxonGenus' ? 'genus' : 'species';
            const formattedValue = this.validateBinomialNomenclature(e.target.value, type);
            e.target.value = formattedValue;

            // Check and auto-complete authority after formatting
            setTimeout(() => this.checkAndAutoCompleteAuthority(), 1000);
          });
        }
        // Special handling for authority field
        else if (field === 'authority') {
          this.formFields[field].addEventListener('input', () => {
            this.isFormDirty = true;
            // Mark that user has manually edited authority
            this.formFields[field].dataset.autoCompleted = 'false';
          });
        }
        else {
          // Standard input handling for other fields
          this.formFields[field].addEventListener('input', () => {
            this.isFormDirty = true;
          });
        }
      }
    }

    // Prevent accidental navigation away from dirty form
    window.addEventListener('beforeunload', (e) => {
      if (this.isFormDirty && this.modal.style.display === 'block') {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  },

  // Toggle exsiccata code field visibility
  toggleExsiccataCodeField: function () {
    const selectedType = this.sampleTypeSelect.value;
    if (selectedType === 'exsiccata') {
      this.exsiccataCodeRow.style.display = 'flex';
    } else {
      this.exsiccataCodeRow.style.display = 'none';
    }
  },

  // Attempt to close form, checking for unsaved changes
  attemptToCloseForm: function () {
    if (this.isFormDirty) {
      const confirmClose = confirm('Ci sono modifiche non salvate. Sei sicuro di voler chiuder questa scheda?');
      if (!confirmClose) {
        return;
      }
    }

    this.closeModal();
    this.resetForm();
  },

  // Open modal
  openModal: function () {
    this.modal.style.display = 'block';

    // Reset scroll position to top - targeting your specific modal structure
    const modalContent = this.modal.querySelector('.large-form-modal-content');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }

    // Add animation class if it exists
    setTimeout(() => {
      this.modal.classList.add('modal-open');
      // Double-check scroll reset after animation
      if (modalContent) {
        modalContent.scrollTop = 0;
      }
    }, 10);
    document.body.style.overflow = 'hidden';
  },

  // Close modal
  closeModal: function () {
    this.modal.classList.remove('modal-open');

    // Allow time for animation to complete
    setTimeout(() => {
      this.modal.style.display = 'none';
    }, 300);
    document.body.style.overflow = '';
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

      // Show success message
      this.showMessage('success', `Campione ${this.isEditing ? 'aggiornato' : 'creato'}.`);

      // Reset form and close modal
      this.resetForm();
      this.closeModal();

      // Trigger event to refresh fungi sample list
      window.dispatchEvent(new CustomEvent('fungi-sample-saved'));

    } catch (err) {
      console.error('Error saving fungi sample', err);
      this.showMessage('error', `Errore ${this.isEditing ? 'aggiornando' : 'creando'} il campione`);
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

  // Save the original form data for dirty check
  saveOriginalFormData: function () {
    this.originalFormData = this.getFormData();
    this.isFormDirty = false;
  },

  // Validate form data
  validateForm: function () {
    // Clear previous error messages
    const errorElements = this.form.querySelectorAll('.error-message');
    errorElements.forEach(el => el.remove());

    let isValid = true;

    // Validate required fields
    fungiSampleModel.requiredFields.forEach(field => {
      const inputElement = this.formFields[field];
      if (inputElement && !inputElement.value.trim()) {
        this.showInputError(inputElement, `${this.formatFieldName(field)} è obbligatorio`);
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
      document.body.appendChild(messageContainer);
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
    messageContainer.style.position = 'fixed';
    messageContainer.style.top = '20px';
    messageContainer.style.right = '20px';
    messageContainer.style.zIndex = '2000';
    messageContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

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
      this.formTitle.textContent = 'Modifica campione';

      // Set form values for all fields
      for (const field in this.formFields) {
        if (this.formFields[field] && fungiSample[field] !== undefined) {
          this.formFields[field].value = fungiSample[field] || '';

          // Reset auto-completion state for authority field
          if (field === 'authority') {
            this.formFields[field].dataset.autoCompleted = 'false';
          }
        }
      }

      this.fungiIdInput.value = fungiSampleId;

      // Toggle exsiccata code field
      this.toggleExsiccataCodeField();

      // Open modal
      this.openModal();

      // Save original form data
      this.saveOriginalFormData();

    } catch (err) {
      console.error('Error loading fungi sample for edit', err);
      this.showMessage('error', 'Errore durante il caricamento dei dati.');
    }
  },

  // Reset form
  resetForm: function () {
    // Clear form
    this.form.reset();

    // Reset edit mode
    this.isEditing = false;
    this.currentId = null;
    this.formTitle.textContent = 'Aggiungi un nuovo campione';
    this.fungiIdInput.value = '';

    // Reset exsiccata code visibility
    this.exsiccataCodeRow.style.display = 'none';

    // Clear any error styling
    for (const field in this.formFields) {
      if (this.formFields[field]) {
        this.formFields[field].style.borderColor = '';
      }
    }

    // Reset form dirty state
    this.isFormDirty = false;
    this.originalFormData = {};

    if (this.modal) {
      const modalContent = this.modal.querySelector('.large-form-modal-content');
      if (modalContent) {
        modalContent.scrollTop = 0;
      }
    }
  }
};

export default FungiSampleForm;