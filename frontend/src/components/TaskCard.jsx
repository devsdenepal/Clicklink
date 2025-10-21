/**
 * TaskCard.jsx
 * Small task card used on the Dashboard.
 * Props:
 * - task: ClickUp task object
 * - repo: optional detected repo string 'owner/repo'
 */
import React from 'react';
import { Link } from 'react-router-dom';

export default function TaskCard({ task, repo }) {
  const assignee = (task.assignees && task.assignees[0]) || {};
  const status = task.status?.status || task.status || '';

  return (
    <div className="card mb-3">
      <div className="card-body d-flex justify-content-between align-items-start">
        <div>
          <h6 className="card-title mb-1"><Link to={`/task/${task.id}`} state={{ task }}>{task.name}</Link></h6>
          <div className="small text-muted">{assignee.username || '—'} · {status || 'No status'}</div>
        </div>
        <div className="text-end">
          {repo && (
            <div className="badge bg-body-secondary text-light" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
              <img src="/assets/octocat.svg" alt="gh" style={{ width: 14, marginRight: 6 }} />
              {repo}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
