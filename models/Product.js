// ============================================================
// models/Product.js — MongoDB Schema for Products
// ============================================================
const mongoose = require('mongoose');

// Sub-schema for each status update entry
const StatusUpdateSchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: ['MANUFACTURED','QUALITY_CHECK','WAREHOUSE','IN_TRANSIT','CUSTOMS','DISTRIBUTION','RETAIL','DELIVERED'],
    required: true
  },
  handler: String,
  handlerRole: String,
  location: String,
  notes: String,
  temperature: String,
  walletAddress: String,
  blockIndex: Number,
  blockHash: String,
  gasUsed: Number,
  timestamp: { type: String, default: () => new Date().toISOString() }
});

const ProductSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Food & Beverage',
      'Pharmaceutical',
      'Electronics',
      'Clothing & Textiles',
      'Automotive Parts',
      'Chemical',
      'Cosmetics',
      'Agriculture',
      'Luxury Goods',
      'Medical Equipment',
      'Other'
    ]
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required'],
    trim: true
  },
  origin: {
    type: String,
    required: [true, 'Origin is required'],
    trim: true
  },
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required'],
    trim: true
  },
  manufactureDate: {
    type: String,
    required: [true, 'Manufacture date is required']
  },
  expiryDate: {
    type: String,
    default: null
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  currentStage: {
    type: String,
    enum: ['MANUFACTURED','QUALITY_CHECK','WAREHOUSE','IN_TRANSIT','CUSTOMS','DISTRIBUTION','RETAIL','DELIVERED'],
    default: 'MANUFACTURED'
  },
  registrationBlockIndex: Number,
  registrationBlockHash: String,
  walletAddress: String,
  statusHistory: [StatusUpdateSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster searches
ProductSchema.index({ productId: 1 });
ProductSchema.index({ manufacturer: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ currentStage: 1 });

module.exports = mongoose.model('Product', ProductSchema);