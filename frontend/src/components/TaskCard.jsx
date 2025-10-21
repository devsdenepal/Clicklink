/**
 * TaskCard.jsx
 * Small task card used on the Dashboard.
 * Props:
 * - task: ClickUp task object
 * - repo: optional detected repo string 'owner/repo'
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function TaskCard({ task, repo }) {
  const assignee = (task.assignees && task.assignees[0]) || {};
  const status = task.status?.status || task.status || '';

  return (
    <motion.div className="card mb-3"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.25 }}>
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
    </motion.div>
  );
}
