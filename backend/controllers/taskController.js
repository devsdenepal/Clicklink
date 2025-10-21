const { getClickUpTasksByList, getClickUpTask, getListStatuses, createTaskInList, updateTask } = require('../utils/clickup');

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

module.exports.getStatuses = getStatuses;
module.exports.createTask = createTask;
module.exports.updateTask = updateTaskHandler;
