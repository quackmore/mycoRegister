// db.js - Database service for local PouchDB operations

class DBService {
  constructor() {
      // State
      this.local = null;
      this.initPromise = null;
      this.DB_VERSION_KEY = 'pouchdb_initialized_version';
      this.CURRENT_VERSION = '1';
      
      // Event handling
      this.eventTarget = new EventTarget();
      
      // Initialize
      this.init();
  }

  // Event subscription methods
  addEventListener(event, callback) {
      this.eventTarget.addEventListener(event, callback);
  }
  
  removeEventListener(event, callback) {
      this.eventTarget.removeEventListener(event, callback);
  }
  
  // Dispatch events to subscribers
  dispatchEvent(eventName, detail = {}) {
      const event = new CustomEvent(eventName, { detail });
      this.eventTarget.dispatchEvent(event);
  }

  // Initialize the database
  init() {
      if (this.initPromise) return this.initPromise;
      if (this.local) return Promise.resolve(this.local);
      
      this.local = new PouchDB('inventory');
      console.log('Local database initialized');
      
      // Check if another page already initialized this version
      const storedVersion = localStorage.getItem(this.DB_VERSION_KEY);
      
      if (storedVersion === this.CURRENT_VERSION) {
          // Skip index creation, just return the DB
          this.initPromise = Promise.resolve(this.local);
      } else {
          // Create indexes and update version
          this.initPromise = this.local.createIndex({
              index: { fields: ['type', 'name', 'surname', 'job'] }
          }).then(() => {
              localStorage.setItem(this.DB_VERSION_KEY, this.CURRENT_VERSION);
              console.log('Database indexes created');
              return this.local;
          });
      }
      
      // Listen for changes
      this.local.changes({
          since: 'now',
          live: true,
          include_docs: true
      }).on('change', (change) => {
          this.dispatchEvent('db:changed', { change });
      });
      
      return this.initPromise;
  }

  // Get the local database instance
  getLocalDb() {
      return this.local;
  }

  // Create or update a document
  async put(doc) {
      try {
          await this.init();
          const result = await this.local.put(doc);
          this.dispatchEvent('db:document-updated', { id: doc._id });
          return result;
      } catch (error) {
          console.error('Error updating document:', error);
          this.dispatchEvent('db:error', { error });
          throw error;
      }
  }

  // Get a document by ID
  async get(id) {
      try {
          await this.init();
          const doc = await this.local.get(id);
          return doc;
      } catch (error) {
          console.error('Error getting document:', error);
          this.dispatchEvent('db:error', { error });
          throw error;
      }
  }

  // Remove a document
  async remove(docOrId) {
      try {
          await this.init();
          
          // If docOrId is just an ID string, get the document first
          let doc = docOrId;
          if (typeof docOrId === 'string') {
              doc = await this.local.get(docOrId);
          }
          
          const result = await this.local.remove(doc);
          this.dispatchEvent('db:document-removed', { id: doc._id });
          return result;
      } catch (error) {
          console.error('Error removing document:', error);
          this.dispatchEvent('db:error', { error });
          throw error;
      }
  }

  // Find documents by query
  async find(query) {
      try {
          await this.init();
          const result = await this.local.find(query);
          return result;
      } catch (error) {
          console.error('Error finding documents:', error);
          this.dispatchEvent('db:error', { error });
          throw error;
      }
  }

  // Get all documents of a specific type
  async getAllByType(type) {
      try {
          await this.init();
          
          const result = await this.local.find({
              selector: { type: type }
          });
          
          // Sort in memory
          result.docs.sort((a, b) => {
              if (a.name < b.name) return -1;
              if (a.name > b.name) return 1;
              if (a.surname < b.surname) return -1;
              if (a.surname > b.surname) return 1;
              return 0;
          });
          
          return result;
      } catch (error) {
          console.error('Error getting documents by type:', error);
          this.dispatchEvent('db:error', { error });
          throw error;
      }
  }

  // Query documents with pagination
  async queryWithPagination(query, page = 1, limit = 10) {
      try {
          await this.init();
          
          // Add pagination to query
          const paginatedQuery = {
              ...query,
              limit: limit,
              skip: (page - 1) * limit
          };
          
          const result = await this.local.find(paginatedQuery);
          return result;
      } catch (error) {
          console.error('Error querying documents with pagination:', error);
          this.dispatchEvent('db:error', { error });
          throw error;
      }
  }

  // Bulk operations
  async bulkDocs(docs) {
      try {
          await this.init();
          const result = await this.local.bulkDocs(docs);
          this.dispatchEvent('db:bulk-update');
          return result;
      } catch (error) {
          console.error('Error with bulk operation:', error);
          this.dispatchEvent('db:error', { error });
          throw error;
      }
  }

  // Get database info
  async getInfo() {
      try {
          await this.init();
          return await this.local.info();
      } catch (error) {
          console.error('Error getting database info:', error);
          this.dispatchEvent('db:error', { error });
          throw error;
      }
  }

  // Clear database (for testing or reset)
  async clear() {
      try {
          await this.init();
          const allDocs = await this.local.allDocs();
          
          const docsToDelete = allDocs.rows.map(row => ({
              _id: row.id,
              _rev: row.value.rev,
              _deleted: true
          }));
          
          if (docsToDelete.length > 0) {
              const result = await this.local.bulkDocs(docsToDelete);
              this.dispatchEvent('db:cleared');
              return result;
          }
          
          return [];
      } catch (error) {
          console.error('Error clearing database:', error);
          this.dispatchEvent('db:error', { error });
          throw error;
      }
  }
}

// Create and export singleton instance
const dbService = new DBService();

// Make it accessible globally
window.dbService = dbService;

// Initialize database when the script loads
document.addEventListener('DOMContentLoaded', async () => {
  try {
      await dbService.init();
      console.log('Database fully initialized and ready for use');
  } catch (error) {
      console.error('Failed to initialize database:', error);
  }
});

export default dbService;