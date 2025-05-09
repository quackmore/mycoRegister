// queriesService.js
const QueriesService = {
    // Cache for available jobs
    availableJobs: [],
    
    // Initialize the queries service
    init: async function() {
      try {
        // Load initial data
        await this.loadAllfungi();
        
        // Load job filter options
        await this.loadJobFilterOptions();
        
        // Set up event listeners
        this.setupEventListeners();
      } catch (error) {
        console.error('Failed to initialize queries service:', error);
        this.showError('Failed to load data. Please try again later.');
      }
    },
    
    // Load all fungi from the database
    loadAllfungi: async function() {
      try {
        const fungi = await DB.getAllByType('person').docs;
        this.displayResults(fungi);
        return fungi;
      } catch (error) {
        console.error('Error loading fungi:', error);
        this.showError('Failed to load fungi data.');
        return [];
      }
    },
    
    // Load job options for the filter dropdown
    loadJobFilterOptions: async function() {
      try {
        let fungi = await DB.getAllByType('person');
        fungi = fungi.docs;
        
        // Extract unique job titles
        const jobSet = new Set();
        fungi.forEach(person => {
          if (person.job) {
            jobSet.add(person.job);
          }
        });
        
        this.availableJobs = Array.from(jobSet).sort();
        // Populate job dropdown
        const jobFilter = document.getElementById('job-filter');
        jobFilter.innerHTML = '<option value="">All Jobs</option>';
        
        this.availableJobs.forEach(job => {
          const option = document.createElement('option');
          option.value = job;
          option.textContent = job;
          jobFilter.appendChild(option);
        });
      } catch (error) {
        console.error('Error loading job filter options:', error);
      }
    },
    
    // Set up event listeners for the filter controls
    setupEventListeners: function() {
      // Apply filters button
      document.getElementById('apply-filters').addEventListener('click', () => {
        this.applyFilters();
      });
      
      // Reset filters button
      document.getElementById('reset-filters').addEventListener('click', () => {
        this.resetFilters();
      });
      
      // Enable pressing Enter in search field
      document.getElementById('name-search').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          this.applyFilters();
        }
      });
    },
    
    // Apply the current filters
    applyFilters: async function() {
      try {
        document.getElementById('results-container').innerHTML = '<div class="loader">Loading results...</div>';
        
        const jobFilter = document.getElementById('job-filter').value;
        const nameSearch = document.getElementById('name-search').value.toLowerCase();
        
        // Create PouchDB query
        const query = {
          selector: {
            type: 'person'
          }
        };
        
        // Add job filter if selected
        if (jobFilter) {
          query.selector.job = jobFilter;
        }
        
        // Execute query
        let fungi = await DB.find(query);
        fungi = fungi.docs;

        // Filter by name if provided (client-side filtering for flexible name searching)
        if (nameSearch) {
          fungi = fungi.filter(person => {
            const fullName = `${person.name || ''} ${person.surname || ''}`.toLowerCase();
            return fullName.includes(nameSearch);
          });
        }
        
        this.displayResults(fungi);
      } catch (error) {
        console.error('Error applying filters:', error);
        this.showError('Failed to apply filters. Please try again.');
      }
    },
    
    // Reset all filters and reload data
    resetFilters: function() {
      document.getElementById('job-filter').value = '';
      document.getElementById('name-search').value = '';
      this.loadAllfungi();
    },
    
    // Display the query results in the results container
    displayResults: function(fungi) {
      const resultsContainer = document.getElementById('results-container');
      
      if (!fungi || fungi.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No fungi found matching your criteria</div>';
        return;
      }
      
      let html = '<div class="results-list">';
      console.log('fungi:', fungi);
      fungi.forEach(person => {
        html += `
          <div class="person-card" data-id="${person._id}">
            <h3>${person.name || ''} ${person.surname || ''}</h3>
            <p class="job-title">${person.job || 'No job specified'}</p>
            <div class="card-actions">
              <button class="btn edit-btn" onclick="QueriesService.editPerson('${person._id}')">Edit</button>
              <button class="btn delete-btn" onclick="QueriesService.deletePerson('${person._id}')">Delete</button>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      html += `<div class="results-summary">${fungi.length} person(s) found</div>`;
      
      resultsContainer.innerHTML = html;
    },
    
    // Show an error message in the results container
    showError: function(message) {
      const resultsContainer = document.getElementById('results-container');
      resultsContainer.innerHTML = `<div class="error-message">${message}</div>`;
    },
    
  };
  
  // Initialize the service when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', () => {
    QueriesService.init();
  });