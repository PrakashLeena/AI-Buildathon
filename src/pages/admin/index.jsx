import Head from 'next/head';
import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { getAdminFromRequest } from '../../lib/adminAuth.js';
import { isSupabaseConfigured, supabaseAdmin, supabaseConfigError } from '../../lib/supabaseAdmin.js';

export async function getServerSideProps({ req }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }

  let registrations = [];
  let submissions = [];
  let loadError = null;

  if (isSupabaseConfigured) {
    try {
      const [regRes, subRes] = await Promise.all([
        supabaseAdmin.from('registrations').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('submissions').select('*').order('created_at', { ascending: false })
      ]);

      if (regRes.error) {
        console.error('[Admin] Registrations load error:', regRes.error.message);
        loadError = regRes.error.message;
      } else {
        registrations = regRes.data || [];
      }

      if (subRes.error) {
        console.error('[Admin] Submissions load error:', subRes.error.message);
        if (!loadError) loadError = subRes.error.message;
      } else {
        submissions = subRes.data || [];
      }
    } catch (err) {
      loadError = err.message || 'Database error occurred.';
    }
  } else {
    loadError = supabaseConfigError;
  }

  return {
    props: {
      adminEmail: admin.email,
      initialRegistrations: registrations,
      initialSubmissions: submissions,
      loadError
    }
  };
}

function StatCard({ label, value, accent, subtitle }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/20">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent || 'text-white'}`}>{value}</p>
      {subtitle && <p className="text-slate-500 text-xs mt-1.5">{subtitle}</p>}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Colombo'
    });
  } catch {
    return iso;
  }
}

export default function AdminDashboard({ adminEmail, initialRegistrations, initialSubmissions, loadError }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('registrations'); // 'registrations' | 'submissions'

  // Registrations state
  const [registrations, setRegistrations] = useState(initialRegistrations || []);
  const [regQuery, setRegQuery] = useState('');
  const [regSortKey, setRegSortKey] = useState('created_at');
  const [regSortDir, setRegSortDir] = useState('desc');
  const [expandedRegId, setExpandedRegId] = useState(null);

  // Submissions state
  const [submissions, setSubmissions] = useState(initialSubmissions || []);
  const [subQuery, setSubQuery] = useState('');
  const [subSortKey, setSubSortKey] = useState('created_at');
  const [subSortDir, setSubSortDir] = useState('desc');
  const [expandedSubId, setExpandedSubId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Common state
  const [error, setError] = useState(loadError || '');
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Stats for Registrations
  const regStats = useMemo(() => {
    const totalTeams = registrations.length;
    const totalParticipants = registrations.reduce((sum, r) => sum + (r.team_size || 1), 0);
    const facultySet = new Set(registrations.map((r) => r.faculty).filter(Boolean));
    const bySize = { 1: 0, 2: 0, 3: 0 };
    registrations.forEach((r) => {
      if (bySize[r.team_size] !== undefined) bySize[r.team_size] += 1;
    });
    return { totalTeams, totalParticipants, facultyCount: facultySet.size, bySize };
  }, [registrations]);

  // Stats for Submissions
  const subStats = useMemo(() => {
    const totalSubmissions = submissions.length;
    const uniqueTeams = new Set(submissions.map((s) => (s.team_name || '').trim().toLowerCase())).size;
    const latestSubmission = submissions.length > 0 ? formatDate(submissions[0]?.created_at) : 'None';
    const totalWords = submissions.reduce((sum, s) => sum + (s.project_brief ? s.project_brief.trim().split(/\s+/).length : 0), 0);
    const avgWords = totalSubmissions > 0 ? Math.round(totalWords / totalSubmissions) : 0;
    return { totalSubmissions, uniqueTeams, latestSubmission, avgWords };
  }, [submissions]);

  // Filtered & sorted registrations
  const filteredRegistrations = useMemo(() => {
    const q = regQuery.trim().toLowerCase();
    let rows = registrations;

    if (q) {
      rows = rows.filter((r) => {
        const haystack = [
          r.team_name,
          r.full_name,
          r.student_email,
          r.student_id,
          r.faculty,
          r.department,
          ...(Array.isArray(r.members) ? r.members.flatMap((m) => [m?.name, m?.student_id, m?.email]) : [])
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return [...rows].sort((a, b) => {
      const av = a[regSortKey] ?? '';
      const bv = b[regSortKey] ?? '';
      if (av < bv) return regSortDir === 'asc' ? -1 : 1;
      if (av > bv) return regSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [registrations, regQuery, regSortKey, regSortDir]);

  // Filtered & sorted submissions
  const filteredSubmissions = useMemo(() => {
    const q = subQuery.trim().toLowerCase();
    let rows = submissions;

    if (q) {
      rows = rows.filter((s) => {
        const haystack = [
          s.team_name,
          s.participant_email,
          s.whatsapp_number,
          s.project_brief
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return [...rows].sort((a, b) => {
      const av = a[subSortKey] ?? '';
      const bv = b[subSortKey] ?? '';
      if (av < bv) return subSortDir === 'asc' ? -1 : 1;
      if (av > bv) return subSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [submissions, subQuery, subSortKey, subSortDir]);

  const handleRegSort = (key) => {
    if (regSortKey === key) {
      setRegSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setRegSortKey(key);
      setRegSortDir('asc');
    }
  };

  const handleSubSort = (key) => {
    if (subSortKey === key) {
      setSubSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSubSortKey(key);
      setSubSortDir('asc');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      if (activeTab === 'registrations') {
        const res = await fetch('/api/admin/registrations', { credentials: 'same-origin' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            router.replace('/admin/login');
            return;
          }
          throw new Error(body.error || 'Failed to refresh registrations.');
        }
        setRegistrations(body.registrations || []);
      } else {
        const res = await fetch('/api/admin/submissions', { credentials: 'same-origin' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            router.replace('/admin/login');
            return;
          }
          throw new Error(body.error || 'Failed to refresh submissions.');
        }
        setSubmissions(body.submissions || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to refresh.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopyBrief = (text, id) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text || '').then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      router.replace('/admin/login');
    }
  };

  const regSortIndicator = (key) => (regSortKey === key ? (regSortDir === 'asc' ? ' ▲' : ' ▼') : '');
  const subSortIndicator = (key) => (subSortKey === key ? (subSortDir === 'asc' ? ' ▲' : ' ▼') : '');

  return (
    <>
      <Head>
        <title>Admin Dashboard — AI Buildathon</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="admin-root min-h-screen bg-slate-950 text-slate-100 pb-16">
        {/* Top Navigation */}
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-orange to-orange-400 flex items-center justify-center font-black text-white text-sm shadow-md shadow-brand-orange/30">
                AI
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">AI Buildathon — Admin Portal</h1>
                <p className="text-slate-400 text-xs">Event Management & Project Submissions</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
              <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-full px-3 py-1 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="truncate max-w-[200px]">{adminEmail}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-60 whitespace-nowrap"
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 border-t border-slate-800/80 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('registrations')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${
                activeTab === 'registrations'
                  ? 'border-brand-orange text-brand-orange bg-brand-orange/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Team Registrations</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'registrations' ? 'bg-brand-orange text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {registrations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('submissions')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${
                activeTab === 'submissions'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Project Submissions</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'submissions' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {submissions.length}
              </span>
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-3 flex items-center justify-between gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-300 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: REGISTRATIONS VIEW */}
          {/* ========================================================================= */}
          {activeTab === 'registrations' && (
            <div>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Teams" value={regStats.totalTeams} accent="text-brand-orange" subtitle="Registered teams" />
                <StatCard label="Total Participants" value={regStats.totalParticipants} subtitle="Across all teams" />
                <StatCard label="Faculties Represented" value={regStats.facultyCount} subtitle="Distinct faculties" />
                <StatCard label="Solo / Duo / Trio" value={`${regStats.bySize[1]} / ${regStats.bySize[2]} / ${regStats.bySize[3]}`} subtitle="Team size breakdown" />
              </div>

              {/* Controls and Search */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search teams by name, lead builder, email, student ID, faculty…"
                    value={regQuery}
                    onChange={(e) => setRegQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-orange transition"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-700 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition disabled:opacity-60 whitespace-nowrap"
                  >
                    <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </button>
                  <a
                    href="/api/admin/export?type=people"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-orange text-white text-sm font-semibold hover:brightness-110 transition shadow-lg shadow-brand-orange/20 whitespace-nowrap"
                    title="Download CSV of all registered individuals (leads and team members) with their names and emails"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Export All People CSV
                  </a>
                  <a
                    href="/api/admin/export?type=teams"
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 text-sm font-semibold hover:bg-slate-700 hover:text-white transition whitespace-nowrap"
                    title="Download CSV of team registrations with members in separate columns"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Export Teams CSV
                  </a>
                </div>
              </div>

              <p className="text-slate-500 text-xs mb-3">
                Showing {filteredRegistrations.length} of {registrations.length} registered team{registrations.length === 1 ? '' : 's'}
              </p>

              {/* Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/40" style={{ minHeight: '420px' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed min-w-[700px]">
                    <thead>
                      <tr className="border-b-2 border-slate-700 text-left text-slate-400 text-xs uppercase tracking-widest bg-slate-800/60">
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[20%]" onClick={() => handleRegSort('team_name')}>
                          Team{regSortIndicator('team_name')}
                        </th>
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[24%]" onClick={() => handleRegSort('full_name')}>
                          Lead Builder{regSortIndicator('full_name')}
                        </th>
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[20%]" onClick={() => handleRegSort('faculty')}>
                          Faculty{regSortIndicator('faculty')}
                        </th>
                        <th className="px-3 py-3 font-bold w-[8%] text-center">Size</th>
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[16%]" onClick={() => handleRegSort('created_at')}>
                          Registered{regSortIndicator('created_at')}
                        </th>
                        <th className="px-3 py-3 font-bold w-[12%] text-center">Members</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-500 text-base">
                            No registrations {regQuery ? 'match your search' : 'found'}.
                          </td>
                        </tr>
                      )}
                      {filteredRegistrations.map((r) => (
                        <Fragment key={r.id}>
                          <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors duration-150">
                            <td className="px-3 py-3 font-bold text-white text-sm break-words">{r.team_name}</td>
                            <td className="px-3 py-3">
                              <p className="text-slate-100 font-semibold text-sm">{r.full_name}</p>
                              <a href={`mailto:${r.student_email}`} className="text-brand-orange hover:underline text-xs mt-0.5 break-all block">
                                {r.student_email}
                              </a>
                              <p className="text-slate-500 text-xs mt-0.5">ID: {r.student_id}</p>
                            </td>
                            <td className="px-3 py-3 text-slate-200 text-sm break-words">{r.faculty}</td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-white font-bold text-xs">
                                {r.team_size}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-400 text-xs">{formatDate(r.created_at)}</td>
                            <td className="px-3 py-3 text-center">
                              {r.team_size > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => setExpandedRegId(expandedRegId === r.id ? null : r.id)}
                                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all duration-150 shadow-sm w-full justify-center ${
                                    expandedRegId === r.id
                                      ? 'bg-cyan-500/30 text-cyan-100 border-cyan-400 shadow-cyan-500/20'
                                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25 hover:border-cyan-400 hover:text-cyan-100'
                                  }`}
                                >
                                  <span>{expandedRegId === r.id ? '▲ Hide' : `▼ (${r.team_size - 1})`}</span>
                                </button>
                              ) : (
                                <span className="text-slate-600 text-xs">Solo</span>
                              )}
                            </td>
                          </tr>
                          {expandedRegId === r.id && (
                            <tr className="bg-slate-950/60">
                              <td colSpan={6} className="px-6 py-5">
                                <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-semibold">
                                  Department: <span className="text-slate-300">{r.department}</span> · Year of Study:{' '}
                                  <span className="text-slate-300">{r.year_of_study}</span>
                                </p>
                                <div className="grid sm:grid-cols-2 gap-3">
                                  {(r.members || []).map((m, idx) => (
                                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <p className="text-white font-semibold text-sm">{m.name}</p>
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap bg-slate-800 px-1.5 py-0.5 rounded">
                                          Member {idx + 2}
                                        </span>
                                      </div>
                                      {m.email && (
                                        <a href={`mailto:${m.email}`} className="text-slate-400 hover:text-brand-orange text-xs block">
                                          {m.email}
                                        </a>
                                      )}
                                      <p className="text-slate-400 text-xs">Student ID: {m.student_id}</p>
                                      {(m.faculty || m.department) && (
                                        <p className="text-slate-400 text-xs mt-1">
                                          {[m.faculty, m.department].filter(Boolean).join(' · ')}
                                        </p>
                                      )}
                                      {m.year_of_study && (
                                        <p className="text-slate-400 text-xs">Year: {m.year_of_study}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PROJECT SUBMISSIONS VIEW */}
          {/* ========================================================================= */}
          {activeTab === 'submissions' && (
            <div>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Submissions" value={subStats.totalSubmissions} accent="text-cyan-400" subtitle="Briefs received" />
                <StatCard label="Teams Submitted" value={subStats.uniqueTeams} subtitle="Unique participating teams" />
                <StatCard label="Avg Brief Length" value={`${subStats.avgWords} words`} subtitle="Per project brief" />
                <StatCard label="Latest Submission" value={subStats.latestSubmission} subtitle="Most recent brief update" />
              </div>

              {/* Search & Export Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search project submissions by team, submitter email, WhatsApp, brief keywords…"
                    value={subQuery}
                    onChange={(e) => setSubQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-700 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition disabled:opacity-60 whitespace-nowrap"
                  >
                    <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </button>

                  {/* Export All Submissions TXT */}
                  <a
                    href="/api/admin/export?type=submissions&format=txt"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20 whitespace-nowrap"
                    title="Download a clean text document (.txt) compiling all team project briefs for offline review or printing"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download All Briefs (.txt)
                  </a>

                  {/* Export Submissions CSV */}
                  <a
                    href="/api/admin/export?type=submissions&format=csv"
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 text-sm font-semibold hover:bg-slate-700 hover:text-white transition whitespace-nowrap"
                    title="Download CSV spreadsheet of all project submissions"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Export CSV
                  </a>
                </div>
              </div>

              <p className="text-slate-500 text-xs mb-3">
                Showing {filteredSubmissions.length} of {submissions.length} project submission{submissions.length === 1 ? '' : 's'}
              </p>

              {/* Submissions Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/40" style={{ minHeight: '420px' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed min-w-[760px]">
                    <thead>
                      <tr className="border-b-2 border-slate-700 text-left text-slate-400 text-xs uppercase tracking-widest bg-slate-800/60">
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[18%]" onClick={() => handleSubSort('team_name')}>
                          Team{subSortIndicator('team_name')}
                        </th>
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[22%]" onClick={() => handleSubSort('participant_email')}>
                          Submitter Details{subSortIndicator('participant_email')}
                        </th>
                        <th className="px-3 py-3 font-bold w-[34%]">
                          Project Brief Overview
                        </th>
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[14%]" onClick={() => handleSubSort('created_at')}>
                          Submitted{subSortIndicator('created_at')}
                        </th>
                        <th className="px-3 py-3 font-bold w-[12%] text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubmissions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center text-slate-500 text-base">
                            No project submissions {subQuery ? 'match your search' : 'received yet'}.
                          </td>
                        </tr>
                      )}
                      {filteredSubmissions.map((s) => {
                        const isExpanded = expandedSubId === s.id;
                        const briefLength = (s.project_brief || '').length;
                        const briefWords = (s.project_brief || '').trim().split(/\s+/).filter(Boolean).length;

                        return (
                          <Fragment key={s.id}>
                            <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors duration-150">
                              {/* Team Name */}
                              <td className="px-3 py-3 align-top">
                                <span className="font-bold text-white text-sm break-words block">{s.team_name}</span>
                                <span className="text-[10px] font-mono text-slate-500 block mt-1 truncate" title={s.id}>
                                  ID: {s.id.slice(0, 8)}…
                                </span>
                              </td>

                              {/* Submitter Details */}
                              <td className="px-3 py-3 align-top">
                                <a
                                  href={`mailto:${s.participant_email}`}
                                  className="text-cyan-400 hover:underline font-medium text-xs break-all block"
                                >
                                  {s.participant_email}
                                </a>
                                <a
                                  href={`https://wa.me/${(s.whatsapp_number || '').replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-emerald-400 hover:underline text-xs mt-1"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  {s.whatsapp_number}
                                </a>
                              </td>

                              {/* Brief Overview Preview */}
                              <td className="px-3 py-3 align-top">
                                <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">
                                  {s.project_brief || '(Empty brief)'}
                                </p>
                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                                  <span>{briefWords} words ({briefLength} chars)</span>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedSubId(isExpanded ? null : s.id)}
                                    className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
                                  >
                                    {isExpanded ? 'Collapse' : 'Read Full Brief →'}
                                  </button>
                                </div>
                              </td>

                              {/* Timestamps */}
                              <td className="px-3 py-3 align-top text-slate-400 text-xs">
                                <div>{formatDate(s.created_at)}</div>
                                {s.updated_at && s.updated_at !== s.created_at && (
                                  <div className="text-[10px] text-amber-400/80 mt-1">
                                    Updated: {formatDate(s.updated_at)}
                                  </div>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-3 py-3 align-top text-center">
                                <div className="flex flex-col gap-1.5 items-center">
                                  <a
                                    href={`/api/admin/export?type=submissions&format=txt&id=${s.id}`}
                                    className="inline-flex items-center justify-center gap-1 w-full text-[11px] font-semibold px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
                                    title="Download this team's project brief as a .txt file"
                                  >
                                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyBrief(s.project_brief, s.id)}
                                    className="inline-flex items-center justify-center gap-1 w-full text-[11px] font-medium px-2 py-1 rounded border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition"
                                  >
                                    {copiedId === s.id ? (
                                      <span className="text-emerald-400 font-semibold">✓ Copied!</span>
                                    ) : (
                                      'Copy Brief'
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Full Brief Expand View */}
                            {isExpanded && (
                              <tr className="bg-slate-950/80 border-b border-cyan-900/30">
                                <td colSpan={5} className="px-6 py-5">
                                  <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-5 shadow-xl">
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs uppercase tracking-wider font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded">
                                            Project Brief
                                          </span>
                                          <h3 className="text-base font-bold text-white">{s.team_name}</h3>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
                                          Submitted by <span className="text-slate-200">{s.participant_email}</span> · WhatsApp:{' '}
                                          <span className="text-slate-200">{s.whatsapp_number}</span>
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleCopyBrief(s.project_brief, s.id)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                                        >
                                          {copiedId === s.id ? '✓ Copied to clipboard' : 'Copy Full Text'}
                                        </button>
                                        <a
                                          href={`/api/admin/export?type=submissions&format=txt&id=${s.id}`}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition"
                                        >
                                          Download .txt
                                        </a>
                                      </div>
                                    </div>

                                    {/* Brief Text Content */}
                                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-sans select-text max-h-96 overflow-y-auto">
                                      {s.project_brief}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
