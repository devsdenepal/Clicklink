/**
 * TaskModal.jsx
 * Props:
 * - show: bool
 * - onClose: () => void
 * - onCreate: (payload) => Promise
 *
 * Renders a modal form to create a task. Includes optional GitHub repo input
 * and shows repo validation if description contains a GitHub link.
 */
import React, { useEffect, useState } from 'react';
import { api } from '../utils/auth';

export default function TaskModal({ show, onClose, onCreate, user }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [members, setMembers] = useState([]);
  const [membersError, setMembersError] = useState(null);
  const [githubRepo, setGithubRepo] = useState('');
  const [repoDetected, setRepoDetected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) { setMembers([]); return; }
      try {
        const res = await api.get('/api/members');
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          setMembersError(txt || 'Failed to load members');
          return;
        }
        const data = await res.json();
        if (mounted) setMembers(data.members || []);
      } catch (e) { setMembersError(String(e)); }
    })();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    const re = /https?:\/\/github.com\/([-\w\.]+)\/([-\w\.]+)\/?/i;
    const m = re.exec(description || '');
    setRepoDetected(m ? `${m[1]}/${m[2]}` : null);
  }, [description]);

  useEffect(() => {
    if (repoDetected && !githubRepo) setGithubRepo(repoDetected);
  }, [repoDetected]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { title, description };
      if (assigneeId) payload.assignees = [Number(assigneeId)];
      if (githubRepo) payload.github_repo = githubRepo;
      await onCreate(payload);
      setTitle(''); setDescription(''); setAssigneeId(''); setGithubRepo('');
    } catch (e) {
      // parent handles errors
    } finally {
      setSubmitting(false);
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="modal show" style={{ display: 'block' }} tabIndex="-1">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <form onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">Create Task</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="mb-2">
                <label className="form-label">Title</label>
                <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>

              <div className="mb-2">
                <label className="form-label">Description</label>
                <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} rows={4} />
              </div>

              <div className="mb-2">
                <label className="form-label">Assignee</label>
                <select className="form-select" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                  <option value="">(none)</option>
                  {members.map(m => <option key={m.user.id || m.user_id} value={m.user.id || m.user_id}>{m.user.username || m.user.email}</option>)}
                </select>
                {membersError && <div className="small text-danger mt-1">{membersError}</div>}
              </div>

              <div className="mb-2">
                <label className="form-label">GitHub Repo (optional)</label>
                <input className="form-control" value={githubRepo} onChange={e => setGithubRepo(e.target.value)} placeholder="owner/repo" />
                {repoDetected && <div className="small text-muted mt-1">Detected repo from description: {repoDetected}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create Task'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
