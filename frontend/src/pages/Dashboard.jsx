import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/auth';
import TaskTimeline from '../components/TaskTimeline';

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const listId = import.meta.env.VITE_CLICKUP_LIST_ID;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const tasksUrl = listId ? `/api/tasks?list_id=${encodeURIComponent(listId)}` : '/api/tasks';
      const statusUrl = listId ? `/api/tasks/statuses?list_id=${encodeURIComponent(listId)}` : '/api/tasks/statuses';
      const [tr, sr] = await Promise.all([api.get(tasksUrl), api.get(statusUrl)]);
      const tJson = await tr.json();
      const sJson = await sr.json();
      setTasks(Array.isArray(tJson.tasks) ? tJson.tasks : []);
      setStatuses(Array.isArray(sJson.statuses) ? sJson.statuses : []);
    } catch (e) {
      // If backend indicates the user is not a member of the required workspace, show a helpful message
      if (e && e.code === 'TEAM_MISMATCH') {
        setError('Your ClickUp account is not a member of the workspace configured for this app. Please request access to the workspace or ask the workspace admin to add you.');
      } else {
        setError(e?.message || 'Failed to load dashboard');
      }
      if (e && e.status === 401) navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const normalize = (s) => {
    if (!s) return 'Other';
    const v = (typeof s === 'string' ? s : (s.status || s.name || '')).toLowerCase();
    const vn = v.replace(/\s|-/g, ''); // remove spaces and hyphens for matching
    if (v.includes('progress') || vn.includes('inprogress')) return 'In Progress';
    if (v.includes('review') || v.includes('pr')) return 'Review';
    if (v.includes('done') || v.includes('close') || v.includes('complete')) return 'Done';
    if (v.includes('open') || vn.includes('todo') || v.includes('backlog') || v.includes('to do')) return 'Open';
    return 'Other';
  };

  const counts = useMemo(() => {
    const c = { 'Open': 0, 'In Progress': 0, 'Review': 0, 'Done': 0, 'Other': 0 };
    for (const t of tasks) c[normalize(t.status)] = (c[normalize(t.status)] || 0) + 1;
    return c;
  }, [tasks]);

  const total = tasks.length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  const recent = useMemo(() => {
    const byDate = [...tasks].sort((a, b) => {
      const ad = Number(a.date_created || a.date_updated || 0);
      const bd = Number(b.date_created || b.date_updated || 0);
      return bd - ad;
    });
    return byDate.slice(0, 10);
  }, [tasks]);

  return (
    <motion.div className="container-lg py-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Dashboard</h3>
        <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm text-secondary me-2" role="status" aria-hidden="true" />
              Loading…
            </>
          ) : 'Refresh'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && !tasks.length ? (
        <div className="d-flex justify-content-center py-5">
          <img src="/assets/loading.gif" alt="Loading…" style={{ height: 192 }} />
        </div>
      ) : (
        <>
          {/* Timeline overview */}
          <TaskTimeline className="mb-3" listId={listId} />

          {/* Status summary cards */}
          <div className="row g-3 mb-3">
            {['Open', 'In Progress', 'Review', 'Done'].map((key, idx) => (
              <div key={key} className="col-6 col-md-3">
                <motion.div className="card h-100"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                  whileHover={{ y: -2 }}>
                  <div className="card-body">
                    <div className="text-muted small">{key}</div>
                    <div className="h4 mb-2">{counts[key] || 0}</div>
                    <div className="progress" role="progressbar" aria-label={`${key} share`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct(counts[key] || 0)}>
                      <div className="progress-bar" style={{ width: `${pct(counts[key] || 0)}%` }} />
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>

          {/* Quick totals */}
          <div className="card mb-3">
            <div className="card-body d-flex justify-content-between">
              <div>Total tasks: <strong>{total}</strong></div>
              <div className="text-muted small">Open {pct(counts['Open'])}% · In Progress {pct(counts['In Progress'])}% · Review {pct(counts['Review'])}% · Done {pct(counts['Done'])}%</div>
            </div>
          </div>

          {/* Recent tasks table */}
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Recent tasks</h5>
              <div className="table-responsive">
                <table className="table table-sm align-middle table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '50%' }}>Title</th>
                      <th style={{ width: '25%' }}>Assignee</th>
                      <th style={{ width: '25%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(t => {
                      const assignee = Array.isArray(t.assignees) && t.assignees.length ? (t.assignees[0].username || t.assignees[0].email || t.assignees[0].id) : '—';
                      const statusLabel = typeof t.status === 'string' ? t.status : (t.status?.status || t.status?.name || '—');
                      const title = t.name || t.title || t.text || 'Untitled';
                      return (
                        <tr key={t.id}
                            className="cursor-pointer"
                            role="link"
                            tabIndex={0}
                            onClick={() => navigate(`/task/${t.id}`, { state: { task: t } })}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/task/${t.id}`, { state: { task: t } }); }}>
                          <td>{title}</td>
                          <td>{assignee}</td>
                          <td>{statusLabel}</td>
                        </tr>
                      );
                    })}
                    {recent.length === 0 && (
                      <tr><td colSpan="3" className="text-muted">No tasks found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
