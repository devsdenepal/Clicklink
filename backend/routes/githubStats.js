const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

router.get('/repos', requireAuth, async (req, res) => {
  try {
    const token = req.user.githubToken;
    if (!token) return res.status(400).json({ error: 'GitHub token missing' });
    const r = await axios.get('https://api.github.com/user/repos?per_page=100', { headers: ghHeaders(token) });
    res.json(r.data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: 'Failed to fetch repos', details: e.response?.data || e.message });
  }
});

router.get('/repo/:owner/:repo/stats', requireAuth, async (req, res) => {
  try {
    const token = req.user.githubToken;
    if (!token) return res.status(400).json({ error: 'GitHub token missing' });
    const { owner, repo } = req.params;

    // Fetch commits, issues, and pull requests
    const [commitsRes, issuesOpenRes, issuesClosedRes, prsOpenRes, prsClosedRes] = await Promise.all([
      axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`, { headers: ghHeaders(token) }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`, { headers: ghHeaders(token) }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/issues?state=closed&per_page=100`, { headers: ghHeaders(token) }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=100`, { headers: ghHeaders(token) }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=closed&per_page=100`, { headers: ghHeaders(token) })
    ]);

    const commits = commitsRes.data || [];
    // Build commit history by date (YYYY-MM-DD)
    const historyMap = new Map();
    const contributorMap = new Map();
    for (const c of commits) {
      const date = (c.commit && c.commit.author && c.commit.author.date || '').slice(0,10);
      if (date) historyMap.set(date, (historyMap.get(date) || 0) + 1);
      const login = (c.author && c.author.login) || (c.commit && c.commit.author && c.commit.author.name) || 'unknown';
      contributorMap.set(login, (contributorMap.get(login) || 0) + 1);
    }
    const commitHistory = Array.from(historyMap.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([date,count]) => ({ date, count }));
    const contributors = Array.from(contributorMap.entries()).map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count).slice(0, 10);

    const issuesOpen = Array.isArray(issuesOpenRes.data) ? issuesOpenRes.data.filter(i => !i.pull_request).length : 0;
    const issuesClosed = Array.isArray(issuesClosedRes.data) ? issuesClosedRes.data.filter(i => !i.pull_request).length : 0;
    const prsOpen = Array.isArray(prsOpenRes.data) ? prsOpenRes.data.length : 0;
    const prsClosed = Array.isArray(prsClosedRes.data) ? prsClosedRes.data.length : 0;

    res.json({
      commitsCount: commits.length,
      issues: { open: issuesOpen, closed: issuesClosed },
      prs: { open: prsOpen, closed: prsClosed },
      commitHistory,
      contributors
    });
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: 'Failed to fetch repo stats', details: e.response?.data || e.message });
  }
});

module.exports = router;
