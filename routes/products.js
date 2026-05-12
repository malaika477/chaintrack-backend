// ============================================================
// routes/products.js — All Product API Endpoints
// ============================================================
const express = require('express');
const router  = express.Router();
const Product = require('../models/Product');
const Block   = require('../models/Block');
const {
  addBlock,
  generateProductId,
  generateWallet
} = require('../utils/BlockchainEngine');

// ── Helper ──────────────────────────────────────────────────
function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

// ============================================================
// POST /api/products/register
// Register a new product → writes to MongoDB + Blockchain
// ============================================================
router.post('/register', async (req, res) => {
  try {
    const {
      productName, category, manufacturer, origin,
      batchNumber, manufactureDate, expiryDate, description
    } = req.body;

    // Basic validation
    if (!productName || !category || !manufacturer || !origin || !batchNumber || !manufactureDate) {
      return sendError(res, 400, 'Missing required fields');
    }

    const productId    = generateProductId();
    const walletAddress = generateWallet();
    const gasUsed      = Math.floor(Math.random() * 50000 + 21000);
    const confirmations = Math.floor(Math.random() * 12 + 1);

    // 1. Write block to blockchain
    const blockData = {
      type: 'PRODUCT_REGISTERED',
      productId,
      productName,
      category,
      manufacturer,
      origin,
      batchNumber,
      manufactureDate,
      expiryDate: expiryDate || null,
      description: description || '',
      stage: 'MANUFACTURED',
      status: 'Active',
      walletAddress,
      gasUsed,
      blockConfirmations: confirmations
    };

    const block = await addBlock(blockData);

    // 2. Save product to MongoDB
    const product = new Product({
      productId,
      productName,
      category,
      manufacturer,
      origin,
      batchNumber,
      manufactureDate,
      expiryDate: expiryDate || null,
      description: description || '',
      currentStage: 'MANUFACTURED',
      registrationBlockIndex: block.index,
      registrationBlockHash: block.hash,
      walletAddress,
      statusHistory: [{
        stage: 'MANUFACTURED',
        handler: manufacturer,
        handlerRole: 'Manufacturer',
        location: origin,
        notes: 'Product registered on blockchain',
        walletAddress,
        blockIndex: block.index,
        blockHash: block.hash,
        gasUsed,
        timestamp: block.timestamp
      }]
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product registered on blockchain',
      productId,
      blockIndex: block.index,
      blockHash: block.hash,
      walletAddress,
      gasUsed,
      confirmations,
      timestamp: block.timestamp
    });

  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 11000) return sendError(res, 409, 'Product ID conflict, try again');
    sendError(res, 500, 'Server error: ' + err.message);
  }
});

// ============================================================
// GET /api/products/:productId
// Get a single product with full blockchain history
// ============================================================
router.get('/:productId', async (req, res) => {
  try {
    const productId = req.params.productId.toUpperCase();
    const product   = await Product.findOne({ productId });

    if (!product) return sendError(res, 404, 'Product not found on blockchain');

    // Also get all related blocks
    const blocks = await Block.find({ 'data.productId': productId }).sort({ index: 1 });

    res.json({
      success: true,
      product: {
        productId:              product.productId,
        productName:            product.productName,
        category:               product.category,
        manufacturer:           product.manufacturer,
        origin:                 product.origin,
        batchNumber:            product.batchNumber,
        manufactureDate:        product.manufactureDate,
        expiryDate:             product.expiryDate,
        description:            product.description,
        currentStage:           product.currentStage,
        registrationBlockIndex: product.registrationBlockIndex,
        registrationBlockHash:  product.registrationBlockHash,
        walletAddress:          product.walletAddress,
        statusHistory:          product.statusHistory,
        createdAt:              product.createdAt,
        updatedAt:              product.updatedAt
      },
      blockchainHistory: blocks
    });

  } catch (err) {
    console.error('Get product error:', err);
    sendError(res, 500, 'Server error: ' + err.message);
  }
});

// ============================================================
// GET /api/products
// Get all products (with optional filters)
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { category, stage, search, limit = 50, page = 1 } = req.query;

    const query = {};
    if (category) query.category   = category;
    if (stage)    query.currentStage = stage;
    if (search) {
      query.$or = [
        { productName:  { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { productId:    { $regex: search, $options: 'i' } }
      ];
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-statusHistory'); // exclude history for list view (lighter response)

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      products
    });

  } catch (err) {
    console.error('List products error:', err);
    sendError(res, 500, 'Server error: ' + err.message);
  }
});

// ============================================================
// POST /api/products/:productId/update
// Update product status — writes new block + updates MongoDB
// ============================================================
router.post('/:productId/update', async (req, res) => {
  try {
    const productId = req.params.productId.toUpperCase();
    const { stage, handler, handlerRole, location, notes, temperature } = req.body;

    if (!stage) return sendError(res, 400, 'Stage is required');

    const product = await Product.findOne({ productId });
    if (!product) return sendError(res, 404, 'Product not found');

    const walletAddress = generateWallet();
    const gasUsed       = Math.floor(Math.random() * 30000 + 21000);
    const confirmations = Math.floor(Math.random() * 12 + 1);

    // Write new block
    const blockData = {
      type: 'STATUS_UPDATE',
      productId,
      productName: product.productName,
      stage,
      handler:     handler     || '',
      handlerRole: handlerRole || '',
      location:    location    || '',
      notes:       notes       || '',
      temperature: temperature || null,
      walletAddress,
      gasUsed,
      blockConfirmations: confirmations
    };

    const block = await addBlock(blockData);

    // Update product in MongoDB
    product.currentStage = stage;
    product.statusHistory.push({
      stage,
      handler:     handler     || '',
      handlerRole: handlerRole || '',
      location:    location    || '',
      notes:       notes       || '',
      temperature: temperature || null,
      walletAddress,
      blockIndex: block.index,
      blockHash:  block.hash,
      gasUsed,
      timestamp: block.timestamp
    });

    await product.save();

    res.json({
      success: true,
      message: `Status updated to ${stage}`,
      blockIndex:  block.index,
      blockHash:   block.hash,
      walletAddress,
      gasUsed,
      confirmations,
      timestamp:   block.timestamp,
      currentStage: stage
    });

  } catch (err) {
    console.error('Update error:', err);
    sendError(res, 500, 'Server error: ' + err.message);
  }
});

// ============================================================
// DELETE /api/products/:productId  (dev only)
// ============================================================
router.delete('/:productId', async (req, res) => {
  try {
    const productId = req.params.productId.toUpperCase();
    await Product.findOneAndDelete({ productId });
    await Block.deleteMany({ 'data.productId': productId });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    sendError(res, 500, 'Server error: ' + err.message);
  }
});

module.exports = router;