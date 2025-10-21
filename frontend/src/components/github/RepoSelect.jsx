import React from 'react';
import { motion } from 'framer-motion';

export default function RepoSelect({ options = [], value, onChange }) {
  const listId = 'repo-options';
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3">
      <label className="form-label">Repository</label>
      <input
        type="text"
        className="form-control"
        placeholder="Search repositories…"
        list={listId}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </datalist>
      <div className="form-text">Start typing to see suggestions. Select an exact match to load stats.</div>
    </motion.div>
  );
}
