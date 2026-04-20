const mongoose = require('mongoose');

const FinancialSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  reportMonth: { type: String, required: true }, // Format: "YYYY-MM"
  totalIncome: { type: Number, required: true },
  assessorFee: { type: Number, required: true },
  remarks: { type: String },
  dateSubmitted: { type: Date, default: Date.now }
});

module.exports = mongoose.model('financial', FinancialSchema);
