import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../utils/auth';
import StatsCards from '../components/github/StatsCards';
import CommitsChart from '../components/github/CommitsChart';
import ContributorsList from '../components/github/ContributorsList';
import { getToken } from '../utils/auth';

/**
 * TaskDetail
 * - Fetches task from /api/tasks list and displays full details
 * - Detects GitHub repo links in description and fetches public GitHub API data
 */
function extractReposFromText(text) {
  if (!text) return [];
  const re = /https?:\/\/github.com\/([-\w\.]+)\/([-\w\.]+)\/?/gi;
  const out = new Set();
  let m;
  while ((m = re.exec(text)) !== null) out.add(`${m[1]}/${m[2]}`);
  return Array.from(out);
}

export default function TaskDetail({ user, checkAuthStatus }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [repos, setRepos] = useState([]);
  const [githubData, setGithubData] = useState({});
  const [githubStats, setGithubStats] = useState({}); // { 'owner/repo': stats }
  const [githubStatsLoading, setGithubStatsLoading] = useState(false);
  const [githubStatsError, setGithubStatsError] = useState(null);
  const [ghTokenMissing, setGhTokenMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [subtasksIndex, setSubtasksIndex] = useState(new Set());
  const [subtasks, setSubtasks] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [updatingSubId, setUpdatingSubId] = useState(null);
  // Edit controls
  const [members, setMembers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editAssignees, setEditAssignees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // If the Link passed the task in location.state, use it (faster and works when session absent)
        const stateTask = location?.state?.task;
        let reposList = [];
        if (stateTask) {
          setTask(stateTask);
          // Initialize edit fields from stateTask as well
          setEditName(stateTask.name || '');
          setEditDescription(stateTask.description || '');
          const statusLabelS = typeof stateTask.status === 'string' ? stateTask.status : (stateTask.status?.status || stateTask.status?.name || '');
          setEditStatus(statusLabelS);
          const assigneeIdsS = Array.isArray(stateTask.assignees) ? stateTask.assignees.map(a => a.id).filter(Boolean) : [];
          setEditAssignees(assigneeIdsS);
          reposList = extractReposFromText(stateTask.description || '');
          setRepos(reposList);
        } else if (user) {
          const res = await api.get(`/api/tasks/${id}`);
          const t = await res.json();
          if (!mounted) return;
          // ClickUp task endpoint returns the task object directly
          setTask(t);
          reposList = extractReposFromText(t.description || '');
          setRepos(reposList);
          // Initialize edit fields
          setEditName(t.name || '');
          setEditDescription(t.description || '');
          const statusLabel = typeof t.status === 'string' ? t.status : (t.status?.status || t.status?.name || '');
          setEditStatus(statusLabel);
          const assigneeIds = Array.isArray(t.assignees) ? t.assignees.map(a => a.id).filter(Boolean) : [];
          setEditAssignees(assigneeIds);
        } else {
          // Not logged in: we can still render GitHub data if the Link passed task state
          // Otherwise, skip fetching ClickUp task to avoid 401 noise
        }
        // If logged in, fetch existing subtasks to filter issues already tracked as subtasks
        if (user) {
          try {
            const subsRes = await api.get(`/api/tasks/${id}/subtasks`);
            const subsJson = await subsRes.json();
            const subs = subsJson.subtasks || [];
            const idx = new Set();
            const nameRe = /GitHub Issue\s*#(\d+)/i;
            const descRe = /([\-\w\.]+\/[\-\w\.]+)#(\d+)/i;
            for (const s of subs) {
              const n = s.name || '';
              const d = s.description || '';
              let issueNum = null;
              let repoFromName = null;
              // Try to extract from name pattern we create
              const mName = n.match(/\[GitHub Issue\s*#(\d+)\]\s+([\-\w\.]+\/[\-\w\.]+)/i);
              if (mName) {
                issueNum = mName[1];
                repoFromName = mName[2];
                idx.add(`${repoFromName}#${issueNum}`);
                continue;
              }
              // Fallback: extract from description "owner/repo#123"
              const mDesc = d.match(descRe);
              if (mDesc) {
                idx.add(`${mDesc[1]}#${mDesc[2]}`);
                continue;
              }
              // Last fallback: just index by issue number if found (less precise)
              const mIssueOnly = n.match(nameRe);
              if (mIssueOnly && Array.isArray(reposList)) {
                for (const r of reposList) idx.add(`${r}#${mIssueOnly[1]}`);
              }
            }
            if (mounted) {
              setSubtasksIndex(idx);
              setSubtasks(subs);
            }
          } catch (e) {
            // Non-fatal: just means we can't filter
          }
        }

        // fetch GitHub data for each repo (public API)
        const gdata = {};
        for (const r of reposList) {
          try {
            const [owner, repo] = r.split('/');
            const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
            if (!repoRes.ok) throw new Error('Failed repo fetch');
            const repoJson = await repoRes.json();
            const issuesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=20`);
            const issuesJson = await issuesRes.json();
            gdata[r] = { repo: repoJson, issues: Array.isArray(issuesJson) ? issuesJson : [] , lastFetched: new Date().toISOString() };
          } catch (e) {
            gdata[r] = { error: String(e) };
          }
        }
        if (mounted) setGithubData(gdata);

        // Fetch GitHub stats (requires GitHub auth on backend)
        if (reposList && reposList.length) {
          setGithubStatsLoading(true);
          setGithubStatsError(null);
          const statsMap = {};
          for (const r of reposList) {
            try {
              const [owner, repo] = r.split('/');
              const res = await api.get(`/api/github/repo/${owner}/${repo}/stats`);
              const data = await res.json();
              statsMap[r] = data;
            } catch (e) {
              const msg = e?.message || '';
              if (/github token missing/i.test(msg)) setGhTokenMissing(true);
              statsMap[r] = { error: msg || 'Failed to load repo stats' };
            }
          }
          if (mounted) setGithubStats(statsMap);
          if (mounted) setGithubStatsLoading(false);
        }
      } catch (e) {
        if (mounted) setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // Fetch members and statuses for editing once we have task info
  useEffect(() => {
    let cancelled = false;
    const loadMeta = async () => {
      if (!user || !task) return;
      setMetaLoading(true);
      try {
        // Members
        const mRes = await api.get('/api/members');
        const mJson = await mRes.json();
        const normalizedMembers = Array.isArray(mJson?.members) ? mJson.members : (Array.isArray(mJson) ? mJson : []);
        // ensure shape { id, username/email }
        const mm = normalizedMembers.map(m => m.user || m).filter(Boolean);
        if (!cancelled) setMembers(mm);
        // Statuses for this task's list
        const listId = task?.list?.id || task?.list_id || task?.listId;
        if (listId) {
          const sRes = await api.get(`/api/tasks/statuses?list_id=${encodeURIComponent(listId)}`);
          const sJson = await sRes.json();
          const st = Array.isArray(sJson.statuses) ? sJson.statuses : [];
          if (!cancelled) setStatuses(st);
        }
      } catch (e) {
        if (!cancelled) console.warn('Failed to load members/statuses', e);
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    };
    loadMeta();
    return () => { cancelled = true; };
  }, [user, task]);

  const createSubtaskFromIssue = async (repo, issueNumber) => {
    try {
      if (!user) return setError('Not logged in to ClickUp. Please connect your account.');
      if (!task || !task.id) return setError('Task id missing - reopen from the dashboard to enable subtask creation');
      const payload = {
        name: `[GitHub Issue #${issueNumber}] ${repo}`,
        description: `Imported from GitHub issue ${repo}#${issueNumber}`
      };
      const res = await api.post(`/api/tasks/${task.id}/subtasks`, payload);
      const data = await res.json();
      setSuccess(`Subtask created (id: ${data.task_id || data.id || 'unknown'})`);
      setTimeout(() => setSuccess(null), 4000);
      // Optional: refresh details if you want to show live updates
      // const refreshed = await api.get(`/api/tasks/${id}`);
      // setTask(await refreshed.json());
      return data;
    } catch (e) {
      setError(String(e));
      return null;
    }
  };

  const toggleExpanded = (subId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(subId)) next.delete(subId); else next.add(subId);
      return next;
    });
  };

  const bestDoneLabel = () => {
    // prefer a status that looks like done/complete/closed
    const labels = statuses.map(s => (s.status || s.name || '').toString());
    const found = labels.find(l => /done|complete|closed/i.test(l));
    return found || 'done';
  };

  const markSubtaskCompleted = async (sub) => {
    if (!user || updatingSubId) return;
    try {
      setUpdatingSubId(sub.id);
      const statusValue = bestDoneLabel();
      await api.put(`/api/tasks/${sub.id}`, { status: statusValue });
      // Update local state
      setSubtasks(prev => prev.map(t => t.id === sub.id ? { ...t, status: statusValue } : t));
      setSuccess('Subtask marked completed');
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      setError(e?.message || 'Failed to update subtask');
    } finally {
      setUpdatingSubId(null);
    }
  };

  const nothingChanged = () => {
    if (!task) return true;
    const curName = task.name || '';
    const curDesc = task.description || '';
    const curStatus = typeof task.status === 'string' ? task.status : (task.status?.status || task.status?.name || '');
    const curAssignees = Array.isArray(task.assignees) ? task.assignees.map(a => a.id).filter(Boolean).sort() : [];
    const newAssignees = [...editAssignees].sort();
    return (
      curName === editName &&
      curDesc === editDescription &&
      (curStatus || '') === (editStatus || '') &&
      JSON.stringify(curAssignees) === JSON.stringify(newAssignees)
    );
  };

  const handleSave = async () => {
    if (!user || !task || saving || nothingChanged()) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      const body = {};
      if ((task.name || '') !== editName) body.name = editName;
      if ((task.description || '') !== editDescription) body.description = editDescription;
      const curStatus = typeof task.status === 'string' ? task.status : (task.status?.status || task.status?.name || '');
      if ((curStatus || '') !== (editStatus || '')) body.status = editStatus;
      const curAssignees = Array.isArray(task.assignees) ? task.assignees.map(a => a.id).filter(Boolean).sort() : [];
      const newAssignees = [...editAssignees].sort();
      if (JSON.stringify(curAssignees) !== JSON.stringify(newAssignees)) body.assignees = newAssignees.map(Number);

      if (Object.keys(body).length === 0) { setSaving(false); return; }
      const res = await api.put(`/api/tasks/${task.id}`, body);
      const updated = await res.json();
      // Merge into current task
      const newTask = { ...task };
      if (body.name) newTask.name = body.name;
      if (body.description) newTask.description = body.description;
      if (body.status) newTask.status = body.status;
      if (body.assignees) newTask.assignees = body.assignees.map(id => ({ id, username: (members.find(m => m.id === id)?.username) || (members.find(m => m.id === id)?.email) || id }));
      setTask(newTask);
      setSuccess('Task updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e?.message || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="container mt-3">
      <div className="d-flex justify-content-center py-5">
  <img src="/assets/loading.gif" alt="Loading…" style={{ height: 192 }} />
      </div>
    </div>
  );
  if (error) return (
    <div className="container mt-3">
      <div className="alert alert-warning">{error}</div>
      <div className="mb-3">If you want to create subtasks from GitHub issues, please connect ClickUp.</div>
      <a className="btn btn-primary" href="/auth/clickup">Connect ClickUp</a>
    </div>
  );

  return (
    <motion.div className="container mt-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}>
      {success && (
        <div className="alert alert-success">{success}</div>
      )}
      <div className="row">
        <div className="col-md-7">
          <div className="card p-3 mb-3">
            <h4>{task.name}</h4>
            <div className="small text-muted mb-2">Status: {task.status?.status || task.status || '—'}</div>
            <div className="mb-3"><pre style={{ whiteSpace: 'pre-wrap' }}>{task.description || '—'}</pre></div>
          </div>

          {/* Subtasks list */}
          <div className="card p-3 mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Subtasks</h5>
              <span className="badge bg-secondary">{subtasks.length}</span>
            </div>
            <div className="mt-3">
              {subtasks.length === 0 ? (
                <div className="text-muted">No subtasks.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {subtasks.map(sub => {
                    const statusLabel = typeof sub.status === 'string' ? sub.status : (sub.status?.status || sub.status?.name || '');
                    const isOpen = expanded.has(sub.id);
                    return (
                      <div key={sub.id} className="card">
                        <div className="card-body py-2 d-flex justify-content-between align-items-center">
                          <div className="text-truncate" title={sub.name}>
                            <strong>{sub.name}</strong>
                            <span className="ms-2 small text-muted">{statusLabel || '—'}</span>
                          </div>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleExpanded(sub.id)} aria-expanded={isOpen} aria-controls={`sub-${sub.id}`}>
                            {isOpen ? '▾' : '▸'}
                          </button>
                        </div>
                        {isOpen && (
                          <div id={`sub-${sub.id}`} className="card-body pt-0 pb-3">
                            <div className="d-flex gap-2">
                              <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/task/${sub.id}`, { state: { task: sub } })}>Open Subtask</button>
                              <button className="btn btn-sm btn-success" onClick={() => markSubtaskCompleted(sub)} disabled={updatingSubId === sub.id}>
                                {updatingSubId === sub.id ? <><img src="/assets/loading.gif" alt="Loading…" style={{ height: 64 }} className="me-2" />Marking…</> : 'Mark completed'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-5">
          {/* Edit controls */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Edit Task</h5>
                <div>
                  <button className="btn btn-sm btn-success me-2" onClick={handleSave} disabled={!user || saving || nothingChanged()}>
                    {saving ? <><img src="/assets/loading.gif" alt="Loading…" style={{ height: 64 }} className="me-2" />Saving…</> : 'Save Changes'}
                  </button>
                </div>
              </div>
              {!user && (
                <div className="alert alert-warning mb-2">Connect your ClickUp account to edit this task.</div>
              )}
              {metaLoading ? (
                <div className="d-flex justify-content-center py-3">
                  <img src="/assets/loading.gif" alt="Loading…" style={{ height: 128 }} />
                </div>
              ) : (
                <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
                  <div className="mb-3">
                    <label className="form-label">Title</label>
                    <input type="text" className="form-control" value={editName} onChange={e => setEditName(e.target.value)} disabled={!user} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows="5" value={editDescription} onChange={e => setEditDescription(e.target.value)} disabled={!user} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editStatus || ''} onChange={e => setEditStatus(e.target.value)} disabled={!user}>
                      <option value="">(no change)</option>
                      {statuses.map(s => {
                        const label = (s.status || s.name || '').toString();
                        return <option key={label} value={label}>{label}</option>;
                      })}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Assignees</label>
                    <select multiple className="form-select" value={editAssignees.map(String)} onChange={e => {
                      const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                      setEditAssignees(opts);
                    }} disabled={!user}>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.username || m.email || m.id}</option>
                      ))}
                    </select>
                    <div className="form-text">Hold Ctrl/Cmd to select multiple assignees.</div>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Removed old per-repo GitHub issues panel; consolidated into the centered section below */}
        </div>
      </div>

      {/* GitHub Stats section (centered, below existing content) */}
      <div className="row  mt-4">
        <div className="col-12 col-xl-10">
          <div className="mb-3">
    
              <h4 className="text-center mb-3">GitHub</h4>
              {repos.length === 0 ? (
                <div className="text-center text-muted">No GitHub repo links found in description.</div>
              ) : githubStatsLoading ? (
                <div className="d-flex justify-content-center py-4">
                  <img src="/assets/loading.gif" alt="Loading…" style={{ height: 160 }} />
                </div>
              ) : (
                repos.map((r) => {
                  const stats = githubStats[r];
                  const err = stats && stats.error;
                  const connectHref = (() => {
                    const t = getToken();
                    return t ? `/auth/github?carry=${encodeURIComponent(t)}` : '/auth/github';
                  })();
                  return (
                    <div key={r} className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>{r}</strong>
                        <a className="btn btn-sm btn-outline-primary" href={`https://github.com/${r}`} target="_blank" rel="noreferrer">Open on GitHub</a>
                      </div>
                      {err ? (
                        <div className="alert alert-warning">
                          {ghTokenMissing ? (
                            <>
                              GitHub connection required to view stats. <a href={connectHref} className="alert-link">Connect GitHub</a>
                            </>
                          ) : (
                            <>Failed to load stats: {String(err)}</>
                          )}
                        </div>
                      ) : stats ? (
                        <>
                          <StatsCards stats={stats} />
                          <div className="row g-3">
                            <div className="col-12 col-lg-8">
                              <div className="card mb-3"><div className="card-body">
                                <h5 className="card-title">Commit history</h5>
                                <CommitsChart data={stats.commitHistory || []} />
                              </div></div>
                            </div>
                            <div className="col-12 col-lg-4">
                              <div className="card mb-3"><div className="card-body">
                                <h5 className="card-title">Top contributors</h5>
                                <ContributorsList contributors={stats.contributors || []} />
                              </div></div>
                            </div>
                          </div>
                          {Array.isArray(stats.deployments) && stats.deployments.length > 0 && (
                            <div className="card mb-3"><div className="card-body">
                              <h5 className="card-title">Recent deployments</h5>
                              <div className="table-responsive">
                                <table className="table table-sm align-middle">
                                  <thead>
                                    <tr>
                                      <th>Environment</th>
                                      <th>Ref</th>
                                      <th>Status</th>
                                      <th>Created</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {stats.deployments.slice(0,5).map((d) => {
                                      const st = d.latest_status;
                                      const state = (st?.state || '').toLowerCase();
                                      const badge = state === 'success' ? 'success' : state === 'failure' ? 'danger' : state === 'in_progress' ? 'info' : state === 'queued' ? 'secondary' : 'warning';
                                      return (
                                        <tr key={d.id}>
                                          <td><span className="badge text-bg-dark me-2">{d.environment || '—'}</span></td>
                                          <td><code>{d.ref || d.sha?.slice(0,7) || '—'}</code></td>
                                          <td>{st ? <span className={`badge text-bg-${badge}`}>{st.state}</span> : <span className="badge text-bg-secondary">unknown</span>}</td>
                                          <td className="text-nowrap">{new Date(d.created_at).toLocaleString()}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div></div>
                          )}
                        </>
                      ) : (
                        <div className="text-muted">No stats available.</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
    </motion.div>
  );
}
