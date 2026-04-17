const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Entry = require('../models/Entry');
const auth = require('../middleware/auth');

// --- DIRECTORY SYNC ---
// This ensures the 'uploads' folder exists on Render's server so Multer doesn't crash
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
 * @route   POST /api/entries/add
 */
router.post('/add', auth, upload.single('manifestScan'), async (req, res) => {
    try {
        // Handle both raw JSON and FormData 'data' strings
        let bodyData = req.body;
        if (req.body.data) {
            bodyData = JSON.parse(req.body.data);
        }
        
        const { volume, wasteType } = bodyData;

        // Business Logic: Revenue Calculation
        const rates = {
            sludge: 150,
            plastic: 45,
            food: 30,
            bilge: 110,
            hazardous: 250
        };
        const rate = rates[wasteType?.toLowerCase()] || 25; 
        const amountMade = (volume || 0) * rate;

        const newEntry = new Entry({
            ...bodyData,
            amountMade: amountMade,
            fileUrl: req.file ? req.file.filename : null, // Store just the filename
            submittedBy: req.user.id 
        });

        const savedEntry = await newEntry.save();
        res.status(201).json(savedEntry);
    } catch (err) {
        console.error("Submission Error:", err.message);
        res.status(500).json({ error: "Failed to save entry. Check fields." });
    }
});

/**
 * @route   GET /api/entries/search
 */
router.get('/search', auth, async (req, res) => {
    try {
        const { vesselName, wasteType, startDate, endDate } = req.query;
        let query = {};

        if (vesselName) query.vesselName = { $regex: vesselName, $options: 'i' };
        if (wasteType) query.wasteType = wasteType;
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
 */
router.get('/all', auth, async (req, res) => {
    try {
        const entries = await Entry.find().sort({ createdAt: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

module.exports = router;