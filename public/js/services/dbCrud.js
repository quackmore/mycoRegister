// CRUD methods for local PouchDB operations

// using window.dbService
import dbService from './dbService.js';

class DbCrud {
    constructor() {
        // State
        this.local = dbService.getLocalDatabase();
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
        // Listen for changes
        this.local.changes({
            since: 'now',
            live: true,
            include_docs: true
        }).on('change', (change) => {
            this.dispatchEvent('db:changed', { change });
        });
    }

    // Get the local database instance
    getLocalDb() {
        // Always use the service's method to get the most current reference
        return dbService.getLocalDatabase();
    }

    // Create a document
    async post(doc) {
        try {
            // Always get the most current reference to the database
            const db = this.getLocalDb();
            const result = await db.post(doc);
            this.dispatchEvent('db:document-created', { id: result.id });
            return result;
        } catch (error) {
            console.error('Error creating document:', error);
            this.dispatchEvent('db:error', { error });
            throw error;
        }
    }

    // Update a document
    async put(doc) {
        try {
            const db = this.getLocalDb();
            const result = await db.put(doc);
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
            const db = this.getLocalDb();
            const doc = await db.get(id);
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
            const db = this.getLocalDb();
            // If docOrId is just an ID string, get the document first
            let doc = docOrId;
            if (typeof docOrId === 'string') {
                doc = await db.get(docOrId);
            }

            const result = await db.remove(doc);
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
            const db = this.getLocalDb();
            const result = await db.find(query);
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
            const db = this.getLocalDb();
            const result = await db.find({
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
            const db = this.getLocalDb();
            // Add pagination to query
            const paginatedQuery = {
                ...query,
                limit: limit,
                skip: (page - 1) * limit
            };

            const result = await db.find(paginatedQuery);
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
            const db = this.getLocalDb();
            const result = await db.bulkDocs(docs);
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
            const db = this.getLocalDb();
            return await db.info();
        } catch (error) {
            console.error('Error getting database info:', error);
            this.dispatchEvent('db:error', { error });
            throw error;
        }
    }

    // Clear database (for testing or reset)
    async clear() {
        try {
            const db = this.getLocalDb();
            const allDocs = await db.allDocs();

            const docsToDelete = allDocs.rows.map(row => ({
                _id: row.id,
                _rev: row.value.rev,
                _deleted: true
            }));

            if (docsToDelete.length > 0) {
                const result = await db.bulkDocs(docsToDelete);
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
const dbCrud = new DbCrud();
console.log('db reference for CRUD operations created');

export default dbCrud;
