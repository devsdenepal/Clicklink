const express = require('express');
const router = express.Router();
const { getTasks, getTask, getStatuses, createTask, updateTask } = require('../controllers/taskController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getTasks);
router.get('/statuses', requireAuth, getStatuses);
router.get('/:id', requireAuth, getTask);
router.post('/', requireAuth, createTask);
router.put('/:id', requireAuth, updateTask);

module.exports = router;

