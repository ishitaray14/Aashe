const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'aashe_dev_secret_change_in_prod';
const JWT_EXPIRES = '7d';

// ─── REGISTER ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role, phone, city, address, vehicle, reg_no } = req.body;

  // Validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
  }
  if (!['user', 'ngo', 'volunteer'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  const pool = req.pool;

  try {
    // Check if email already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, city, address, vehicle, reg_no, cert_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, email, role, phone, city, address, vehicle, reg_no, cert_verified, join_date`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        hashedPassword,
        role,
        phone || null,
        city || null,
        address || null,
        vehicle || null,
        reg_no || null,
        role === 'ngo' ? false : null
      ]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user)
    });

  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const pool = req.pool;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user)
    });

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ─── GET CURRENT USER ─────────────────────────────────────────────────────────
// GET /api/auth/me   (requires Authorization: Bearer <token>)
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const pool = req.pool;
    const result = await pool.query(
      'SELECT id, name, email, role, phone, city, address, vehicle, reg_no, cert_verified, join_date FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, user: sanitizeUser(result.rows[0]) });

  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
});

// ─── HELPER ───────────────────────────────────────────────────────────────────
function sanitizeUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    city: u.city,
    address: u.address,
    vehicle: u.vehicle,
    regNo: u.reg_no,
    certVerified: u.cert_verified,
    joinDate: u.join_date
      ? new Date(u.join_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      : 'N/A'
  };
}

module.exports = router;
