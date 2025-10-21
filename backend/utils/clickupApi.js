const axios = require('axios');
const CLICKUP_API = 'https://api.clickup.com/api/v2';

async function createSubtask(parentTaskId, payload, accessToken) {
  const resp = await axios.post(`${CLICKUP_API}/task/${parentTaskId}/subtask`, payload, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
  return resp.data;
}

async function listSubtasks(parentTaskId, accessToken) {
  const resp = await axios.get(`${CLICKUP_API}/task/${parentTaskId}/subtask`, { headers: { Authorization: `Bearer ${accessToken}` } });
  return resp.data.subtasks || [];
}

module.exports = { createSubtask, listSubtasks };
