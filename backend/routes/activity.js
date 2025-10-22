const express = require('express');
const { requireAuth } = require('../middleware/auth');
const Activity = require('../models/Activity');

const router = express.Router();

// GET /api/activity
// Returns recent activities sorted by timestamp (desc)
// Supports query params: limit (default 20, max 100), userId (optional filter)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { limit = 20, userId } = req.query;

    const lim = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
    const filter = {};
    if (userId) filter.userId = String(userId);

    const items = await Activity.find(filter)
      .sort({ timestamp: -1 })
      .limit(lim)
      .lean();

    res.json({ activities: items });
  } catch (e) {
    console.error('Failed to fetch activities:', e);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

module.exports = router;
