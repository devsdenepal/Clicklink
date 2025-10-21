import React from 'react';

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;
  const cls = type === 'error' ? 'alert-danger' : 'alert-success';
  return (
    <div className={`alert ${cls} alert-dismissible`} role="alert">
      {message}
      <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
    </div>
  );
}
