/**
 * Modal Utility
 * Allows for easy creation and management of modal dialogs
 */
const ModalUtils = (function () {
    // Private variables to track active modals
    let activeModals = {};
    let modalCounter = 0;

    /**
     * Creates a modal with the specified title and populate function
     * @param {string} title - The title for the modal header
     * @param {Function} populate - Function that will be called to populate the modal body
     * @param {Object} options - Additional options for the modal
     * @returns {Object} Modal control methods
     */
    function createModal(title, populate, options = {}) {
        const modalId = options.id || `dynamic-modal-${modalCounter++}`;

        // Check if modal already exists and remove it if it does
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal structure
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';

        // Add any custom classes if provided
        if (options.className) {
            modal.className += ` ${options.className}`;
        }

        modal.innerHTML = `
            <div class="modal-content">
              <div class="modal-header">
                <h2 id="${modalId}-title">${title}</h2>
                <span class="close-modal" id="${modalId}-close">&times;</span>
              </div>
              <div class="modal-body" id="${modalId}-body">
              </div>
            </div>
          `;

        // Add to DOM
        document.body.appendChild(modal);

        // Get elements
        const modalBody = document.getElementById(`${modalId}-body`);
        const closeButton = document.getElementById(`${modalId}-close`);

        // Setup close functionality
        closeButton.addEventListener('click', () => {
            closeModal(modalId);
        });

        // Close modal when clicking outside content
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal(modalId);
            }
        });

        // Add ESC key listener
        const keyHandler = (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                closeModal(modalId);
            }
        };
        document.addEventListener('keydown', keyHandler);

        // Store modal info
        activeModals[modalId] = {
            element: modal,
            keyHandler: keyHandler,
            populateFunction: populate
        };

        // Call populate function if provided
        if (typeof populate === 'function') {
            populate(modalBody, modal);
        }

        // Return modal control methods
        return {
            show: () => showModal(modalId),
            hide: () => closeModal(modalId),
            destroy: () => destroyModal(modalId),
            update: (newPopulate) => updateModal(modalId, newPopulate),
            updateTitle: (newTitle) => updateModalTitle(modalId, newTitle),
            getElement: () => modal,
            getBodyElement: () => modalBody,
            getId: () => modalId
        };
    }

    /**
     * Updates the modal title
     * @param {string} modalId - ID of the modal to update
     * @param {string} newTitle - New title text
     */
    function updateModalTitle(modalId, newTitle) {
        const titleElement = document.getElementById(`${modalId}-title`);
        if (titleElement) {
            titleElement.textContent = newTitle;
        }
    }

    /**
     * Updates the modal content
     * @param {string} modalId - ID of the modal to update
     * @param {Function} newPopulate - New populate function
     */
    function updateModal(modalId, newPopulate) {
        const modalInfo = activeModals[modalId];
        if (!modalInfo) return;

        const modalBody = document.getElementById(`${modalId}-body`);
        if (modalBody) {
            // Clear existing content
            modalBody.innerHTML = '';

            // Update stored populate function
            if (typeof newPopulate === 'function') {
                modalInfo.populateFunction = newPopulate;
                newPopulate(modalBody, modalInfo.element);
            }
        }
    }

    /**
     * Shows the specified modal
     * @param {string} modalId - ID of the modal to show
     */
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';

            // Add animation class if it exists
            setTimeout(() => {
                modal.classList.add('modal-open');
            }, 10);
        }
    }

    /**
     * Closes the specified modal
     * @param {string} modalId - ID of the modal to close
     */
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('modal-open');

            // Allow time for animation to complete
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Completely removes a modal from the DOM
     * @param {string} modalId - ID of the modal to destroy
     */
    function destroyModal(modalId) {
        const modalInfo = activeModals[modalId];
        if (!modalInfo) return;

        // Remove event listeners
        document.removeEventListener('keydown', modalInfo.keyHandler);

        // Remove from DOM
        modalInfo.element.remove();

        // Remove from activeModals
        delete activeModals[modalId];
    }

    // Public API
    return {
        create: createModal,
        show: showModal,
        close: closeModal,
        destroy: destroyModal,
        update: updateModal,
        updateTitle: updateModalTitle
    };
})();

export default ModalUtils;

/*
Example usage:
const myModal = ModalUtils.create('Some Modal', function(modalBody) {
  modalBody.innerHTML = '<p>This is the modal content!</p>';
});
myModal.show();

If the populate function adds complex event listeners, and/or allocates memory it's a good practice to return a cleanup function

const myModal = ModalUtils.create('Interactive Modal', function(modalBody) {
  const form = document.createElement('form');
  const someGlobalData = window.myAppData; // Reference to external data
  
  const submitHandler = function(e) {
    e.preventDefault();
    processData(someGlobalData); // Uses external data
  };
  
  form.addEventListener('submit', submitHandler);
  modalBody.appendChild(form);
  
  // Return a cleanup function (not used by the utility but good practice)
  return function cleanup() {
    form.removeEventListener('submit', submitHandler);
    // Clear any other references
  };
});

// Later, before destroying:
if (myModal.cleanup && typeof myModal.cleanup === 'function') {
  myModal.cleanup();
}
myModal.destroy();
*/
/*
REFERENCE CSS
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.modal-open {
  opacity: 1;
}

.modal-content {
  background-color: #fefefe;
  margin: 10% auto;
  padding: 0;
  border: 1px solid #888;
  width: 80%;
  max-width: 600px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  position: relative;
  transform: translateY(-20px);
  transition: transform 0.3s ease;
}

.modal-open .modal-content {
  transform: translateY(0);
}

.modal-header {
  padding: 15px;
  background-color: #f8f8f8;
  border-bottom: 1px solid #e7e7e7;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-modal {
  color: #aaa;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
  line-height: 20px;
}

.close-modal:hover,
.close-modal:focus {
  color: #000;
  text-decoration: none;
}

.modal-body {
  padding: 15px;
}
*/