const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Financial = require('../models/Financial');

// @route   POST api/financials/add
// @desc    Submit a monthly financial report
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
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
