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

const getClickUpTasksByList = async (clickupToken, listId) => {
  const tasksRes = await axios.get(`https://api.clickup.com/api/v2/list/${listId}/task`, {
    headers: { Authorization: `Bearer ${clickupToken}` },
    httpsAgent
  });
  return tasksRes.data.tasks;
};

const getClickUpTask = async (clickupToken, taskId) => {
    const taskRes = await axios.get(`https://api.clickup.com/api/v2/task/${taskId}`, {
        headers: { Authorization: `Bearer ${clickupToken}` },
        httpsAgent
    });
    return taskRes.data;
};

const createClickUpSubtask = async (clickupToken, parentTaskId, subtask) => {
    const url = `https://api.clickup.com/api/v2/task/${parentTaskId}/subtask`;
    const subtaskRes = await axios.post(url, subtask, {
        headers: { 
          Authorization: `Bearer ${clickupToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        httpsAgent
    });
    return subtaskRes.data;
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
