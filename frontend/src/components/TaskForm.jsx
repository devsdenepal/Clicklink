import React, { useState, useEffect } from 'react';
import { api } from '../utils/auth';

export default function TaskForm({ onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [members, setMembers] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async function fetchMembers() {
      try {
        const res = await api.get('/api/members');
        const data = await res.json();
        if (mounted) setMembers(data.members || []);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const submit = async e => {
    e.preventDefault();
    const payload = { title, description };
    if (assigneeId) payload.assignees = [Number(assigneeId)];
    await onCreate(payload);
    setTitle(''); setDescription(''); setAssigneeId('');
  };

  return (
    <form onSubmit={submit} className="card p-3 mb-3">
      <div className="mb-2">
        <label className="form-label">Title</label>
        <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
      </div>

      <div className="mb-2">
        <label className="form-label">Description</label>
        <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="mb-2">
        <label className="form-label">Assignee</label>
        <select className="form-select" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
          <option value="">(none)</option>
          {members.map(m => <option key={m.user.id || m.user_id} value={m.user.id || m.user_id}>{m.user.username || m.user.email || (m.user.first_name + ' ' + m.user.last_name)}</option>)}
        </select>
      </div>

      <div className="text-end">
        <button className="btn btn-primary" type="submit">Create Task</button>
      </div>
    </form>
  );
}
