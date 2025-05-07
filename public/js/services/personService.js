// Service for CRUD operations on persons
const PersonService = {
    // Create a new person
    create: async function(person) {
      try {
        // Generate a unique ID
        const id = 'person:' + new Date().toISOString();
        
        // Create the document
        const doc = {
          _id: id,
          type: 'person',
          name: person.name,
          surname: person.surname,
          job: person.job,
          createdAt: new Date().toISOString()
        };
        
        const result = await window.dbService.put(doc);
        return result;
      } catch (err) {
        console.error('Error creating person', err);
        throw err;
      }
    },
    
    // Update an existing person
    update: async function(person) {
      try {
        // Get the latest version of the document
        const doc = await window.dbService.get(person._id);
        
        // Update fields
        doc.name = person.name;
        doc.surname = person.surname;
        doc.job = person.job;
        doc.updatedAt = new Date().toISOString();
        
        const result = await window.dbService.put(doc);
        return result;
      } catch (err) {
        console.error('Error updating person', err);
        throw err;
      }
    },
    
    // Delete a person
    delete: async function(personId) {
      try {
        const doc = await window.dbService.get(personId);
        const result = await window.dbService.remove(doc);
        return result;
      } catch (err) {
        console.error('Error deleting person', err);
        throw err;
      }
    },
    
    // Get all persons
    getAll: async function() {
      try {
        const result = await window.dbService.getAllByType('person');
        return result.docs;
      } catch (err) {
        console.error('Error getting all persons', err);
        throw err;
      }
    },
    
    // Get person by ID
    getById: async function(personId) {
      try {
        const doc = await window.dbService.get(personId);
        return doc;
      } catch (err) {
        console.error('Error getting person by ID', err);
        throw err;
      }
    },
    
    // Search persons by name or surname
    search: async function(searchTerm) {
      try {
        const result = await window.dbService.find({
          selector: {
            type: 'person',
            $or: [
              { name: { $regex: RegExp(searchTerm, 'i') } },
              { surname: { $regex: RegExp(searchTerm, 'i') } }
            ]
          }
        });
        return result.docs;
      } catch (err) {
        console.error('Error searching persons', err);
        throw err;
      }
    },
    
    // Filter persons by job
    filterByJob: async function(job) {
      try {
        const result = await window.dbService.find({
          selector: {
            type: 'person',
            job: job
          }
        });
        return result.docs;
      } catch (err) {
        console.error('Error filtering persons by job', err);
        throw err;
      }
    },
    
    // Get all unique jobs
    getAllJobs: async function() {
      try {
        const persons = await this.getAll();
        const jobs = [...new Set(persons.map(person => person.job))];
        return jobs;
      } catch (err) {
        console.error('Error getting all jobs', err);
        throw err;
      }
    }
  };