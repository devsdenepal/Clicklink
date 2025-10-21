const express = require('express');
const router = express.Router();
const { createSubtask, getRepoUpdates, syncRepos } = require('../controllers/githubController');
const { requireAuth } = require('../middleware/auth');

router.post('/create-subtask', requireAuth, createSubtask);
router.get('/repo/:owner/:repo/updates', requireAuth, getRepoUpdates);
router.post('/sync', requireAuth, syncRepos);

module.exports = router;

