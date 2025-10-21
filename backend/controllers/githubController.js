const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { createClickUpSubtask } = require('../utils/clickup');
const { listIssues, listPRs, listCommits } = require('../utils/githubApi');

// Optional proxy agent for outbound requests
const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const httpsAgent = httpsProxy ? new HttpsProxyAgent(httpsProxy) : undefined;

const createSubtask = async (req, res) => {
  try {
    const { repo, issue_number } = req.body;
    const parent_task_id = req.body.parent_task_id || process.env.CLICKUP_TASK_FOR_REPO;
    if (!repo || !issue_number || !parent_task_id) {
      return res.status(400).json({ error: 'repo, issue_number, and parent_task_id are required (set CLICKUP_TASK_FOR_REPO in .env or pass in body)' });
    }

    // 1. Fetch issue details from GitHub
  const ghHeaders = { Accept: 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_TOKEN) ghHeaders.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  const issueRes = await axios.get(`https://api.github.com/repos/${repo}/issues/${issue_number}`, { httpsAgent, headers: ghHeaders });
    const issue = issueRes.data;

    // 2. Create subtask in ClickUp
    // Do not force status; ClickUp requires a valid status for the list. Let ClickUp default it.
    const subtask = {
      name: `[GitHub Issue] ${issue.title}`,
      description: `From GitHub issue: ${issue.html_url}`
    };
    if (process.env.CLICKUP_SUBTASK_STATUS) {
      subtask.status = process.env.CLICKUP_SUBTASK_STATUS;
    }
  const newSubtask = await createClickUpSubtask(req.user.clickupToken, parent_task_id, subtask);

    res.json(newSubtask);
  } catch (err) {
    const details = err.response?.data || err.message || String(err);
    console.error('Failed to create subtask:', details);
    const status = err.response?.status || 500;
    res.status(status).json({ error: 'Failed to create subtask', details });
  }
};

module.exports = {
  createSubtask
};

// GET /api/github/repo/:owner/:repo/updates?since=
async function getRepoUpdates(req, res) {
  const { owner, repo } = req.params;
  const { since } = req.query;
  try {
    // Use utils which already set headers/token; these don't take agent, so fall back to axios when proxy required
    if (!httpsAgent) {
      const [issues, prs, commits] = await Promise.all([
        listIssues(owner, repo, since),
        listPRs(owner, repo, since),
        listCommits(owner, repo, since)
      ]);
      return res.json({ issues, prs, commits });
    }
    const ghHeaders = { Accept: 'application/vnd.github.v3+json' };
    if (process.env.GITHUB_TOKEN) ghHeaders.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    const [issuesRes, prsRes, commitsRes] = await Promise.all([
      axios.get(`https://api.github.com/repos/${owner}/${repo}/issues`, { params: { state: 'open', per_page: 100, since }, httpsAgent, headers: ghHeaders }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls`, { params: { state: 'open', per_page: 100 }, httpsAgent, headers: ghHeaders }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/commits`, { params: { per_page: 100, since }, httpsAgent, headers: ghHeaders })
    ]);
    const issues = (issuesRes.data || []).filter(i => !i.pull_request);
    return res.json({ issues, prs: prsRes.data || [], commits: commitsRes.data || [] });
  } catch (e) {
    console.error('Failed to fetch updates:', e.response?.data || e.message);
    return res.status(500).json({ error: 'Failed to fetch updates' });
  }
}

// POST /api/github/sync?repo=owner/repo
async function syncRepos(req, res) {
  try {
    const repoParam = req.query.repo;
    const targets = [];
  if (repoParam) targets.push(repoParam);
    else if (process.env.GITHUB_SYNC_REPOS) targets.push(...process.env.GITHUB_SYNC_REPOS.split(',').map(s => s.trim()).filter(Boolean));
    else return res.status(400).json({ error: 'No repo specified and GITHUB_SYNC_REPOS not configured' });

    const parentTaskId = req.body?.parent_task_id || process.env.CLICKUP_TASK_FOR_REPO;
    if (!parentTaskId) return res.status(400).json({ error: 'Missing parent_task_id (set CLICKUP_TASK_FOR_REPO or pass in body)' });

    const summary = { created: [], skipped: [], errors: [] };
    for (const full of targets) {
      try {
        const [owner, repo] = full.split('/');
        let issues;
        if (!httpsAgent) issues = await listIssues(owner, repo);
        else {
          const ghHeaders = { Accept: 'application/vnd.github.v3+json' };
          if (process.env.GITHUB_TOKEN) ghHeaders.Authorization = `token ${process.env.GITHUB_TOKEN}`;
          const resp = await axios.get(`https://api.github.com/repos/${owner}/${repo}/issues`, { params: { state: 'open', per_page: 100 }, httpsAgent, headers: ghHeaders });
          issues = (resp.data || []).filter(i => !i.pull_request);
        }
        for (const issue of issues) {
          try {
            const subtask = {
              name: `GH#${issue.number} ${issue.title}`,
              description: `From GitHub issue: ${issue.html_url}\n\n${issue.body || ''}`
            };
            if (process.env.CLICKUP_SUBTASK_STATUS) subtask.status = process.env.CLICKUP_SUBTASK_STATUS;
            const created = await createClickUpSubtask(req.user.clickupToken, parentTaskId, subtask);
            summary.created.push({ repo: full, issue: issue.number, subtask_id: created.id });
          } catch (ie) {
            summary.errors.push({ repo: full, issue: issue.number, error: ie.response?.data || ie.message });
          }
        }
      } catch (re) {
        summary.errors.push({ repo: full, error: re.response?.data || re.message });
      }
    }
    return res.json(summary);
  } catch (e) {
    console.error('Sync failed:', e.response?.data || e.message);
    return res.status(500).json({ error: 'Sync failed' });
  }
}

module.exports.getRepoUpdates = getRepoUpdates;
module.exports.syncRepos = syncRepos;
