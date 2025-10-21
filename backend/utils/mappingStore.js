const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', '.data');
const FILE = path.join(DATA_DIR, 'mappings.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let store = new Map();

function load() {
  try {
    if (fs.existsSync(FILE)) {
      const data = JSON.parse(fs.readFileSync(FILE, 'utf8') || '{}');
      store = new Map(Object.entries(data));
    }
  } catch (e) {
    console.warn('Failed to load mapping store:', e.message);
  }
}

function persist() {
  try {
    const obj = Object.fromEntries(store);
    fs.writeFileSync(FILE, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.warn('Failed to persist mapping store:', e.message);
  }
}

load();

function _key(repo, issueNumber) {
  return `${repo}#${issueNumber}`;
}

async function getMapping(repo, issueNumber) {
  const val = store.get(_key(repo, issueNumber));
  return val ? JSON.parse(JSON.stringify(val)) : null;
}

async function setMapping(repo, issueNumber, mapping) {
  store.set(_key(repo, issueNumber), mapping);
  persist();
}

async function findBySubtaskId(subtaskId) {
  for (const [k, v] of store.entries()) {
    try {
      const obj = v;
      if (obj && obj.clickup_subtask_id == subtaskId) return { key: k, mapping: obj };
    } catch (e) { /* ignore */ }
  }
  return null;
}

module.exports = { getMapping, setMapping, findBySubtaskId };
