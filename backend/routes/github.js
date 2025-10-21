const express = require('express');
const router = express.Router();
const { createSubtask } = require('../controllers/githubController');
const { requireAuth } = require('../middleware/auth');

router.post('/create-subtask', requireAuth, createSubtask);

module.exports = router;

