const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Entry = require('../models/Entry');
const auth = require('../middleware/auth'); // Protects routes with JWT

// --- STORAGE CONFIGURATION ---
// Set up how and where to store the scanned PDF manifest
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Ensure this folder exists in your backend root
    },
    filename: (req, file, cb) => {
        // Renames file to: manifest-1713340600000.pdf
        cb(null, `manifest-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|jpg|jpeg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) return cb(null, true);
        cb(new Error("Only images and PDFs are allowed"));
    }
});

// --- ROUTES ---

/**
 * @route   POST /api/entries/add
 * @desc    Save a new waste entry with a scanned file
 * @access  Private (Fleet Manager)
 */
router.post('/add', [auth, upload.single('manifestScan')], async (req, res) => {
    try {
        // When using FormData, text fields are often wrapped in a 'data' string
        const bodyData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        
        const { volume, wasteType } = bodyData;

        // Logic: Professional Revenue Calculation
        const rates = {
            sludge: 150,
            plastic: 45,
            food: 30,
            bilge: 110,
            hazardous: 250
        };
        const rate = rates[wasteType.toLowerCase()] || 25; 
        const amountMade = volume * rate;

        const newEntry = new Entry({
            ...bodyData,
            amountMade: amountMade,
            fileUrl: req.file ? req.file.path : null, // Store path to PDF
            submittedBy: req.user.id // ID from auth middleware
        });

        const savedEntry = await newEntry.save();
        res.status(201).json(savedEntry);
    } catch (err) {
        console.error("Submission Error:", err.message);
        res.status(500).json({ error: "Failed to save entry. Check file format or required fields." });
    }
});

/**
 * @route   GET /api/entries/search
 * @desc    Get entries with advanced filtering for Manager
 * @access  Private (Manager Only)
 */
router.get('/search', auth, async (req, res) => {
    try {
        const { vesselName, wasteType, startDate, endDate } = req.query;
        let query = {};

        // Filter by Vessel Name (Partial match)
        if (vesselName) {
            query.vesselName = { $regex: vesselName, $options: 'i' };
        }

        // Filter by Waste Type
        if (wasteType) {
            query.wasteType = wasteType;
        }

        // Filter by Date Range
        if (startDate && endDate) {
            query.entryDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const entries = await Entry.find(query).sort({ createdAt: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
    }
});

/**
 * @route   GET /api/entries/all
 * @desc    Generic fetch all entries
 * @access  Private
 */
router.get('/all', auth, async (req, res) => {
    try {
        const entries = await Entry.find().sort({ createdAt: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

module.exports = router;