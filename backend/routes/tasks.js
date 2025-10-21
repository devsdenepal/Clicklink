const express = require('express');
const router = express.Router();
const { getTasks, getTask, getStatuses, createTask, updateTask, createSubtaskByParam, createSubtask } = require('../controllers/taskController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getTasks);
router.get('/statuses', requireAuth, getStatuses);
router.get('/:id', requireAuth, getTask);
router.post('/', requireAuth, createTask);
router.put('/:id', requireAuth, updateTask);
// Create subtask under a specific parent task id
router.post('/:id/subtasks', requireAuth, createSubtaskByParam);
// Convenience endpoint using body.parent_task_id
router.post('/subtasks', requireAuth, createSubtask);

module.exports = router;

