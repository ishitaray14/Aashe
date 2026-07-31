const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

// Create a new donation (Donor)
router.post('/donations', verifyToken, async (req, res) => {
  try {
    const { items, address, phone, name } = req.body;
    const result = await req.pool.query(
      `INSERT INTO donations (donor_id, items, address, donor_phone, donor_name, status) 
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [req.user.id, JSON.stringify(items), address, phone, name]
    );
    res.json({ success: true, donation: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get donations
router.get('/donations', verifyToken, async (req, res) => {
  try {
    let query = '';
    let params = [];
    
    if (req.user.role === 'user') {
      // Donors see their own, with NGO and Volunteer names
      query = `SELECT d.*, v.name as volunteer_name, v.phone as volunteer_phone, n.name as ngo_name 
               FROM donations d 
               LEFT JOIN users v ON d.volunteer_id = v.id
               LEFT JOIN users n ON d.ngo_id = n.id
               WHERE d.donor_id = $1 
               ORDER BY d.created_at DESC`;
      params = [req.user.id];
    } else if (req.user.role === 'ngo') {
      // NGOs see pending, or accepted/completed by them, with donor info
      query = `SELECT d.*, v.name as volunteer_name, v.phone as volunteer_phone 
               FROM donations d 
               LEFT JOIN users v ON d.volunteer_id = v.id
               WHERE d.status = 'pending' OR d.ngo_id = $1 
               ORDER BY d.created_at DESC`;
      params = [req.user.id];
    } else if (req.user.role === 'volunteer') {
      // Volunteers see accepted ones unassigned, OR assigned to them
      query = `SELECT d.*, n.name as ngo_name 
               FROM donations d 
               LEFT JOIN users n ON d.ngo_id = n.id
               WHERE (d.status = 'accepted' AND d.volunteer_id IS NULL) 
                  OR d.volunteer_id = $1 
               ORDER BY d.created_at DESC`;
      params = [req.user.id];
    }
    
    const result = await req.pool.query(query, params);
    res.json({ success: true, donations: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update donation status/assignment
router.patch('/donations/:id/status', verifyToken, async (req, res) => {
  try {
    const { status, volunteerId } = req.body;
    const donationId = req.params.id;
    
    let updateQuery = 'UPDATE donations SET status = $1';
    let params = [status];
    
    if (req.user.role === 'ngo') {
      // NGO accepting or assigning
      updateQuery += `, ngo_id = $2`;
      params.push(req.user.id);
      if (volunteerId) {
        updateQuery += `, volunteer_id = $3`;
        params.push(volunteerId);
      }
    } else if (req.user.role === 'volunteer' && status === 'accepted') {
      // Volunteer accepting assignment
      updateQuery += `, volunteer_id = $2`;
      params.push(req.user.id);
    } else if (req.user.role === 'volunteer' && status === 'completed') {
       // Also increment volunteer deliveries
       await req.pool.query('UPDATE users SET total_deliveries = total_deliveries + 1 WHERE id = $1', [req.user.id]);
    }
    
    updateQuery += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(donationId);
    
    const result = await req.pool.query(updateQuery, params);
    res.json({ success: true, donation: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get online volunteers
router.get('/volunteers', verifyToken, async (req, res) => {
  try {
    const result = await req.pool.query(
      `SELECT id, name, phone, status, total_deliveries FROM users WHERE role = 'volunteer' AND status = 'online'`
    );
    res.json({ success: true, volunteers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update volunteer status (online/offline)
router.patch('/volunteers/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body; // 'online' or 'offline'
    await req.pool.query(`UPDATE users SET status = $1 WHERE id = $2`, [status, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
