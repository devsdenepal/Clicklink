const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const {
  HTTPS_PROXY,
  https_proxy
} = process.env;

// Configure a proxy agent if HTTPS_PROXY is set
const httpsProxy = HTTPS_PROXY || https_proxy;
let httpsAgent;
if (httpsProxy) {
  httpsAgent = new HttpsProxyAgent(httpsProxy);
}

const getClickUpUser = async (clickupToken) => {
  const userRes = await axios.get('https://api.clickup.com/api/v2/user', {
    headers: { Authorization: `Bearer ${clickupToken}` },
    httpsAgent
  });
  return userRes.data.user;
};

const getClickUpTeams = async (clickupToken) => {
  const teamsRes = await axios.get('https://api.clickup.com/api/v2/team', {
    headers: { Authorization: `Bearer ${clickupToken}` },
    httpsAgent
  });
  return teamsRes.data.teams;
};

// Cache team id to avoid refetching
let cachedTeamId;
async function getDefaultTeamId(clickupToken) {
  if (process.env.CLICKUP_TEAM_ID) return process.env.CLICKUP_TEAM_ID;
  if (cachedTeamId) return cachedTeamId;
  const teams = await getClickUpTeams(clickupToken);
  const first = Array.isArray(teams) && teams.length ? teams[0] : null;
  cachedTeamId = first && (first.id || first.team_id || first.teamId);
  return cachedTeamId;
}

const getClickUpTasksByList = async (clickupToken, listId) => {
  const tasksRes = await axios.get(`https://api.clickup.com/api/v2/list/${listId}/task`, {
    headers: { Authorization: `Bearer ${clickupToken}` },
    httpsAgent
  });
  return tasksRes.data.tasks;
};

const getClickUpTask = async (clickupToken, taskId) => {
    const useCustom = process.env.CLICKUP_CUSTOM_TASK_IDS === 'true' || (/[^0-9]/.test(String(taskId)));
    const params = {};
    if (useCustom) {
      params.custom_task_ids = true;
      params.team_id = process.env.CLICKUP_TEAM_ID || await getDefaultTeamId(clickupToken);
    }
    const taskRes = await axios.get(`https://api.clickup.com/api/v2/task/${taskId}`, {
        headers: { Authorization: `Bearer ${clickupToken}` },
        httpsAgent,
        params
    });
    return taskRes.data;
};

// Sleep helper for retries
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Creates a ClickUp subtask via API v2 using the parent field.
// This fetches the parent task to determine the correct list_id, validates it,
// then calls POST /list/{list_id}/task with { parent: parentTaskId }.
const createClickUpSubtask = async (clickupToken, parentTaskId, subtask) => {
    // 1) Fetch parent task to derive list id and validate
    const parentTask = await getClickUpTask(clickupToken, parentTaskId);
    const parentListId = parentTask?.list?.id || parentTask?.list_id || parentTask?.listId;
    if (!parentListId) {
      const err = new Error('Unable to resolve parent task list');
      err.code = 'PARENT_LIST_UNKNOWN';
      throw err;
    }

    // If parent itself is a subtask and nested not allowed, you may reject.
    // We allow nesting by default unless explicitly disallowed via env.
    if (parentTask.parent && process.env.CLICKUP_DISALLOW_NESTED === 'true') {
      const err = new Error('Parent task is a subtask; nested subtasks disabled');
      err.code = 'NESTED_DISABLED';
      throw err;
    }

    // Build payload for create task-in-list with parent field
    const body = {
      name: subtask.name,
      description: subtask.description,
      parent: parentTaskId,
      assignees: subtask.assignees,
      priority: subtask.priority,
      due_date: subtask.due_date,
      start_date: subtask.start_date,
      tags: subtask.tags,
      status: subtask.status
    };

    // Custom task ids handling: necessary if parentTaskId is a custom id
    const useCustom = process.env.CLICKUP_CUSTOM_TASK_IDS === 'true' || (/[^0-9]/.test(String(parentTaskId)));
    const params = {};
    if (useCustom) {
      params.custom_task_ids = true;
      params.team_id = process.env.CLICKUP_TEAM_ID || await getDefaultTeamId(clickupToken);
    }

    const url = `https://api.clickup.com/api/v2/list/${parentListId}/task`;

    // Retry on 429 and transient 5xx up to 3 attempts
    const maxAttempts = 3;
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const resp = await axios.post(url, body, {
          headers: {
            Authorization: `Bearer ${clickupToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          httpsAgent,
          params,
          validateStatus: () => true
        });

        if (resp.status === 201) {
          const data = resp.data || {};
          return {
            status_code: resp.status,
            task_id: data.id,
            parent_id: body.parent,
            created_at: data.date_created || Date.now(),
            task: data
          };
        }

        // Map common errors
        if (resp.status === 401) {
          const err = new Error('ClickUp authorization failed');
          err.code = 'CLICKUP_AUTH_FAILED';
          err.response = resp;
          throw err;
        }
        if (resp.status === 429 || (resp.status >= 500 && resp.status < 600)) {
          const backoff = 500 * Math.pow(2, attempt - 1);
          await sleep(backoff);
          continue; // retry
        }
        const err = new Error('ClickUp create subtask failed');
        err.response = resp;
        throw err;
      } catch (e) {
        lastErr = e;
        if (attempt === maxAttempts) break;
        if (e.code === 'CLICKUP_AUTH_FAILED') break; // do not retry auth failure
        // exponential backoff already applied above for non-exception responses
        await sleep(300 * attempt);
      }
    }
    throw lastErr;
};

const getListStatuses = async (clickupToken, listId) => {
  const listRes = await axios.get(`https://api.clickup.com/api/v2/list/${listId}`, {
    headers: { Authorization: `Bearer ${clickupToken}` },
    httpsAgent
  });
  return listRes.data && listRes.data.statuses ? listRes.data.statuses : [];
};

const createTaskInList = async (clickupToken, listId, payload) => {
  const res = await axios.post(`https://api.clickup.com/api/v2/list/${listId}/task`, payload, {
    headers: { 
      Authorization: `Bearer ${clickupToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    httpsAgent
  });
  return res.data;
};

const updateTask = async (clickupToken, taskId, payload) => {
  const res = await axios.put(`https://api.clickup.com/api/v2/task/${taskId}`, payload, {
    headers: { 
      Authorization: `Bearer ${clickupToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    httpsAgent
  });
  return res.data;
};


module.exports = {
  getClickUpUser,
  getClickUpTeams,
  getClickUpTasksByList,
  getClickUpTask,
  createClickUpSubtask,
  getListStatuses,
  createTaskInList,
  updateTask
};
