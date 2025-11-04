import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../utils/auth';
import Loading from './Loading';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  ReferenceLine,
  Cell
} from 'recharts';
import { FiCheckCircle, FiAlertTriangle, FiXCircle, FiCalendar } from 'react-icons/fi';

// Helper to normalize timestamps from ClickUp task objects
function toMs(v) {
  if (!v && v !== 0) return null;
  if (typeof v === 'number') return v; // ClickUp often returns ms as string, but support number
  const n = Number(v);
  if (!Number.isNaN(n) && n > 0) return n;
  const d = Date.parse(v);
  return Number.isNaN(d) ? null : d;
}

// Decide bar color based on progress ratio (0..1 ongoing, >1 overdue)
function colorByProgress(ratio) {
  if (ratio == null) return '#6c757d';
  if (ratio > 1) return '#dc3545'; // red - overdue
  if (ratio >= 0.9) return '#dc3545'; // near overdue
  if (ratio >= 0.6) return '#ffc107'; // yellow - mid
  return '#28a745'; // green - early
}

export default function TaskTimeline({ listId, className = '' }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = listId ? `/api/tasks?list_id=${encodeURIComponent(listId)}` : '/api/tasks';
        const res = await api.get(url);
        const data = await res.json();
        if (!mounted) return;
        setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load tasks');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [listId]);

  const now = Date.now();

  const normalized = useMemo(() => {
    return tasks.map(t => {
      const start = toMs(t.date_created) ?? toMs(t.created_at);
      // Prefer due_date; if not present, try date_closed; else treat as ongoing using now
      let end = toMs(t.due_date) ?? toMs(t.date_closed) ?? null;
      if (end && start && end < start) end = start; // guard bad data
      const title = t.name || t.title || t.text || `Task ${t.id || ''}`;
      const owner = Array.isArray(t.assignees) && t.assignees.length ? (t.assignees[0].username || t.assignees[0].email) : null;
      const isMilestone = (() => {
        const tags = (t.tags || []).map(x => (x.name || x).toString().toLowerCase());
        if (tags.includes('milestone')) return true;
        if (start && end && Math.abs(end - start) <= 60 * 60 * 1000) return true; // <= 1h duration → milestone-like
        return false;
      })();
      return { id: t.id, title, owner, start, end, isMilestone, raw: t };
    }).filter(x => x.start);
  }, [tasks]);

  const scale = useMemo(() => {
    if (!normalized.length) return null;
    const startMin = Math.min(...normalized.map(x => x.start));
    // If any end missing, use now for scale end to include ongoing tasks nicely
    const ends = normalized.map(x => x.end || now);
    const endMax = Math.max(...ends);
    const span = Math.max(1, endMax - startMin);
    return { startMin, endMax, span };
  }, [normalized, now]);

  // Build dataset for Recharts Gantt using stacked offset + duration bars
  const rows = useMemo(() => {
    if (!scale) return [];
    const span = scale.span;
    const min = scale.startMin;
    return normalized.map((x) => {
      const end = x.end || now;
      const offset = Math.max(0, (x.start - min));
      let duration = Math.max(0, (end - x.start));
      // Ensure a small visible duration for milestones/zero-length
      if (x.isMilestone || duration === 0) duration = Math.max(duration, 60 * 60 * 1000); // 1h bar
      const ratio = (now - x.start) / (end - x.start || 1);
      const color = colorByProgress(ratio);
      return {
        id: x.id,
        label: x.title,
        owner: x.owner,
        start: x.start,
        end,
        offset,
        duration,
        color
      };
    });
  }, [normalized, scale, now]);

  if (loading) {
    return (
      <div className={`py-4 ${className}`}>
        <Loading size="md" />
      </div>
    );
  }

  if (error) {
    return <div className={`alert alert-danger ${className}`}>{error}</div>;
  }

  if (!rows.length) {
    return <div className={`text-muted ${className}`}>No tasks to display.</div>;
  }

  const fmt = (ms) => new Date(ms).toLocaleString();
  const span = scale ? scale.span : 0;
  const min = scale ? scale.startMin : 0;
  const domain = [0, span];
  const todayX = Math.max(0, now - min);
  const height = Math.max(240, rows.length * 32 + 120);

  return (
    <div className={`card ${className}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">Task Timeline (Waterfall)</h5>
          <div className="small">{rows.length} tasks</div>
        </div>

        <div className="w-100" style={{ height }}>
          <ResponsiveContainer>
            <ComposedChart data={rows} layout="vertical" margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
              <XAxis
                type="number"
                domain={domain}
                tickFormatter={(v) => new Date(min + v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                stroke="#9ca3af"
              />
              <YAxis dataKey="label" type="category" interval={0} width={220} tick={{ fill: '#d1d5db', fontSize: 12 }} />
              <Tooltip
                labelFormatter={(label, payload) => (payload && payload[0] ? payload[0].payload.label : label)}
                formatter={(val, name, p) => {
                  const d = p && p.payload;
                  if (!d) return [''];
                  return [`${fmt(d.start)} → ${fmt(d.end)}`, ''];
                }}
                contentStyle={{ color: '#fff', background: '#151b23', border: '1px solid rgba(255,255,255,0.12)' }}
              />
              {/* Today marker */}
              <ReferenceLine x={todayX} stroke="#dc3545" strokeWidth={2} ifOverflow="extendDomain" />

              {/* Offset (invisible) */}
              <Bar dataKey="offset" stackId="a" fill="transparent" isAnimationActive={false} />
              {/* Duration (colored) */}
              <Bar dataKey="duration" stackId="a" barSize={14} radius={[4,4,4,4]}>
                {rows.map((r, i) => (
                  <Cell key={`c-${r.id || i}`} fill={r.color} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 small text-muted d-flex align-items-center gap-3">
          <span className="d-inline-flex align-items-center gap-1"><span className="d-inline-block" style={{ width: 12, height: 12, background: '#28a745', borderRadius: 2 }} /> <FiCheckCircle className="text-success" /> On track</span>
          <span className="d-inline-flex align-items-center gap-1"><span className="d-inline-block" style={{ width: 12, height: 12, background: '#ffc107', borderRadius: 2 }} /> <FiAlertTriangle className="text-warning" /> At risk</span>
          <span className="d-inline-flex align-items-center gap-1"><span className="d-inline-block" style={{ width: 12, height: 12, background: '#dc3545', borderRadius: 2 }} /> <FiXCircle className="text-danger" /> Overdue</span>
          <span className="ms-auto d-inline-flex align-items-center gap-1"><FiCalendar /> Range: {fmt(scale.startMin)} → {fmt(scale.endMax)}</span>
        </div>
      </div>
    </div>
  );
}
