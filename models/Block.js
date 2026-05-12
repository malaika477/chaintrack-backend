// ============================================================
// models/Block.js — MongoDB Schema for Blockchain Blocks
// ============================================================
const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema({
  index: {
    type: Number,
    required: true,
    unique: true
  },
  timestamp: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // flexible — stores any object
    required: true
  },
  previousHash: {
    type: String,
    required: true
  },
  hash: {
    type: String,
    required: true,
    unique: true
  },
  nonce: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true // adds createdAt, updatedAt automatically
});

module.exports = mongoose.model('Block', BlockSchema);