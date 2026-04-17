const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
    vesselName: { type: String, required: true },
    imoNumber: { type: String, required: true },
    wasteType: { type: String, required: true },
    volume: { type: Number, required: true },
    entryDate: Date,
    departureDate: Date,
    marpolOfficer: String,
    offshoreSupervisor: String,
    charterer: String,
    owner: String,
    fileUrl: String, // Path to the scanned PDF
    amountMade: Number, // Calculated on the backend
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Entry', EntrySchema);