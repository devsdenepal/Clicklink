import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../utils/auth';

export default function Activity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(50);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/activity?limit=${encodeURIComponent(limit)}`);
      const json = await res.json();
      setActivities(Array.isArray(json.activities) ? json.activities : []);
    } catch (e) {
      setError(e?.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatTime = (ts) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  };

  const iconFor = (a) => {
    const s = (a?.action || '').toLowerCase();
    if (s.includes('create')) return '🟢';
    if (s.includes('edit') || s.includes('update')) return '🟡';
    if (s.includes('delete') || s.includes('remove')) return '🔴';
    if (s.includes('status')) return '🔁';
    return '📝';
  };

  const rows = useMemo(() => activities, [activities]);

  return (
    <motion.div
      className="container-lg py-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
    >
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Activity</h3>
        <div className="d-flex align-items-center gap-2">
          <select className="form-select form-select-sm w-auto" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {[20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            {loading ? (<><img src="/assets/loading.gif" alt="Loading…" style={{ height: 64 }} className="me-2" />Loading…</>) : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading && !rows.length ? (
        <div className="d-flex justify-content-center py-5">
          <img src="/assets/loading.gif" alt="Loading…" style={{ height: 192 }} />
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Recent activity</h5>
            <div className="table-responsive">
              <table className="table table-sm align-middle table-hover">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}></th>
                    <th style={{ width: '45%' }}>Action</th>
                    <th style={{ width: '20%' }}>User</th>
                    <th style={{ width: '20%' }}>Task</th>
                    <th style={{ width: '10%' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a._id || `${a.userId}-${a.timestamp}`}>  
                      <td className="text-center">{iconFor(a)}</td>
                      <td>{a.action}</td>
                      <td>{a.username || a.userId || '—'}</td>
                      <td>{a.taskName || a.taskId || '—'}</td>
                      <td className="text-nowrap">{formatTime(a.timestamp)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-muted">No activity found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
