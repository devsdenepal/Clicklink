import React, { useEffect, useState } from 'react';
import { api } from '../utils/auth';

export default function GitHubPanel({ owner, repo, since }) {
  const [data, setData] = useState({ issues: [], prs: [], commits: [] });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
  const url = `/api/github/repo/${owner}/${repo}/updates${since ? '?since=' + encodeURIComponent(since) : ''}`;
  const res = await api.get(url);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (e) {
      setMsg({ type: 'error', text: String(e) });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUpdates(); }, []);

  const handleSync = async () => {
    try {
  const res = await api.post(`/api/github/sync?repo=${owner}/${repo}`, {});
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setMsg({ type: 'success', text: `Sync complete: ${JSON.stringify(j)}` });
    } catch (e) { setMsg({ type: 'error', text: String(e) }); }
  };

  const handleCreateSubtask = async (issueNumber) => {
    try {
      // Use ClickUp subtask endpoint directly; requires a valid parent task id
      const parent_task_id = window.__CURRENT_TASK_ID__;
      const payload = {
        parent_task_id,
        name: `[GitHub Issue #${issueNumber}] ${owner}/${repo}`,
        description: `Imported from GitHub issue ${owner}/${repo}#${issueNumber}`
      };
      const res = await api.post('/api/tasks/subtasks', payload);
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setMsg({ type: 'success', text: `Created subtask: ${JSON.stringify(j)}` });
      fetchUpdates();
    } catch (e) { setMsg({ type: 'error', text: String(e) }); }
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="card-title mb-0">{owner}/{repo}</h5>
          <div>
            <button className="btn btn-sm btn-outline-primary me-2" onClick={handleSync}>Sync Now</button>
            <button className="btn btn-sm btn-outline-secondary" onClick={fetchUpdates}>Refresh</button>
          </div>
        </div>
        {msg && <div className={`alert ${msg.type === 'error' ? 'alert-danger' : 'alert-success'}`}>{msg.text}</div>}

        <div className="row">
          <div className="col-md-4">
            <h6>Open Issues</h6>
            <ul className="list-unstyled small">
              {data.issues.map(i => (
                <li key={i.id} className="mb-2">
                  <div><strong>#{i.number}</strong> {i.title}</div>
                  <div className="mt-1">
                    <button className="btn btn-sm btn-primary me-2" onClick={() => handleCreateSubtask(i.number)}>Create Subtask</button>
                    <a className="btn btn-sm btn-outline-secondary" href={i.html_url} target="_blank" rel="noreferrer">Open</a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-4">
            <h6>Open PRs</h6>
            <ul className="list-unstyled small">
              {data.prs.map(p => (
                <li key={p.id}><a href={p.html_url} target="_blank" rel="noreferrer">#{p.number} {p.title}</a></li>
              ))}
            </ul>
          </div>
          <div className="col-md-4">
            <h6>Recent Commits</h6>
            <ul className="list-unstyled small">
              {data.commits.map(c => (
                <li key={c.sha}><a href={`https://github.com/${owner}/${repo}/commit/${c.sha}`} target="_blank" rel="noreferrer">{c.sha.substring(0,7)} - {c.commit.message.split('\n')[0]}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
