import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { api } from '../utils/auth';

/**
 * TaskDetail
 * - Fetches task from /api/tasks list and displays full details
 * - Detects GitHub repo links in description and fetches public GitHub API data
 */
function extractReposFromText(text) {
  if (!text) return [];
  const re = /https?:\/\/github.com\/([-\w\.]+)\/([-\w\.]+)\/?/gi;
  const out = new Set();
  let m;
  while ((m = re.exec(text)) !== null) out.add(`${m[1]}/${m[2]}`);
  return Array.from(out);
}

export default function TaskDetail({ user, checkAuthStatus }) {
  const { id } = useParams();
  const location = useLocation();
  const [task, setTask] = useState(null);
  const [repos, setRepos] = useState([]);
  const [githubData, setGithubData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [subtasksIndex, setSubtasksIndex] = useState(new Set());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // If the Link passed the task in location.state, use it (faster and works when session absent)
        const stateTask = location?.state?.task;
        let reposList = [];
        if (stateTask) {
          setTask(stateTask);
          reposList = extractReposFromText(stateTask.description || '');
          setRepos(reposList);
        } else if (user) {
          const res = await api.get(`/api/tasks/${id}`);
          const t = await res.json();
          if (!mounted) return;
          // ClickUp task endpoint returns the task object directly
          setTask(t);
          reposList = extractReposFromText(t.description || '');
          setRepos(reposList);
        } else {
          // Not logged in: we can still render GitHub data if the Link passed task state
          // Otherwise, skip fetching ClickUp task to avoid 401 noise
        }
        // If logged in, fetch existing subtasks to filter issues already tracked as subtasks
        if (user) {
          try {
            const subsRes = await api.get(`/api/tasks/${id}/subtasks`);
            const subsJson = await subsRes.json();
            const subs = subsJson.subtasks || [];
            const idx = new Set();
            const nameRe = /GitHub Issue\s*#(\d+)/i;
            const descRe = /([\-\w\.]+\/[\-\w\.]+)#(\d+)/i;
            for (const s of subs) {
              const n = s.name || '';
              const d = s.description || '';
              let issueNum = null;
              let repoFromName = null;
              // Try to extract from name pattern we create
              const mName = n.match(/\[GitHub Issue\s*#(\d+)\]\s+([\-\w\.]+\/[\-\w\.]+)/i);
              if (mName) {
                issueNum = mName[1];
                repoFromName = mName[2];
                idx.add(`${repoFromName}#${issueNum}`);
                continue;
              }
              // Fallback: extract from description "owner/repo#123"
              const mDesc = d.match(descRe);
              if (mDesc) {
                idx.add(`${mDesc[1]}#${mDesc[2]}`);
                continue;
              }
              // Last fallback: just index by issue number if found (less precise)
              const mIssueOnly = n.match(nameRe);
              if (mIssueOnly && Array.isArray(reposList)) {
                for (const r of reposList) idx.add(`${r}#${mIssueOnly[1]}`);
              }
            }
            if (mounted) setSubtasksIndex(idx);
          } catch (e) {
            // Non-fatal: just means we can't filter
          }
        }

        // fetch GitHub data for each repo (public API)
        const gdata = {};
        for (const r of reposList) {
          try {
            const [owner, repo] = r.split('/');
            const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
            if (!repoRes.ok) throw new Error('Failed repo fetch');
            const repoJson = await repoRes.json();
            const issuesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=20`);
            const issuesJson = await issuesRes.json();
            gdata[r] = { repo: repoJson, issues: Array.isArray(issuesJson) ? issuesJson : [] , lastFetched: new Date().toISOString() };
          } catch (e) {
            gdata[r] = { error: String(e) };
          }
        }
        if (mounted) setGithubData(gdata);
      } catch (e) {
        if (mounted) setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const createSubtaskFromIssue = async (repo, issueNumber) => {
    try {
      if (!user) return setError('Not logged in to ClickUp. Please connect your account.');
      if (!task || !task.id) return setError('Task id missing - reopen from the dashboard to enable subtask creation');
      const payload = {
        name: `[GitHub Issue #${issueNumber}] ${repo}`,
        description: `Imported from GitHub issue ${repo}#${issueNumber}`
      };
      const res = await api.post(`/api/tasks/${task.id}/subtasks`, payload);
      const data = await res.json();
      setSuccess(`Subtask created (id: ${data.task_id || data.id || 'unknown'})`);
      setTimeout(() => setSuccess(null), 4000);
      // Optional: refresh details if you want to show live updates
      // const refreshed = await api.get(`/api/tasks/${id}`);
      // setTask(await refreshed.json());
      return data;
    } catch (e) {
      setError(String(e));
      return null;
    }
  };

  if (loading) return <div className="container mt-3">Loading…</div>;
  if (error) return (
    <div className="container mt-3">
      <div className="alert alert-warning">{error}</div>
      <div className="mb-3">If you want to create subtasks from GitHub issues, please connect ClickUp.</div>
      <a className="btn btn-primary" href="/auth/clickup">Connect ClickUp</a>
    </div>
  );

  return (
    <div className="container mt-3">
      {success && (
        <div className="alert alert-success">{success}</div>
      )}
      <div className="row">
        <div className="col-md-7">
          <div className="card p-3 mb-3">
            <h4>{task.name}</h4>
            <div className="small text-muted mb-2">Status: {task.status?.status || task.status || '—'}</div>
            <div className="mb-3"><pre style={{ whiteSpace: 'pre-wrap' }}>{task.description || '—'}</pre></div>
          </div>
        </div>
        <div className="col-md-5">
          <h5>GitHub</h5>
          {repos.length === 0 && <div className="text-muted">No GitHub repo links found in description.</div>}
          {repos.map(r => {
            const gd = githubData[r];
            return (
              <div key={r} className="card mb-3" style={{ background: '#f8f9fa' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{r}</strong>
                      {gd && gd.repo && (
                        <div className="small text-muted">⭐ {gd.repo.stargazers_count} · Issues: {gd.repo.open_issues_count} · Updated: {new Date(gd.repo.updated_at).toLocaleString()}</div>
                      )}
                    </div>
                    <div>
                      <a className="btn btn-sm btn-outline-primary me-2" href={`https://github.com/${r}`} target="_blank" rel="noreferrer">Open in GitHub</a>
                    </div>
                  </div>

                  <hr />

                  {gd && gd.error && <div className="text-danger">{gd.error}</div>}
                  {gd && gd.issues && (
                    <div>
                      <h6>Open issues</h6>
                      <ul className="list-group">
                        {gd.issues
                          .filter(issue => !subtasksIndex.has(`${r}#${issue.number}`))
                          .map(issue => (
                          <li key={issue.id} className="list-group-item d-flex justify-content-between align-items-start">
                            <div>
                              <div><strong>#{issue.number}</strong> {issue.title}</div>
                              <div className="small text-muted">{issue.user && issue.user.login}</div>
                            </div>
                            <div>
                              <button className="btn btn-sm btn-outline-primary me-2" onClick={() => window.open(issue.html_url, '_blank')}>Open</button>
                              {user ? (
                                <button className="btn btn-sm btn-success" onClick={() => createSubtaskFromIssue(r, issue.number)}>Create Subtask</button>
                              ) : (
                                <button className="btn btn-sm btn-secondary" disabled title="Connect ClickUp to create subtasks">Create Subtask</button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
