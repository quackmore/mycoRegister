const fungiSampleModel = {
    type: 'fungiSample',
    allFields: [
        '_id', // let PouchDB handle this
        'createdAt',
        'createdBy',
        'updatedAt',
        'updatedBy',
        'type',
        'taxonGenus',
        'taxonSpecies',
        'authority',
        'collectionDate',
        'collector',
        'locality',
        'localityPlace',
        'localityElevation',
        'localityCoordinates',
        'habitat',
        'substrate',
        'associatedTaxa',
        'notes',
        'determiner',
        'determinationDate',
        'sampleType',
        'exsiccataCode',
        'picture'
    ],
    requiredFields: [
        'taxonGenus',
        'taxonSpecies',
        'collectionDate',
        'collector',
        'locality',
        'habitat',
        'sampleType'
    ],
    indexFields: [
        'taxonGenus',
        'taxonSpecies',
        'authority',
        'collectionDate',
        'collector',
        'locality',
        'localityPlace',
        'localityElevation',
        'localityCoordinates',
        'habitat',
        'substrate',
        'associatedTaxa',
        'notes',
        'determiner',
        'determinationDate',
        'sampleType',
        'exsiccataCode'
    ],
    sampleTypes: [
        { value: 'exsiccata', label: 'exsiccata' },
        { value: 'collected', label: 'raccolto' }
    ],
    tableHeaders: [
        { field: 'createdAt', label: 'Creato il', sortable: true },
        { field: 'createdBy', label: 'Creato da', sortable: true },
        { field: 'updatedAt', label: 'Aggiornato il', sortable: true },
        { field: 'updatedBy', label: 'Aggiornato da', sortable: true },
        { field: 'type', label: 'Tipo', sortable: true },
        { field: 'taxonGenus', label: 'Genere', sortable: true },
        { field: 'taxonSpecies', label: 'Specie', sortable: true },
        { field: 'authority', label: 'Autore', sortable: true },
        { field: 'collectionDate', label: 'Data di raccolta', sortable: true },
        { field: 'collector', label: 'Raccoglitore', sortable: true },
        { field: 'locality', label: 'Località', sortable: true },
        { field: 'localityPlace', label: 'Dettagli località', sortable: true },
        { field: 'localityElevation', label: 'Altitudine', sortable: true },
        { field: 'localityCoordinates', label: 'Coordinate', sortable: true },
        { field: 'habitat', label: 'Habitat', sortable: true },
        { field: 'substrate', label: 'Substrato', sortable: true },
        { field: 'associatedTaxa', label: 'Taxa associati', sortable: true },
        { field: 'notes', label: 'Note', sortable: true },
        { field: 'determiner', label: 'Determinatore', sortable: true },
        { field: 'determinationDate', label: 'Data di determinazione', sortable: true },
        { field: 'sampleType', label: 'Tipologia di cammpione', sortable: true },
        { field: 'exsiccataCode', label: "Riferimento all'archivio Exsiccata", sortable: true },
        { field: 'picture', label: 'Foto', sortable: true }
    ]
};

// window.fungiSampleModel = fungiSampleModel;
export default fungiSampleModel;