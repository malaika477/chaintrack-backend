// ============================================================
// utils/BlockchainEngine.js — Blockchain Logic (Server Side)
// ============================================================
const Block = require('../models/Block');

// Simple hash function (mimics SHA256 style output)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const h = Math.abs(hash);
  const hex  = h.toString(16).padStart(8, '0');
  const ex1  = Math.abs(h * 31337).toString(16).padStart(8, '0');
  const ex2  = Math.abs(h * 99991).toString(16).padStart(8, '0');
  const ex3  = Math.abs(h * 12345).toString(16).padStart(8, '0');
  const ex4  = Math.abs(h * 7).toString(16).padStart(8, '0');
  return '0x' + hex + ex1 + ex2 + ex3 + ex4;
}

function calculateHash(index, timestamp, data, previousHash, nonce) {
  return simpleHash(index + timestamp + JSON.stringify(data) + previousHash + nonce);
}

function generateWallet() {
  const chars = '0123456789abcdef';
  let w = '0x';
  for (let i = 0; i < 40; i++) w += chars[Math.floor(Math.random() * chars.length)];
  return w;
}

// Create and save the Genesis Block if it doesn't exist
async function ensureGenesisBlock() {
  const count = await Block.countDocuments();
  if (count === 0) {
    const genesis = new Block({
      index: 0,
      timestamp: new Date().toISOString(),
      data: {
        type: 'GENESIS',
        message: 'Supply Chain Blockchain Initialized',
        network: 'ChainTrack-ETH-Sim v1.0'
      },
      previousHash: '0x0000000000000000000000000000000000000000',
      nonce: Math.floor(Math.random() * 100000)
    });
    genesis.hash = calculateHash(
      genesis.index,
      genesis.timestamp,
      genesis.data,
      genesis.previousHash,
      genesis.nonce
    );
    await genesis.save();
    console.log('✅ Genesis block created');
  }
}

// Get the latest block from DB
async function getLatestBlock() {
  return await Block.findOne().sort({ index: -1 });
}

// Add a new block to the chain
async function addBlock(data) {
  const prev = await getLatestBlock();
  const index = prev.index + 1;
  const timestamp = new Date().toISOString();
  const nonce = Math.floor(Math.random() * 100000);
  const hash = calculateHash(index, timestamp, data, prev.hash, nonce);

  const block = new Block({ index, timestamp, data, previousHash: prev.hash, hash, nonce });
  await block.save();
  return block;
}

// Validate the entire chain
async function isChainValid() {
  const chain = await Block.find().sort({ index: 1 });
  for (let i = 1; i < chain.length; i++) {
    if (chain[i].previousHash !== chain[i - 1].hash) return false;
  }
  return true;
}

// Generate a unique product ID
function generateProductId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'SCT-';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

module.exports = {
  ensureGenesisBlock,
  getLatestBlock,
  addBlock,
  isChainValid,
  generateProductId,
  generateWallet,
  calculateHash
};