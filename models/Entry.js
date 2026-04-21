const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
    // Core Identification
    vesselName: { type: String, required: true },
    imoNumber: { type: String, required: true },
    mciNumber: { type: String }, // ADDED
    agentName: { type: String }, // ADDED
    terminal: { type: String },  // ADDED
    
    // Waste Metrics
    wasteType: { type: String, required: true },
    volume: { type: Number, required: true },
    
    // Dates (Synced with your Form)
    dateOfArrival: { type: String },    // ADDED (Matches form 'dateOfArrival')
    dateOfInspection: { type: String }, // ADDED (Matches form 'dateOfInspection')
    
    // Legacy / Extra Fields
    charterer: String,
    owner: String,
    fileUrl: String, 
    amountMade: Number, 
    
    // System fields
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Essential for auth
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Entry', EntrySchema);
