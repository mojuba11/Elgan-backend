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

// --- HELPER: REVENUE CALCULATION ---
const calculateRevenue = (wasteType, volume) => {
    const rates = {
        sludge: 150,
        plastic: 45,
        food: 30,
        bilge: 110,
        hazardous: 250
    };
    const rate = rates[wasteType?.toLowerCase()] || 25; 
    return (parseFloat(volume) || 0) * rate;
};

// --- ROUTES ---

/**
 * @route   POST /api/entries/add
 * @desc    Save digitized manifest with full shipping details
 */
router.post('/add', auth, upload.single('manifestScan'), async (req, res) => {
    try {
        let bodyData = req.body.data ? JSON.parse(req.body.data) : req.body;
        const { volume, wasteType } = bodyData;
        const amountMade = calculateRevenue(wasteType, volume);

        const newEntry = new Entry({
            vesselName: bodyData.vesselName,
            vesselType: bodyData.vesselType,
            imoNumber: bodyData.imoNumber,
            mciNumber: bodyData.mciNumber,
            chartererName: bodyData.chartererName,
            agentName: bodyData.agentName,
            terminal: bodyData.terminal,
            dateOfArrival: bodyData.dateOfArrival,
            dateOfInspection: bodyData.dateOfInspection,
            nimasaInspector: bodyData.nimasaInspector === 'true' || bodyData.nimasaInspector === true,
            xpoInspector: bodyData.xpoInspector === 'true' || bodyData.xpoInspector === true,
            wasteType: wasteType,
            volume: parseFloat(volume),
            amountMade: amountMade,
            fileUrl: req.file ? req.file.filename : null,
            submittedBy: req.user.id 
        });

        const savedEntry = await newEntry.save();
        res.status(201).json(savedEntry);
    } catch (err) {
        console.error("Submission Error:", err.message);
        res.status(500).json({ error: "Failed to save entry." });
    }
});

/**
 * @route   GET /api/entries/:id
 * @desc    Get single entry by ID (Needed for Edit Form)
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.id);
        if (!entry) return res.status(404).json({ msg: 'Record not found' });
        res.json(entry);
    } catch (err) {
        if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'Invalid ID format' });
        res.status(500).send('Server Error');
    }
});

/**
 * @route   PUT /api/entries/:id
 * @desc    Update vessel entry
 */
router.put('/:id', auth, async (req, res) => {
    try {
        const { wasteType, volume } = req.body;
        
        // Recalculate revenue in case volume/type changed
        const amountMade = calculateRevenue(wasteType, volume);
        
        const updatedData = {
            ...req.body,
            amountMade: amountMade
        };

        const entry = await Entry.findByIdAndUpdate(
            req.params.id,
            { $set: updatedData },
            { new: true }
        );

        if (!entry) return res.status(404).json({ msg: 'Entry not found' });
        res.json(entry);
    } catch (err) {
        console.error("Update Error:", err.message);
        res.status(500).send('Server Error during update');
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
            query.dateOfArrival = { $gte: startDate, $lte: endDate };
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

/**
 * @route   DELETE /api/entries/:id
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
