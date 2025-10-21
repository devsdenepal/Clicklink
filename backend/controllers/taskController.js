const { getClickUpTasksByList, getClickUpTask, getListStatuses, createTaskInList, updateTask, createClickUpSubtask } = require('../utils/clickup');

// Simple in-memory lock map to avoid duplicate rapid subtask creations
const inFlightSubtask = new Map();
const makeLockKey = (parentId, name) => `${parentId || 'unknown'}::${(name || '').slice(0,100)}`;

// Helper: accept either a numeric list id or a full ClickUp list URL and extract the id
function extractListId(input) {
  if (!input) return null;
  try {
    if (typeof input === 'string' && input.includes('clickup.com')) {
      const m = input.match(/(\d{6,})/g);
      if (m && m.length) return m[m.length - 1];
    }
  } catch (e) {}
  return input;
}

const getTasks = async (req, res) => {
  try {
    const raw = req.query.list_id || process.env.CLICKUP_LIST_ID;
    const listId = extractListId(raw);
    if (!listId) return res.status(400).json({ error: 'list_id is required' });
    const tasks = await getClickUpTasksByList(req.user.clickupToken, listId);
    res.json({ tasks });
  } catch (err) {
    console.error('Failed to fetch tasks:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

const getTask = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await getClickUpTask(req.user.clickupToken, id);
        res.json(task);
    } catch (err) {
        console.error('Failed to fetch task:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to fetch task' });
    }
};

module.exports = {
  getTasks,
  getTask
};

// Additional handlers
const getStatuses = async (req, res) => {
  try {
    const raw = req.query.list_id || process.env.CLICKUP_LIST_ID;
    const listId = extractListId(raw);
    if (!listId) return res.status(400).json({ error: 'list_id is required' });
    const statuses = await getListStatuses(req.user.clickupToken, listId);
    res.json({ statuses });
  } catch (err) {
    console.error('Failed to fetch statuses:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
};

const createTask = async (req, res) => {
  try {
    const raw = req.body.list_id || process.env.CLICKUP_LIST_ID;
    const listId = extractListId(raw);
    if (!listId) return res.status(400).json({ error: 'list_id is required' });
    const created = await createTaskInList(req.user.clickupToken, listId, req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error('Failed to create task:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

const updateTaskHandler = async (req, res) => {
  try {
    const updated = await updateTask(req.user.clickupToken, req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('Failed to update task:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// Create a subtask under a parent task id from URL param
const createSubtaskByParam = async (req, res) => {
  try {
    const parentId = req.params.id;
    if (!parentId) return res.status(400).json({ error: 'parent task id is required' });
    // Accept a subset of ClickUp task fields
    const payload = {
      name: req.body.name,
      description: req.body.description,
      status: req.body.status,
      assignees: req.body.assignees,
      due_date: req.body.due_date,
      start_date: req.body.start_date,
      priority: req.body.priority,
      tags: req.body.tags
    };
    const lockKey = makeLockKey(parentId, payload.name);
    if (inFlightSubtask.has(lockKey)) {
      return res.status(409).json({ error: 'Subtask creation already in progress' });
    }
    inFlightSubtask.set(lockKey, Date.now());
    let timer = setTimeout(() => inFlightSubtask.delete(lockKey), 15000);
    try {
      const created = await createClickUpSubtask(req.user.clickupToken, parentId, payload);
      return res.status(created.status_code || 201).json(created);
    } finally {
      clearTimeout(timer);
      inFlightSubtask.delete(lockKey);
    }
  } catch (err) {
    const details = err.response?.data || err.message;
    const status = err.response?.status || 500;
    console.error('Failed to create subtask:', details);
    res.status(status).json({ error: 'Failed to create subtask', details });
  }
};

// Create a subtask using body.parent_task_id (convenience endpoint)
const createSubtask = async (req, res) => {
  try {
    const parentId = req.body.parent_task_id || req.body.parentId;
    if (!parentId) return res.status(400).json({ error: 'parent_task_id is required' });
    const payload = {
      name: req.body.name,
      description: req.body.description,
      status: req.body.status,
      assignees: req.body.assignees,
      due_date: req.body.due_date,
      start_date: req.body.start_date,
      priority: req.body.priority,
      tags: req.body.tags
    };
    const lockKey = makeLockKey(parentId, payload.name);
    if (inFlightSubtask.has(lockKey)) {
      return res.status(409).json({ error: 'Subtask creation already in progress' });
    }
    inFlightSubtask.set(lockKey, Date.now());
    let timer = setTimeout(() => inFlightSubtask.delete(lockKey), 15000);
    try {
      const created = await createClickUpSubtask(req.user.clickupToken, parentId, payload);
      return res.status(created.status_code || 201).json(created);
    } finally {
      clearTimeout(timer);
      inFlightSubtask.delete(lockKey);
    }
  } catch (err) {
    const details = err.response?.data || err.message;
    const status = err.response?.status || 500;
    console.error('Failed to create subtask:', details);
    res.status(status).json({ error: 'Failed to create subtask', details });
  }
};

module.exports.getStatuses = getStatuses;
module.exports.createTask = createTask;
module.exports.updateTask = updateTaskHandler;
module.exports.createSubtaskByParam = createSubtaskByParam;
module.exports.createSubtask = createSubtask;
