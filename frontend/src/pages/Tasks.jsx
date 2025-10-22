import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import TaskList from '../components/TaskList';
import TaskModal from '../components/TaskModal';
import { api } from '../utils/auth';

export default function TasksPage({ user }) {
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

  const listId = import.meta.env.VITE_CLICKUP_LIST_ID;

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const url = listId ? `/api/tasks?list_id=${encodeURIComponent(listId)}` : '/api/tasks';
      const res = await api.get(url);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuses = async () => {
    try {
      const url = listId ? `/api/tasks/statuses?list_id=${encodeURIComponent(listId)}` : '/api/tasks/statuses';
      const res = await api.get(url);
      const data = await res.json();
      setStatuses(data.statuses || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => { if (user) { fetchTasks(); fetchStatuses(); } }, [user]);

  const handleCreate = async payload => {
    try {
      if (listId) payload.list_id = listId;
      const res = await api.post('/api/tasks', payload);
      // handleResponse already throws on !ok
      setShowModal(false);
      await fetchTasks();
      await fetchStatuses();
      setSuccess('Task created');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err?.message || 'Failed to create task');
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    setUpdatingTaskId(task.id);
    try {
      const body = { status: newStatus };
      await api.put(`/api/tasks/${task.id}`, body);
      await fetchTasks();
    } catch (err) {
      setError(err?.message || 'Failed to update task');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Refresh tasks from ClickUp using backend sync endpoint
  const handleSyncAll = async () => {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const syncUrl = listId ? `/api/tasks/sync?list_id=${encodeURIComponent(listId)}` : '/api/tasks/sync';
      const res = await api.post(syncUrl, {});
      const data = await res.json();
      setTasks(data.tasks || []);
      await fetchStatuses();
      setSuccess(`Tasks synced${typeof data.count === 'number' ? ` (${data.count})` : ''}`);
      setLastSync(new Date().toISOString());
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err?.message || 'Failed to sync tasks');
    } finally {
      setSyncing(false);
    }
  };

  const filtered = tasks.filter(t => !query || (t.name && t.name.toLowerCase().includes(query.toLowerCase())));

  return (
    <motion.div className="container-lg"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}>
      <div className="d-flex align-items-center justify-content-between mt-3 mb-2">
        <h3 className="mb-0">Tasks</h3>
        <div className="d-flex align-items-center">
          <div className="me-2 text-end" style={{ minWidth: 160 }}>
            <div className="small text-muted">Last sync</div>
            <div>{lastSync ? new Date(lastSync).toLocaleString() : 'never'}</div>
          </div>
          <button className="btn btn-outline-secondary me-2" onClick={() => setShowModal(true)}>New Task</button>
          <button className="btn btn-primary" onClick={handleSyncAll} disabled={syncing}>
            {syncing ? <><img src="/assets/loading.gif" alt="Loading…" style={{ height: 64 }} className="me-2" />Syncing…</> : 'Sync All'}
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
          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <img src="/assets/loading.gif" alt="Loading…" style={{ height: 192 }} />
            </div>
          ) : (
            <TaskList tasks={filtered} onStatusChange={handleStatusChange} statuses={statuses} updatingTaskId={updatingTaskId} />
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {success && <div className="alert alert-success mt-3">{success}</div>}

      <TaskModal show={showModal} onClose={() => setShowModal(false)} onCreate={handleCreate} user={user} />
    </motion.div>
  );
}
