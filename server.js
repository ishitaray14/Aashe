require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── DATABASE ────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize DB tables on startup
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        role        TEXT NOT NULL CHECK (role IN ('user','ngo','volunteer')),
        phone       TEXT,
        city        TEXT,
        address     TEXT,
        vehicle     TEXT,
        reg_no      TEXT,
        cert_verified BOOLEAN DEFAULT FALSE,
        join_date   TIMESTAMP DEFAULT NOW(),
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Add columns for volunteer status if not exist
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        donor_id INTEGER REFERENCES users(id),
        ngo_id INTEGER REFERENCES users(id),
        volunteer_id INTEGER REFERENCES users(id),
        donor_name VARCHAR(100),
        donor_phone VARCHAR(20),
        address TEXT,
        items JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Database tables ready');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  } finally {
    client.release();
  }
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── ROUTES ───────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const donationsRoutes = require('./routes/donations');

app.use('/api/auth', (req, res, next) => {
  req.pool = pool;
  next();
}, authRoutes);

app.use('/api', (req, res, next) => {
  req.pool = pool;
  next();
}, donationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Aashe', time: new Date().toISOString() });
});

// Serve all frontend pages
app.get('/pages/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', req.path));
});

// Catch-all: serve index.html for root
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Aashe server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});
