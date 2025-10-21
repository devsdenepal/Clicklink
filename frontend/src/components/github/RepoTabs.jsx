/**
 * RepoTabs.jsx
 * Props:
 * - updates: { issues, prs, commits }
 * - onCreateSubtask(issueNumber) -> promise
 *
 * Simple tabbed UI rendering lists and providing Create Subtask buttons for issues.
 */
import React, { useState } from 'react';

export default function RepoTabs({ updates = {}, onCreateSubtask }) {
  const [tab, setTab] = useState('issues');
  const issues = updates.issues || [];
  const prs = updates.prs || [];
  const commits = updates.commits || [];

  return (
    <div>
      <ul className="nav nav-tabs mb-2">
        <li className="nav-item"><button className={`nav-link ${tab==='issues'?'active':''}`} onClick={() => setTab('issues')}>Issues ({issues.length})</button></li>
        <li className="nav-item"><button className={`nav-link ${tab==='prs'?'active':''}`} onClick={() => setTab('prs')}>PRs ({prs.length})</button></li>
        <li className="nav-item"><button className={`nav-link ${tab==='commits'?'active':''}`} onClick={() => setTab('commits')}>Commits ({commits.length})</button></li>
      </ul>

      <div style={{ maxHeight: 300, overflow: 'auto' }}>
        {tab === 'issues' && (
          <div>
            {issues.length === 0 && <div className="text-muted">No issues</div>}
            <ul className="list-group">
              {issues.map(i => (
                <li key={i.id} className="list-group-item d-flex justify-content-between align-items-start">
                  <div>
                    <div><strong>#{i.number}</strong> {i.title}</div>
                    <div className="small text-muted">{i.user && i.user.login}</div>
                  </div>
                  <div>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => window.open(i.html_url, '_blank')}>Open</button>
                    <button className="btn btn-sm btn-success" onClick={() => onCreateSubtask && onCreateSubtask(i.number)}>Create Subtask</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'prs' && (
          <div>
            {prs.length === 0 && <div className="text-muted">No PRs</div>}
            <ul className="list-group">
              {prs.map(p => (
                <li key={p.id} className="list-group-item d-flex justify-content-between align-items-start">
                  <div>
                    <div><strong>#{p.number}</strong> {p.title}</div>
                    <div className="small text-muted">{p.user && p.user.login}</div>
                  </div>
                  <div>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => window.open(p.html_url, '_blank')}>Open</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'commits' && (
          <div>
            {commits.length === 0 && <div className="text-muted">No commits</div>}
            <ul className="list-group">
              {commits.map(c => (
                <li key={c.sha} className="list-group-item d-flex justify-content-between align-items-start">
                  <div>
                    <div>{c.commit && c.commit.message.split('\n')[0]}</div>
                    <div className="small text-muted">{c.commit && c.commit.author && c.commit.author.name}</div>
                  </div>
                  <div>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => window.open(c.html_url, '_blank')}>Open</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
