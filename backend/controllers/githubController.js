const axios = require('axios');
const { createClickUpSubtask } = require('../utils/clickup');

const createSubtask = async (req, res) => {
  try {
    const { repo, issue_number, parent_task_id } = req.body;
    if (!repo || !issue_number || !parent_task_id) {
      return res.status(400).json({ error: 'repo, issue_number, and parent_task_id are required' });
    }

    // 1. Fetch issue details from GitHub
    const issueRes = await axios.get(`https://api.github.com/repos/${repo}/issues/${issue_number}`);
    const issue = issueRes.data;

    // 2. Create subtask in ClickUp
    const subtask = {
      name: `[GitHub Issue] ${issue.title}`,
      description: `From GitHub issue: ${issue.html_url}`,
      status: 'To Do'
    };
    const newSubtask = await createClickUpSubtask(req.user.clickupToken, parent_task_id, subtask);

    res.json(newSubtask);
  } catch (err) {
    console.error('Failed to create subtask:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create subtask' });
  }
};

module.exports = {
  createSubtask
};
