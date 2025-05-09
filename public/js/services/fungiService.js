// Service for CRUD operations on database instance
// using window.db
const FungiService = {
    // Create a new fungi sample
    create: async function(fungiSample) {
      try {
        // Let PouchDB generate the ID (recommended for replication scenarios)
        
        const currentUser = await authService.getCurrentUser();
        // Create the document
        const doc = {
          type: 'fungiSample',
          createdAt: new Date().toISOString(),
          createdBy: currentUser || null,
          updatedAt: null,
          updatedBy: null,
          taxonGenus: fungiSample.taxonGenus,
          taxonSpecies: fungiSample.taxonSpecies,
          authority: fungiSample.authority,
          collectionDate: fungiSample.collectionDate,
          collector: fungiSample.collector,
          locality: fungiSample.locality,
          localityPlace: fungiSample.localityPlace,
          localityElevation: fungiSample.localityElevation,
          localityCoordinates: fungiSample.localityCoordinates,
          habitat: fungiSample.habitat,
          substrate: fungiSample.substrate,
          associatedTaxa: fungiSample.associatedTaxa,
          notes: fungiSample.notes,
          determiner: fungiSample.determiner,
          determinationDate: fungiSample.determinationDate,
          sampleType: fungiSample.sampleType,
          exsiccataCode: fungiSample.exsiccataCode,
          picture: fungiSample.picture
        };
        
        const result = await db.post(doc);
        return result;
      } catch (err) {
        console.error('Error creating fungi sample', err);
        throw err;
      }
    },
    
    // Update an existing fungi sample
    update: async function(fungiSample) {
      try {
        // Get the latest version of the document
        const doc = await db.get(fungiSample._id);
        
        // Update fields
        doc.updatedAt = new Date().toISOString();
        doc.updatedBy = fungiSample.updatedBy || null;
        doc.taxonGenus = fungiSample.taxonGenus;
        doc.taxonSpecies = fungiSample.taxonSpecies;
        doc.authority = fungiSample.authority;
        doc.collectionDate = fungiSample.collectionDate;
        doc.collector = fungiSample.collector;
        doc.locality = fungiSample.locality;
        doc.localityPlace = fungiSample.localityPlace;
        doc.localityElevation = fungiSample.localityElevation;
        doc.localityCoordinates = fungiSample.localityCoordinates;
        doc.habitat = fungiSample.habitat;
        doc.substrate = fungiSample.substrate;
        doc.associatedTaxa = fungiSample.associatedTaxa;
        doc.notes = fungiSample.notes;
        doc.determiner = fungiSample.determiner;
        doc.determinationDate = fungiSample.determinationDate;
        doc.sampleType = fungiSample.sampleType;
        doc.exsiccataCode = fungiSample.exsiccataCode;
        doc.picture = fungiSample.picture;
        
        const result = await db.put(doc);
        return result;
      } catch (err) {
        console.error('Error updating fungi sample', err);
        throw err;
      }
    },
    
    // Delete a fungi sample
    delete: async function(fungiSampleId) {
      try {
        const doc = await db.get(fungiSampleId);
        const result = await db.remove(doc);
        return result;
      } catch (err) {
        console.error('Error deleting fungi sample', err);
        throw err;
      }
    },
    
    // Get all fungi samples
    getAll: async function() {
      try {
        const result = await db.getAllByType('fungiSample');
        return result.docs;
      } catch (err) {
        console.error('Error getting all fungi samples', err);
        throw err;
      }
    },
    
    // Get fungi sample by ID
    getById: async function(fungiSampleId) {
      try {
        const doc = await db.get(fungiSampleId);
        return doc;
      } catch (err) {
        console.error('Error getting fungi sample by ID', err);
        throw err;
      }
    },
    
    // Search fungi samples by taxon genus or taxon species
    search: async function(searchTerm) {
      try {
        const result = await db.find({
          selector: {
            type: 'fungiSample',
            $or: [
              { taxonGenus: { $regex: RegExp(searchTerm, 'i') } },
              { taxonSpecies: { $regex: RegExp(searchTerm, 'i') } }
            ]
          }
        });
        return result.docs;
      } catch (err) {
        console.error('Error searching fungi samples', err);
        throw err;
      }
    },
    
    // Filter fungi samples by any field in allFields
    filterBy: async function(key, value) {
      try {
        // Check if key is valid
        if (!window.fungiSampleModel.allFields.includes(key)) {
          throw new Error(`Invalid key: ${key}. Must be one of the fields listed in fungiSampleModel.allFields`);
        }
        
        // Create selector object
        const selector = {
          type: 'fungiSample'
        };
        selector[key] = value;
        
        const result = await db.find({
          selector: selector
        });
        return result.docs;
      } catch (err) {
        console.error(`Error filtering fungi samples by ${key}`, err);
        throw err;
      }
    },
    
    // Get all unique values for a specific field
    getAllUniqueValues: async function(key) {
      try {
        // Check if key is valid
        if (!window.fungiSampleModel.allFields.includes(key)) {
          throw new Error(`Invalid key: ${key}. Must be one of the fields listed in fungiSampleModel.allFields`);
        }
        
        const fungiSamples = await this.getAll();
        const values = [...new Set(fungiSamples.map(sample => sample[key]).filter(Boolean))];
        return values;
      } catch (err) {
        console.error(`Error getting all unique values for ${key}`, err);
        throw err;
      }
    }
  };

window.FungiService = FungiService;