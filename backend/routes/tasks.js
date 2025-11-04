const express = require('express');
const router = express.Router();
const { getTasks, getTask, getStatuses, createTask, updateTask, createSubtaskByParam, createSubtask, getSubtasks, syncTasks } = require('../controllers/taskController');
const { requireAuth } = require('../middleware/auth');
const requireTeam = require('../middleware/requireTeam');

// Enforce team membership for list-level operations when configured
router.get('/', requireAuth, requireTeam, getTasks);
router.get('/statuses', requireAuth, requireTeam, getStatuses);
router.get('/:id', requireAuth, getTask);
router.get('/:id/subtasks', requireAuth, getSubtasks);
router.post('/', requireAuth, requireTeam, createTask);
router.post('/sync', requireAuth, requireTeam, syncTasks);
router.put('/:id', requireAuth, updateTask);
// Create subtask under a specific parent task id
router.post('/:id/subtasks', requireAuth, createSubtaskByParam);
// Convenience endpoint using body.parent_task_id
router.post('/subtasks', requireAuth, createSubtask);

module.exports = router;

