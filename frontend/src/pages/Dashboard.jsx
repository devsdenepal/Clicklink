import React, { useEffect, useState } from 'react';
import TaskList from '../components/TaskList';
import TaskModal from '../components/TaskModal';
import { Link } from 'react-router-dom';
import { api } from '../utils/auth';

/**
 * Dashboard
 * - Top bar: New Task button (opens modal), Sync All button (top-right) and last sync time
 * - Search / filter bar
 * - Task list (click title to open TaskDetail)
 * - Uses fetch(..., { credentials: 'include' }) for all backend calls
 */
export default function DashboardPage({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [success, setSuccess] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const listId = import.meta.env.VITE_CLICKUP_LIST_ID;
      const url = listId ? `/api/tasks?list_id=${encodeURIComponent(listId)}` : '/api/tasks';
  const res = await api.get(url);
      if (res.status === 401) return setTasks([]);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuses = async () => {
    try {
      const listId = import.meta.env.VITE_CLICKUP_LIST_ID;
      const url = listId ? `/api/tasks/statuses?list_id=${encodeURIComponent(listId)}` : '/api/tasks/statuses';
  const res = await api.get(url);
      if (!res.ok) return;
      const data = await res.json();
      setStatuses(data.statuses || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => { if (user) { fetchTasks(); fetchStatuses(); } }, [user]);

  const handleCreate = async payload => {
    try {
      const listId = import.meta.env.VITE_CLICKUP_LIST_ID;
      if (listId) payload.list_id = listId;
      const res = await api.post('/api/tasks', payload);
      if (!res.ok) throw new Error(await res.text());
      setShowModal(false);
      await fetchTasks();
      await fetchStatuses();
      setSuccess('Task created');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    setUpdatingTaskId(task.id);
    try {
      const body = { status: newStatus };
      const res = await api.put(`/api/tasks/${task.id}`, body);
      if (!res.ok) throw new Error(await res.text());
      await fetchTasks();
    } catch (err) {
      setError(String(err));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleSyncAll = async () => {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const parentTaskId = import.meta.env.VITE_CLICKUP_PARENT_TASK_ID;
      const res = await api.post('/api/github/sync', { parent_task_id: parentTaskId });
      if (res.status === 401) { setError('Not authenticated'); return; }
      const data = await res.json();
      const created = (data.created && data.created.length) ? data.created.length : (data.created || 0);
      const skipped = (data.skipped && data.skipped.length) ? data.skipped.length : (data.skipped || 0);
      const errs = Array.isArray(data.errors) ? data.errors.length : (data.errors ? 1 : 0);
      setSuccess(`Sync complete: ${created} created, ${skipped} skipped, ${errs} errors`);
      setLastSync(new Date().toISOString());
      setTimeout(() => setSuccess(null), 5000);
      await fetchTasks();
      await fetchStatuses();
    } catch (err) {
      setError(String(err));
    } finally {
      setSyncing(false);
    }
  };

  const filtered = tasks.filter(t => !query || (t.name && t.name.toLowerCase().includes(query.toLowerCase())));

  return (
    <div className="container-lg">
      <div className="d-flex align-items-center justify-content-between mt-3 mb-2">
        <h3 className="mb-0">Tasks</h3>
        <div className="d-flex align-items-center">
          <div className="me-2 text-end" style={{ minWidth: 160 }}>
            <div className="small text-muted">Last sync</div>
            <div>{lastSync ? new Date(lastSync).toLocaleString() : 'never'}</div>
          </div>
          <button className="btn btn-outline-secondary me-2" onClick={() => setShowModal(true)}>New Task</button>
          <button className="btn btn-primary" onClick={handleSyncAll} disabled={syncing}>
            {syncing ? <><span className="spinner-border spinner-border-sm me-2"></span>Syncing…</> : 'Sync All'}
          </button>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-12 col-md-6">
          <input className="form-control" placeholder="Search tasks by title…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          {loading ? <div>Loading tasks…</div> : <TaskList tasks={filtered} onStatusChange={handleStatusChange} statuses={statuses} updatingTaskId={updatingTaskId} />}
        </div>
      </div>

      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {success && <div className="alert alert-success mt-3">{success}</div>}

  <TaskModal show={showModal} onClose={() => setShowModal(false)} onCreate={handleCreate} user={user} />
    </div>
  );
}
