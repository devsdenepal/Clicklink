const express = require('express');
const router = express.Router();
const { redirectToClickUp, handleCallback, logout, getUser } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.get('/clickup', redirectToClickUp);
router.get('/callback', handleCallback);
router.post('/logout', logout);
router.get('/user', requireAuth, getUser);

module.exports = router;
