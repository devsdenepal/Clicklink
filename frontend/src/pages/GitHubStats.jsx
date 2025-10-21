import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../utils/auth';
import RepoSelect from '../components/github/RepoSelect';
import StatsCards from '../components/github/StatsCards';
import CommitsChart from '../components/github/CommitsChart';
import ContributorsList from '../components/github/ContributorsList';
import { getToken } from '../utils/auth';

export default function GitHubStats() {
  const [repos, setRepos] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadRepos = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/api/github/repos');
      const data = await res.json();
      setRepos(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load GitHub repositories');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadRepos(); }, []);

  const handleSelect = async (fullName) => {
    setSelected(fullName);
    if (!fullName) { setStats(null); return; }
    // Only proceed if the input exactly matches a repo full_name
    const match = repos.find(r => (r.full_name || '').toLowerCase() === fullName.toLowerCase());
    if (!match) { setStats(null); return; }
    setLoadingStats(true); setError(null);
    try {
      const [owner, repo] = fullName.split('/');
      const res = await api.get(`/api/github/repo/${owner}/${repo}/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError(e?.message || 'Failed to load repo stats');
    } finally { setLoadingStats(false); }
  };

  const repoOptions = useMemo(() => repos.map(r => ({ value: r.full_name, label: r.full_name })), [repos]);

  const connectHref = useMemo(() => {
    const t = getToken();
    return t ? `/auth/github?carry=${encodeURIComponent(t)}` : '/auth/github';
  }, []);

  return (
    <motion.div className="container-lg py-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">GitHub Stats</h3>
        <a className="btn btn-outline-light btn-sm" href={connectHref}>{repos.length ? 'Re-auth GitHub' : 'Connect GitHub'}</a>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading…</span></div>
        </div>
      ) : (
        <>
          <RepoSelect options={repoOptions} value={selected} onChange={handleSelect} />

          {!selected ? (
            <div className="text-muted mt-3">Select a repository to see stats.</div>
          ) : loadingStats ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading…</span></div>
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
            </>
          ) : (
            <div className="text-muted mt-3">No stats available.</div>
          )}
        </>
      )}
    </motion.div>
  );
}
