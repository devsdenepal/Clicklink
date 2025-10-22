import React from 'react';

export default function StatsCards({ stats }) {
  const cards = [
    { label: 'Commits', value: stats?.commitsCount || 0 },
    { label: 'Issues (Open)', value: stats?.issues?.open || 0 },
    { label: 'Issues (Closed)', value: stats?.issues?.closed || 0 },
    { label: 'PRs (Open)', value: stats?.prs?.open || 0 },
    { label: 'PRs (Closed)', value: stats?.prs?.closed || 0 },
    ...(Array.isArray(stats?.deployments) ? [{ label: 'Deployments', value: stats.deployments.length }] : [])
  ];
  return (
    <div className="row g-3 mb-3">
      {cards.map((c, idx) => (
        <div key={idx} className="col-6 col-md-4 col-lg-2">
          <div className="card h-100"><div className="card-body">
            <div className="text-muted small">{c.label}</div>
            <div className="h4 mb-0">{c.value}</div>
          </div></div>
        </div>
      ))}
    </div>
  );
}
