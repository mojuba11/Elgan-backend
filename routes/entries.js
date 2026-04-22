const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Entry = require('../models/Entry');
const auth = require('../middleware/auth');

// --- DIRECTORY SYNC ---
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- STORAGE CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        cb(null, `manifest-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|jpg|jpeg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error("Only images and PDFs are allowed"));
    }
});

// --- ROUTES ---

/**
 * @route   POST /api/entries/add
 * @desc    Save digitized manifest with full shipping details
 */
router.post('/add', auth, upload.single('manifestScan'), async (req, res) => {
    try {
        // 1. Parse Data
        let bodyData = req.body.data ? JSON.parse(req.body.data) : req.body;
        
        const { volume, wasteType } = bodyData;

        // 2. Business Logic: Revenue Calculation
        const rates = {
            sludge: 150,
            plastic: 45,
            food: 30,
            bilge: 110,
            hazardous: 250
        };
        const rate = rates[wasteType?.toLowerCase()] || 25; 
        const amountMade = (parseFloat(volume) || 0) * rate;

        // 3. Construct Entry Object
        const newEntry = new Entry({
            // Vessel Info
            vesselName: bodyData.vesselName,
            vesselType: bodyData.vesselType,
            imoNumber: bodyData.imoNumber,
            mciNumber: bodyData.mciNumber,       // Verified included
            chartererName: bodyData.chartererName,
            agentName: bodyData.agentName,       // FIXED: Added Agent Name mapping
            
            // Logistics info
            terminal: bodyData.terminal,
            dateOfArrival: bodyData.dateOfArrival,
            dateOfInspection: bodyData.dateOfInspection,
            
            // Inspectors
            nimasaInspector: bodyData.nimasaInspector === 'true' || bodyData.nimasaInspector === true,
            xpoInspector: bodyData.xpoInspector === 'true' || bodyData.xpoInspector === true,
            
            // Waste Data
            wasteType: wasteType,
            volume: parseFloat(volume),
            amountMade: amountMade,
            
            // File & Auth
            fileUrl: req.file ? req.file.filename : null,
            submittedBy: req.user.id 
        });

        const savedEntry = await newEntry.save();
        res.status(201).json(savedEntry);
    } catch (err) {
        console.error("Submission Error:", err.message);
        res.status(500).json({ error: "Failed to save entry. Check database connection or fields." });
    }
} );

/**
 * @route   GET /api/entries/search
 * @desc    Manager Audit Trail Search
 */
router.get('/search', auth, async (req, res) => {
    try {
        const { vesselName, wasteType, startDate, endDate } = req.query;
        let query = {};

        if (vesselName) query.vesselName = { $regex: vesselName, $options: 'i' };
        if (wasteType) query.wasteType = wasteType;
        if (startDate && endDate) {
            query.dateOfArrival = { 
                $gte: startDate,
                $lte: endDate
            };
        }

        const entries = await Entry.find(query).sort({ createdAt: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
    }
});

/**
 * @route   GET /api/entries/all
 */
router.get('/all', auth, async (req, res) => {
    try {
        const entries = await Entry.find().sort({ createdAt: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

/**
 * @route   DELETE /api/entries/:id
 * @desc    Manager Deletion Route
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.id);
        if (!entry) return res.status(404).json({ msg: 'Record not found' });

        await entry.deleteOne();
        res.json({ msg: 'Record removed successfully' });
    } catch (err) {
        res.status(500).send('Server Error during deletion');
    }
});

module.exports = router;
