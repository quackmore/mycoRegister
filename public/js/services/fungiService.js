// Service for CRUD operations on fungi samples
// using dbService and dbCrud

import authService from '../services/auth/auth.service.js';
import dbCrud from './dbCrud.js';
import fungiSampleModel from '../models/fungiSample.js';

const FungiService = {
  // Create a new fungi sample
  create: async function (fungiSample) {
    try {
      const session = await authService.getSessionInfo();
      // Create the document
      const doc = {
        type: 'fungiSample',
        createdAt: new Date().toISOString(),
        createdBy: session.email || null,
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

      // Use the post method from dbCrud
      const result = await dbCrud.post(doc);
      return result;
    } catch (err) {
      console.error('Error creating fungi sample', err);
      throw err;
    }
  },

  // Update an existing fungi sample
  update: async function (fungiSample) {
    try {
      const session = await authService.getSessionInfo();
      const doc = await dbCrud.get(fungiSample._id);

      // Update fields
      doc.updatedAt = new Date().toISOString();
      doc.updatedBy = session.email || null;
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

      // Use the put method from dbCrud
      const result = await dbCrud.put(doc);
      return result;
    } catch (err) {
      console.error('Error updating fungi sample', err);
      throw err;
    }
  },

  // Delete a fungi sample
  delete: async function (fungiSampleId) {
    try {
      const result = await dbCrud.remove(fungiSampleId);
      return result;
    } catch (err) {
      console.error('Error deleting fungi sample', err);
      throw err;
    }
  },

  // Get all fungi samples
  getAll: async function () {
    try {
      const result = await dbCrud.getAllByType('fungiSample');
      return result.docs;
    } catch (err) {
      console.error('Error getting all fungi samples', err);
      throw err;
    }
  },

  // Get fungi sample by ID
  getById: async function (fungiSampleId) {
    try {
      const doc = await dbCrud.get(fungiSampleId);
      return doc;
    } catch (err) {
      console.error('Error getting fungi sample by ID', err);
      throw err;
    }
  },

  // Search fungi samples by keyword
  search: async function (searchTerm) {
    try {
      let searchForCollected = false;
      if (searchTerm.toLowerCase().includes('raccolto'))
        searchForCollected = true;
      const result = await dbCrud.find({
        selector: {
          type: 'fungiSample',
          $or: [
            { taxonGenus: { $regex: RegExp(searchTerm, 'i') } },
            { taxonSpecies: { $regex: RegExp(searchTerm, 'i') } },
            { authority: { $regex: RegExp(searchTerm, 'i') } },
            { collector: { $regex: RegExp(searchTerm, 'i') } },
            { locality: { $regex: RegExp(searchTerm, 'i') } },
            { localityPlace: { $regex: RegExp(searchTerm, 'i') } },
            { localityElevation: { $regex: RegExp(searchTerm, 'i') } },
            { localityCoordinates: { $regex: RegExp(searchTerm, 'i') } },
            { habitat: { $regex: RegExp(searchTerm, 'i') } },
            { substrate: { $regex: RegExp(searchTerm, 'i') } },
            { associatedTaxa: { $regex: RegExp(searchTerm, 'i') } },
            { notes: { $regex: RegExp(searchTerm, 'i') } },
            { determiner: { $regex: RegExp(searchTerm, 'i') } },
            { sampleType: { $regex: RegExp(searchForCollected ? 'collected' : searchTerm, 'i') } },
            { exsiccataCode: { $regex: RegExp(searchTerm, 'i') } }
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
  filterBy: async function (key, value) {
    try {
      // Check if key is valid
      if (!fungiSampleModel.allFields.includes(key)) {
        throw new Error(`Invalid key: ${key}. Must be one of the fields listed in fungiSampleModel.allFields`);
      }

      // Create selector object
      const selector = {
        type: 'fungiSample'
      };
      selector[key] = value;

      const result = await dbCrud.find({
        selector: selector
      });
      return result.docs;
    } catch (err) {
      console.error(`Error filtering fungi samples by ${key}`, err);
      throw err;
    }
  },

  // Get all unique values for a specific field
  getAllUniqueValues: async function (key) {
    try {
      // Check if key is valid
      if (!fungiSampleModel.allFields.includes(key)) {
        throw new Error(`Invalid key: ${key}. Must be one of the fields listed in fungiSampleModel.allFields`);
      }

      const fungiSamples = await this.getAll();
      const values = [...new Set(fungiSamples.map(sample => sample[key]).filter(Boolean))];
      return values;
    } catch (err) {
      console.error(`Error getting all unique values for ${key}`, err);
      throw err;
    }
  },

  // Get all unique genus-species-authority combinations
  getGenusSpeciesAuthorities: async function () {
    try {
      // Get all fungi samples that have all three fields populated
      const result = await dbCrud.find({
        selector: {
          type: 'fungiSample',
          taxonGenus: { $exists: true, $ne: '' },
          taxonSpecies: { $exists: true, $ne: '' },
          authority: { $exists: true, $ne: '' }
        }
      });

      // Create unique combinations
      const combinations = [];
      const seen = new Set();

      result.docs.forEach(sample => {
        const genus = sample.taxonGenus?.trim();
        const species = sample.taxonSpecies?.trim();
        const authority = sample.authority?.trim();

        if (genus && species && authority) {
          const key = `${genus.toLowerCase()}-${species.toLowerCase()}-${authority}`;
          if (!seen.has(key)) {
            seen.add(key);
            combinations.push({
              taxonGenus: genus,
              taxonSpecies: species,
              authority: authority
            });
          }
        }
      });

      return combinations;
    } catch (error) {
      console.error('Error fetching genus-species-authorities:', error);
      throw error;
    }
  }
};

export default FungiService;