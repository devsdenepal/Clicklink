const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const GITHUB_API = process.env.GITHUB_API_BASE || 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN;
const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const httpsAgent = httpsProxy ? new HttpsProxyAgent(httpsProxy) : undefined;

if (!TOKEN) console.warn('GITHUB_TOKEN not set; GitHub API calls will fail.');

const client = axios.create({
  baseURL: GITHUB_API,
  headers: { Authorization: TOKEN ? `token ${TOKEN}` : undefined, Accept: 'application/vnd.github.v3+json' },
  httpsAgent
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
