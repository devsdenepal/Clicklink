import React from 'react';

export default function Loading({ inline = false, size = 'md', className = '', style = {} }) {
  // Scale up 4x globally
  const height = size === 'sm' ? 64 : size === 'lg' ? 256 : 128;
  const img = (
    <img
      src="/assets/loading.gif"
      alt="Loading…"
      style={{ height, width: 'auto', ...style }}
    />
  );
  if (inline) {
    return <span className={className} aria-live="polite">{img}</span>;
  }
  return (
    <div className={`d-flex justify-content-center align-items-center ${className}`} aria-live="polite">
      {img}
    </div>
  );
}
