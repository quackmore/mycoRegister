// app.js - Example integration with your app

// This file shows how to access the authenticated DB connection
// and use it in your application

document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to be initialized
    const checkAuth = setInterval(() => {
        if (window.authManager && window.authManager.authenticated) {
            clearInterval(checkAuth);
            initializeApp();
        }
    }, 100);
});

function initializeApp() {
    // Get the PouchDB instance from AuthManager
    const db = window.authManager.db;
    
    // Now you can use the database in your application
    console.log('App initialized with authenticated database connection');
    
    // Example: Add a document
    function addDocument(data) {
        return db.post({
            ...data,
            createdAt: new Date().toISOString()
        });
    }
    
    // Example: Get all documents
    async function getAllDocuments() {
        const result = await db.allDocs({
            include_docs: true
        });
        return result.rows.map(row => row.doc);
    }
    
    // Example: Update a document
    async function updateDocument(id, updates) {
        const doc = await db.get(id);
        const updatedDoc = {
            ...doc,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        return db.put(updatedDoc);
    }
    
    // Example: Delete a document
    async function deleteDocument(id) {
        const doc = await db.get(id);
        return db.remove(doc);
    }
    
    // Your app can now use these functions to interact with the database
    // while the AuthManager handles authentication and sync
}