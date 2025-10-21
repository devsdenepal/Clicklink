const axios = require('axios');

const GITHUB_API = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) console.warn('GITHUB_TOKEN not set; GitHub API calls will fail.');

const client = axios.create({
  baseURL: GITHUB_API,
  headers: { Authorization: TOKEN ? `token ${TOKEN}` : undefined, Accept: 'application/vnd.github.v3+json' }
});

async function listIssues(owner, repo, since) {
  const params = { state: 'open', per_page: 100 };
  if (since) params.since = since;
  const url = `/repos/${owner}/${repo}/issues`;
  const resp = await client.get(url, { params });
  // filter out PRs (issues endpoint includes PRs)
  return resp.data.filter(i => !i.pull_request);
}

async function listPRs(owner, repo, since) {
  const params = { state: 'open', per_page: 100 };
  if (since) params.since = since;
  const url = `/repos/${owner}/${repo}/pulls`;
  const resp = await client.get(url, { params });
  return resp.data;
}

async function listCommits(owner, repo, since) {
  const params = { per_page: 100 };
  if (since) params.since = since;
  const url = `/repos/${owner}/${repo}/commits`;
  const resp = await client.get(url, { params });
  return resp.data;
}

module.exports = { listIssues, listPRs, listCommits };
