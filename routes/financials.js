const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Financial = require('../models/Financial');

// @route    POST api/financials/add
// @desc     Submit a monthly financial report
router.post('/add', auth, async (req, res) => {
  try {
    const { reportMonth, totalIncome, assessorFee, remarks } = req.body;

    const newReport = new Financial({
      user: req.user.id,
      reportMonth,
      totalIncome,
      assessorFee,
      remarks
    });

    const report = await newReport.save();
    res.json(report);
  } catch (err) {
    console.error("Save Financial Error:", err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/financials/all
// @desc     Get all financial reports for the dashboard
router.get('/all', auth, async (req, res) => {
  try {
    const reports = await Financial.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error("Fetch Financials Error:", err.message);
    res.status(500).send('Server Error');
  }
});

// --- NEW ROUTES FOR EDITING ---

// @route    GET api/financials/:id
// @desc     Get a single financial record by ID (Required for the Edit Form)
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await Financial.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ msg: 'Financial record not found' });
    }
    
    res.json(report);
  } catch (err) {
    console.error("Fetch Single Financial Error:", err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Invalid ID format' });
    }
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/financials/:id
// @desc     Update an existing financial record
router.put('/:id', auth, async (req, res) => {
  try {
    const { reportMonth, totalIncome, assessorFee, remarks } = req.body;

    let report = await Financial.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ msg: 'Financial record not found' });
    }

    // Update fields
    const updatedData = {
      reportMonth: reportMonth || report.reportMonth,
      totalIncome: totalIncome || report.totalIncome,
      assessorFee: assessorFee || report.assessorFee,
      remarks: remarks || report.remarks
    };

    report = await Financial.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true }
    );

    res.json(report);
  } catch (err) {
    console.error("Update Financial Error:", err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
