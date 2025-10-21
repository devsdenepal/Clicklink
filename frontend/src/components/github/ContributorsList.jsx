import React from 'react';

export default function ContributorsList({ contributors = [] }) {
  if (!contributors.length) return <div className="text-muted">No data</div>;
  return (
    <ul className="list-group list-group-flush">
      {contributors.map((c, idx) => (
        <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
          <span className="text-truncate">{c.name}</span>
          <span className="badge bg-primary rounded-pill">{c.count}</span>
        </li>
      ))}
    </ul>
  );
}
