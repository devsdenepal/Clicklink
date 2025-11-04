import React from 'react';

function TaskRow({ task, onStatusChange, statuses = [], updatingTaskId }) {
  const rawAssignee = (Array.isArray(task.assignees) && task.assignees.length ? (task.assignees[0].user || task.assignees[0]) : null);
  const assigneeLabel = rawAssignee ? (rawAssignee.username || rawAssignee.email || rawAssignee.name || rawAssignee.display_name || rawAssignee.full_name || rawAssignee.id) : '—';
  const due = task.due_date ? new Date(Number(task.due_date)).toLocaleString() : '—';
  const current = task.status ? (task.status.status || task.status) : '';
  const isUpdating = updatingTaskId === task.id;

  return (
    <tr>
      <td>{task.name}</td>
      <td>{current || '—'}</td>
  <td>{assigneeLabel}</td>
      <td>{due}</td>
      <td>
        <div className="d-flex align-items-center">
          <select disabled={isUpdating} className="form-select form-select-sm me-2" value={current} onChange={e => onStatusChange(task, e.target.value)}>
            <option value="">(no change)</option>
            {statuses.map(s => {
              const label = (s.status || s).toString();
              return <option key={label} value={label}>{label}</option>;
            })}
          </select>
          {isUpdating && (
            <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true" style={{ width: 18, height: 18 }} />
          )}
        </div>
      </td>
    </tr>
  );
}

  import TaskCard from './TaskCard';

  export default function TaskList({ tasks = [] }) {
    if (!tasks || tasks.length === 0) return <div className="text-muted">No tasks found.</div>;

    // detect repo in description for badge
    const detectRepo = (text) => {
      if (!text) return null;
      const re = /https?:\/\/github.com\/([\-\w\.]+)\/([\-\w\.]+)\/?/i;
      const m = re.exec(text);
      return m ? `${m[1]}/${m[2]}` : null;
    };

    return (
      <div className="row">
        {tasks.map(t => (
          <div key={t.id} className="col-12 col-md-6">
            <TaskCard task={t} repo={detectRepo(t.description)} />
          </div>
        ))}
      </div>
    );
  }
