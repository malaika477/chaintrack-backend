// ============================================================
// server.js — ChainTrack Express Server (FIXED VERSION)
// ============================================================

require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const { ensureGenesisBlock } = require('./utils/BlockchainEngine');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Serve Frontend ───────────────────────────────────────────
// ── API Routeapps ───────────────────────────────────────────────
app.use('/api/products', require('./routes/products'));
app.use('/api/blockchain', require('./routes/blockchain'));

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ChainTrack API is running',
    time: new Date().toISOString()
  });
});

// ── Root ──────────────────────────────────────────────────────


// ── Start Server Function ─────────────────────────────────────
async function startServer() {
  try {
    console.log("🔌 Connecting to MongoDB...");

    // IMPORTANT: Check if env exists
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env file");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB connected successfully!");

    await ensureGenesisBlock();

    app.listen(PORT, () => {
      console.log("\n==================================");
      console.log("⛓ ChainTrack Server Running");
      console.log(`🌐 http://localhost:${PORT}`);
      console.log("==================================\n");
    });

  } catch (err) {
    console.error("❌ Server failed to start:");
    console.error(err.message);
    process.exit(1);
  }
}

// ── MongoDB Events ───────────────────────────────────────────
mongoose.connection.on('disconnected', () => {
  console.warn("⚠️ MongoDB disconnected");
});

// ── Start App ────────────────────────────────────────────────
startServer();