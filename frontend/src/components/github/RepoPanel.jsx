/**
 * RepoPanel.jsx
 * Props:
 * - repo: string in form 'owner/repo'
 * - parentTaskId: the ClickUp task id to attach subtasks to
 *
 * Renders recent commits, issues, and PRs using RepoTabs and provides
 * buttons to sync the repo or create a subtask from an issue.
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../utils/auth';
import RepoTabs from './RepoTabs';

export default function RepoPanel({ repo, parentTaskId }) {
  const [updates, setUpdates] = useState({ issues: [], prs: [], commits: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const fetchUpdates = async () => {
    setLoading(true); setError(null);
    try {
      const [owner, name] = repo.split('/');
  const res = await api.get(`/api/github/repo/${owner}/${name}/updates`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUpdates({ issues: data.issues || [], prs: data.prs || [], commits: data.commits || [] });
    } catch (e) {
      setError(String(e));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUpdates(); }, [repo]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true); setError(null);
    try {
      const url = `/api/github/sync?repo=${encodeURIComponent(repo)}`;
  const res = await api.post(url, {});
      if (!res.ok) throw new Error(await res.text());
      await fetchUpdates();
    } catch (e) { setError(String(e)); }
    finally { setSyncing(false); }
  };

  const createSubtask = async (issueNumber) => {
    try {
      const body = { repo, issue_number: issueNumber, parent_task_id: parentTaskId };
  const res = await api.post('/api/github/create-subtask', body);
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="card mb-3 p-2">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <strong>{repo}</strong>
        <div>
          <button className="btn btn-sm btn-outline-secondary me-2" onClick={fetchUpdates} disabled={loading}>Refresh</button>
          <button className="btn btn-sm btn-primary" onClick={handleSync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync Repo'}</button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      <RepoTabs updates={updates} onCreateSubtask={createSubtask} />
    </div>
  );
}
