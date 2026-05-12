// ============================================================
// routes/blockchain.js — Blockchain Explorer API Endpoints
// ============================================================
const express = require('express');
const router  = express.Router();
const Block   = require('../models/Block');
const Product = require('../models/Product');
const { isChainValid } = require('../utils/BlockchainEngine');

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

// ============================================================
// GET /api/blockchain/chain
// Returns the entire blockchain
// ============================================================
router.get('/chain', async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Block.countDocuments();
    const chain = await Block.find()
      .sort({ index: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      chain
    });
  } catch (err) {
    sendError(res, 500, 'Server error: ' + err.message);
  }
});

// ============================================================
// GET /api/blockchain/block/:index
// Get a single block by index
// ============================================================
router.get('/block/:index', async (req, res) => {
  try {
    const block = await Block.findOne({ index: parseInt(req.params.index) });
    if (!block) return sendError(res, 404, 'Block not found');
    res.json({ success: true, block });
  } catch (err) {
    sendError(res, 500, 'Server error: ' + err.message);
  }
});

// ============================================================
// GET /api/blockchain/stats
// Returns summary stats for the dashboard
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    const totalBlocks   = await Block.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalTx       = await Block.countDocuments({ 'data.type': { $ne: 'GENESIS' } });
    const delivered     = await Product.countDocuments({ currentStage: 'DELIVERED' });
    const valid         = await isChainValid();

    // Stage breakdown
    const stageAgg = await Product.aggregate([
      { $group: { _id: '$currentStage', count: { $sum: 1 } } }
    ]);

    // Category breakdown
    const categoryAgg = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Recent blocks (last 6)
    const recentBlocks = await Block.find().sort({ index: -1 }).limit(6);

    res.json({
      success: true,
      stats: {
        totalBlocks,
        totalProducts,
        totalTransactions: totalTx,
        deliveredProducts: delivered,
        chainValid: valid,
        stageBreakdown:    stageAgg,
        categoryBreakdown: categoryAgg
      },
      recentBlocks
    });

  } catch (err) {
    sendError(res, 500, 'Server error: ' + err.message);
  }
});

// ============================================================
// GET /api/blockchain/validate
// Validates the entire chain integrity
// ============================================================
router.get('/validate', async (req, res) => {
  try {
    const valid = await isChainValid();
    res.json({
      success: true,
      valid,
      message: valid ? '✅ Chain is valid — all hashes match' : '❌ Chain integrity compromised'
    });
  } catch (err) {
    sendError(res, 500, 'Server error: ' + err.message);
  }
});

// ============================================================
// DELETE /api/blockchain/reset  (dev only)
// ============================================================
router.delete('/reset', async (req, res) => {
  try {
    await Block.deleteMany({});
    await Product.deleteMany({});
    const { ensureGenesisBlock } = require('../utils/BlockchainEngine');
    await ensureGenesisBlock();
    res.json({ success: true, message: 'Blockchain reset. Genesis block created.' });
  } catch (err) {
    sendError(res, 500, 'Server error: ' + err.message);
  }
});

module.exports = router;