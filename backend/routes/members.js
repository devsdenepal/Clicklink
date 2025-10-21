const express = require('express');
const router = express.Router();
const { getMembers } = require('../controllers/memberController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getMembers);

module.exports = router;

