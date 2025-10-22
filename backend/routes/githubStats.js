const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const API_BASE = process.env.GITHUB_API_BASE || 'https://api.github.com';

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

    // Helper to paginate GitHub GET requests using Link header
    const paginate = async (url) => {
      let results = [];
      let nextUrl = url;
      for (let i = 0; i < 10 && nextUrl; i++) { // cap at 10 pages defensively
        const resp = await axios.get(nextUrl, { headers: ghHeaders(token) });
        if (Array.isArray(resp.data)) results = results.concat(resp.data);
        const link = resp.headers && resp.headers.link;
        if (!link) break;
        const m = link.split(',').map(s => s.trim()).find(s => s.endsWith('rel="next"'));
        if (m) {
          const mm = /<(.*?)>/.exec(m);
          nextUrl = mm ? mm[1] : null;
        } else {
          nextUrl = null;
        }
      }
      return results;
    };

    // 1) User repos across pages
    const userRepos = await paginate(`${API_BASE}/user/repos?per_page=100&affiliation=owner,collaborator,organization_member&sort=updated`);

    // 2) Orgs
    let orgs = [];
    try {
      orgs = await paginate(`${API_BASE}/user/orgs?per_page=100`);
    } catch (e) {
      // If missing read:org or SSO not authorized, return what we have but include diagnostic
    }

    // 3) For each org, fetch repos
    let orgRepos = [];
    for (const org of orgs) {
      const login = org.login;
      if (!login) continue;
      try {
        const repos = await paginate(`${API_BASE}/orgs/${login}/repos?per_page=100&type=all&sort=updated`);
        orgRepos = orgRepos.concat(repos);
      } catch (e) {
        // skip inaccessible org
      }
    }

    // Merge and de-duplicate by full_name
    const map = new Map();
    for (const r of [...userRepos, ...orgRepos]) {
      if (!r || !r.full_name) continue;
      if (!map.has(r.full_name)) map.set(r.full_name, r);
    }
    const merged = Array.from(map.values());
    res.json(merged);
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
    const [commitsRes, issuesOpenRes, issuesClosedRes, prsOpenRes, prsClosedRes, deploymentsRes] = await Promise.all([
      axios.get(`${API_BASE}/repos/${owner}/${repo}/commits?per_page=100`, { headers: ghHeaders(token) }),
      axios.get(`${API_BASE}/repos/${owner}/${repo}/issues?state=open&per_page=100`, { headers: ghHeaders(token) }),
      axios.get(`${API_BASE}/repos/${owner}/${repo}/issues?state=closed&per_page=100`, { headers: ghHeaders(token) }),
      axios.get(`${API_BASE}/repos/${owner}/${repo}/pulls?state=open&per_page=100`, { headers: ghHeaders(token) }),
      axios.get(`${API_BASE}/repos/${owner}/${repo}/pulls?state=closed&per_page=100`, { headers: ghHeaders(token) }),
      axios.get(`${API_BASE}/repos/${owner}/${repo}/deployments?per_page=20`, { headers: ghHeaders(token) })
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

    // Attach latest status for recent deployments (cap to 10 to limit requests)
    let deployments = Array.isArray(deploymentsRes.data) ? deploymentsRes.data : [];
    const recentDeploys = deployments.slice(0, 10);
    try {
      const statusResults = await Promise.all(recentDeploys.map(async (d) => {
        try {
          const st = await axios.get(`${API_BASE}/repos/${owner}/${repo}/deployments/${d.id}/statuses?per_page=1`, { headers: ghHeaders(token) });
          const latest = Array.isArray(st.data) && st.data.length ? st.data[0] : null;
          return { id: d.id, latest };
        } catch (_) {
          return { id: d.id, latest: null };
        }
      }));
      const latestMap = new Map(statusResults.map(x => [x.id, x.latest]));
      deployments = deployments.map(d => ({
        id: d.id,
        sha: d.sha,
        ref: d.ref,
        environment: d.environment,
        creator: d.creator ? { login: d.creator.login } : null,
        created_at: d.created_at,
        updated_at: d.updated_at,
        latest_status: latestMap.get(d.id) ? {
          state: latestMap.get(d.id).state,
          created_at: latestMap.get(d.id).created_at,
          environment_url: latestMap.get(d.id).environment_url,
          log_url: latestMap.get(d.id).log_url,
          target_url: latestMap.get(d.id).target_url,
          description: latestMap.get(d.id).description,
        } : null
      }));
    } catch (_) {
      // If statuses fail, return deployments without status
      deployments = deployments.map(d => ({
        id: d.id,
        sha: d.sha,
        ref: d.ref,
        environment: d.environment,
        creator: d.creator ? { login: d.creator.login } : null,
        created_at: d.created_at,
        updated_at: d.updated_at,
        latest_status: null
      }));
    }

    res.json({
      commitsCount: commits.length,
      issues: { open: issuesOpen, closed: issuesClosed },
      prs: { open: prsOpen, closed: prsClosed },
      commitHistory,
      contributors,
      deployments
    });
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: 'Failed to fetch repo stats', details: e.response?.data || e.message });
  }
});

module.exports = router;
