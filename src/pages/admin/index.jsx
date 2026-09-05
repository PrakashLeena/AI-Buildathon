import Head from 'next/head';
import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { getAdminFromRequest } from '../../lib/adminAuth.js';
import { isSupabaseConfigured, supabaseAdmin, supabaseConfigError } from '../../lib/supabaseAdmin.js';
import EditRegistrationModal from '../../components/admin/EditRegistrationModal.jsx';

export async function getServerSideProps({ req }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }

  let registrations = [];
  let finalSubmissions = [];
  let briefSubmissions = [];
  let loadError = null;

  if (isSupabaseConfigured) {
    try {
      const [regRes, finalRes, briefRes] = await Promise.all([
        supabaseAdmin.from('registrations').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('project_submissions').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('submissions').select('*').order('created_at', { ascending: false })
      ]);

      if (regRes.error) {
        console.error('[Admin] Registrations load error:', regRes.error.message);
        loadError = regRes.error.message;
      } else {
        registrations = regRes.data || [];
      }

      if (finalRes.error) {
        console.error('[Admin] Final submissions load error:', finalRes.error.message);
        if (!loadError) loadError = finalRes.error.message;
      }

      if (briefRes.error) {
        console.error('[Admin] Brief submissions load error:', briefRes.error.message);
      }

      const regMap = new Map(registrations.map((r) => [r.id, r]));
      finalSubmissions = (finalRes.data || []).map((ps) => {
        const reg = regMap.get(ps.registration_id);
        return {
          ...ps,
          team_name: reg?.team_name || 'Team',
          team_lead: reg?.full_name || '',
          student_id: reg?.student_id || '',
          team_size: reg?.team_size || 1
        };
      });

      briefSubmissions = briefRes.data || [];
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
      initialFinalSubmissions: finalSubmissions,
      initialBriefSubmissions: briefSubmissions,
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

export default function AdminDashboard({
  adminEmail,
  initialRegistrations = [],
  initialFinalSubmissions = [],
  initialBriefSubmissions = [],
  loadError
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('final_submissions'); // 'final_submissions' | 'registrations' | 'brief_submissions'

  // Final Project Submissions State
  const [finalSubmissions, setFinalSubmissions] = useState(initialFinalSubmissions || []);
  const [finalQuery, setFinalQuery] = useState('');
  const [finalSortKey, setFinalSortKey] = useState('created_at');
  const [finalSortDir, setFinalSortDir] = useState('desc');
  const [expandedFinalId, setExpandedFinalId] = useState(null);

  // Registrations State
  const [registrations, setRegistrations] = useState(initialRegistrations || []);
  const [regQuery, setRegQuery] = useState('');
  const [regSortKey, setRegSortKey] = useState('created_at');
  const [regSortDir, setRegSortDir] = useState('desc');
  const [expandedRegId, setExpandedRegId] = useState(null);
  const [editingReg, setEditingReg] = useState(null);

  // Legacy Brief Submissions State
  const [briefSubmissions, setBriefSubmissions] = useState(initialBriefSubmissions || []);
  const [briefQuery, setBriefQuery] = useState('');
  const [briefSortKey, setBriefSortKey] = useState('created_at');
  const [briefSortDir, setBriefSortDir] = useState('desc');
  const [expandedBriefId, setExpandedBriefId] = useState(null);

  // Common State
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(loadError || '');
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Stats for Final Project Submissions
  const finalStats = useMemo(() => {
    const total = finalSubmissions.length;
    const withDemoVideo = finalSubmissions.filter((s) => Boolean(s.demo_video && s.demo_video.trim())).length;
    const withSourceRepo = finalSubmissions.filter((s) => Boolean(s.source_repo && s.source_repo.trim())).length;
    const withPrototype = finalSubmissions.filter((s) => Boolean(s.hosted_prototype && s.hosted_prototype.trim())).length;
    const latest = total > 0 ? formatDate(finalSubmissions[0]?.created_at) : 'None';
    return { total, withDemoVideo, withSourceRepo, withPrototype, latest };
  }, [finalSubmissions]);

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

  // Duplicate team names detector
  const duplicateTeamNames = useMemo(() => {
    const counts = new Map();
    registrations.forEach((r) => {
      const key = (r.team_name || '').trim().toLowerCase();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  }, [registrations]);

  const handleRegistrationSaved = (updated) => {
    setRegistrations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditingReg(null);
  };

  // Stats for Legacy Briefs
  const briefStats = useMemo(() => {
    const total = briefSubmissions.length;
    const uniqueTeams = new Set(briefSubmissions.map((s) => (s.team_name || '').trim().toLowerCase())).size;
    const latest = total > 0 ? formatDate(briefSubmissions[0]?.created_at) : 'None';
    const totalWords = briefSubmissions.reduce(
      (sum, s) => sum + (s.project_brief ? s.project_brief.trim().split(/\s+/).length : 0),
      0
    );
    const avgWords = total > 0 ? Math.round(totalWords / total) : 0;
    return { total, uniqueTeams, latest, avgWords };
  }, [briefSubmissions]);

  // Filtered & Sorted Final Submissions
  const filteredFinalSubmissions = useMemo(() => {
    const q = finalQuery.trim().toLowerCase();
    let rows = finalSubmissions;

    if (q) {
      rows = rows.filter((s) => {
        const haystack = [
          s.team_name,
          s.team_lead,
          s.participant_email,
          s.demo_video,
          s.source_repo,
          s.hosted_prototype,
          s.problem,
          s.solution,
          s.ai_usage,
          s.technical_brief,
          s.impact,
          s.roadmap,
          s.ai_usage_statement
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return [...rows].sort((a, b) => {
      const av = a[finalSortKey] ?? '';
      const bv = b[finalSortKey] ?? '';
      if (av < bv) return finalSortDir === 'asc' ? -1 : 1;
      if (av > bv) return finalSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [finalSubmissions, finalQuery, finalSortKey, finalSortDir]);

  // Filtered & Sorted Registrations
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

  // Filtered & Sorted Brief Submissions
  const filteredBriefSubmissions = useMemo(() => {
    const q = briefQuery.trim().toLowerCase();
    let rows = briefSubmissions;

    if (q) {
      rows = rows.filter((s) => {
        const haystack = [s.team_name, s.participant_email, s.whatsapp_number, s.project_brief]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return [...rows].sort((a, b) => {
      const av = a[briefSortKey] ?? '';
      const bv = b[briefSortKey] ?? '';
      if (av < bv) return briefSortDir === 'asc' ? -1 : 1;
      if (av > bv) return briefSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [briefSubmissions, briefQuery, briefSortKey, briefSortDir]);

  const handleFinalSort = (key) => {
    if (finalSortKey === key) {
      setFinalSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setFinalSortKey(key);
      setFinalSortDir('asc');
    }
  };

  const handleRegSort = (key) => {
    if (regSortKey === key) {
      setRegSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setRegSortKey(key);
      setRegSortDir('asc');
    }
  };

  const handleBriefSort = (key) => {
    if (briefSortKey === key) {
      setBriefSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setBriefSortKey(key);
      setBriefSortDir('asc');
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
          if (res.status === 401) return router.replace('/admin/login');
          throw new Error(body.error || 'Failed to refresh registrations.');
        }
        setRegistrations(body.registrations || []);
      } else {
        const res = await fetch('/api/admin/submissions', { credentials: 'same-origin' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) return router.replace('/admin/login');
          throw new Error(body.error || 'Failed to refresh submissions.');
        }
        setFinalSubmissions(body.projectSubmissions || []);
        setBriefSubmissions(body.briefSubmissions || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to refresh.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopy = (text, id) => {
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

  const sortIndicator = (currentKey, key, currentDir) =>
    currentKey === key ? (currentDir === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <>
      <Head>
        <title>Admin Dashboard — AI Buildathon</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="admin-root min-h-screen bg-slate-950 text-slate-100 pb-16">
        {/* Top Header */}
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 border-t border-slate-800/80 pt-2 overflow-x-auto">
            {/* Tab 1: Final Project Submissions */}
            <button
              type="button"
              onClick={() => setActiveTab('final_submissions')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'final_submissions'
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Final Project Submissions</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'final_submissions' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {finalSubmissions.length}
              </span>
            </button>

            {/* Tab 2: Team Registrations */}
            <button
              type="button"
              onClick={() => setActiveTab('registrations')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'registrations'
                  ? 'border-brand-orange text-brand-orange bg-brand-orange/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Team Registrations</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'registrations' ? 'bg-brand-orange text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {registrations.length}
              </span>
            </button>

            {/* Tab 3: Legacy Initial Briefs */}
            <button
              type="button"
              onClick={() => setActiveTab('brief_submissions')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'brief_submissions'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Initial Briefs</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'brief_submissions' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {briefSubmissions.length}
              </span>
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-3 flex items-center justify-between gap-3">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-300 font-bold">
                ✕
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: FINAL PROJECT SUBMISSIONS (Primary New Deliverables Portal) */}
          {/* ========================================================================= */}
          {activeTab === 'final_submissions' && (
            <div>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  label="Final Submissions"
                  value={finalStats.total}
                  accent="text-emerald-400"
                  subtitle="Complete project dossiers"
                />
                <StatCard
                  label="Video Demos"
                  value={finalStats.withDemoVideo}
                  accent="text-rose-400"
                  subtitle="Linked YouTube/video demos"
                />
                <StatCard
                  label="Source Repositories"
                  value={finalStats.withSourceRepo}
                  accent="text-indigo-400"
                  subtitle="Linked GitHub/GitLab repos"
                />
                <StatCard
                  label="Live Prototypes"
                  value={finalStats.withPrototype}
                  accent="text-amber-400"
                  subtitle="Hosted working applications"
                />
              </div>

              {/* Controls, Search & Exports */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search final projects by team, submitter email, video, repo, problem, tech stack, or roadmap…"
                    value={finalQuery}
                    onChange={(e) => setFinalQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 transition"
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

                  {/* Export All Final Dossiers TXT */}
                  <a
                    href="/api/admin/export?type=final&format=txt"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-slate-950 text-sm font-bold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                    title="Download complete text dossiers of all final submissions for evaluation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download All Dossiers (.txt)
                  </a>

                  {/* Export Final Submissions CSV */}
                  <a
                    href="/api/admin/export?type=final&format=csv"
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 text-sm font-semibold hover:bg-slate-700 hover:text-white transition whitespace-nowrap"
                    title="Download CSV spreadsheet of all final project submissions"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Export CSV
                  </a>
                </div>
              </div>

              <p className="text-slate-500 text-xs mb-3">
                Showing {filteredFinalSubmissions.length} of {finalSubmissions.length} final project submission{finalSubmissions.length === 1 ? '' : 's'}
              </p>

              {/* Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/40" style={{ minHeight: '420px' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed min-w-[880px]">
                    <thead>
                      <tr className="border-b-2 border-slate-700 text-left text-slate-400 text-xs uppercase tracking-widest bg-slate-800/60">
                        <th
                          className="px-3.5 py-3 cursor-pointer select-none font-bold w-[20%]"
                          onClick={() => handleFinalSort('team_name')}
                        >
                          Team & Lead{sortIndicator(finalSortKey, 'team_name', finalSortDir)}
                        </th>
                        <th
                          className="px-3.5 py-3 cursor-pointer select-none font-bold w-[21%]"
                          onClick={() => handleFinalSort('participant_email')}
                        >
                          Submitter Email{sortIndicator(finalSortKey, 'participant_email', finalSortDir)}
                        </th>
                        <th className="px-3.5 py-3 font-bold w-[25%]">
                          Deliverables & Links
                        </th>
                        <th
                          className="px-3.5 py-3 cursor-pointer select-none font-bold w-[16%]"
                          onClick={() => handleFinalSort('created_at')}
                        >
                          Submitted{sortIndicator(finalSortKey, 'created_at', finalSortDir)}
                        </th>
                        <th className="px-3.5 py-3 font-bold w-[18%] text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFinalSubmissions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center text-slate-500 text-base">
                            No final project submissions {finalQuery ? 'match your search' : 'received yet'}.
                          </td>
                        </tr>
                      )}
                      {filteredFinalSubmissions.map((s) => {
                        const isExpanded = expandedFinalId === s.id;

                        return (
                          <Fragment key={s.id}>
                            <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors duration-150">
                              {/* Team & Lead */}
                              <td className="px-3.5 py-3.5 align-top">
                                <span className="font-bold text-white text-sm break-words block">{s.team_name}</span>
                                {s.team_lead && (
                                  <span className="text-xs text-slate-400 block mt-0.5">Lead: {s.team_lead}</span>
                                )}
                                <span className="text-[10px] font-mono text-slate-500 block mt-1 truncate" title={s.id}>
                                  ID: {s.id.slice(0, 8)}…
                                </span>
                              </td>

                              {/* Submitter Email */}
                              <td className="px-3.5 py-3.5 align-top">
                                <a
                                  href={`mailto:${s.participant_email}`}
                                  className="text-emerald-400 hover:underline font-medium text-xs break-all block"
                                >
                                  {s.participant_email}
                                </a>
                                {s.student_id && (
                                  <span className="text-[11px] text-slate-500 block mt-1">
                                    Student ID: {s.student_id}
                                  </span>
                                )}
                              </td>

                              {/* Deliverables Quick Badges */}
                              <td className="px-3.5 py-3.5 align-top">
                                <div className="flex flex-col gap-1.5">
                                  {s.demo_video ? (
                                    <a
                                      href={s.demo_video}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded hover:bg-rose-500/20 transition truncate max-w-[240px]"
                                      title={s.demo_video}
                                    >
                                      <svg className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                      </svg>
                                      <span className="truncate">Demo Video</span>
                                      <span className="text-[10px] text-rose-400 font-mono">↗</span>
                                    </a>
                                  ) : (
                                    <span className="text-[11px] text-slate-600 italic">No video linked</span>
                                  )}

                                  {s.source_repo ? (
                                    <a
                                      href={s.source_repo}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded hover:bg-indigo-500/20 transition truncate max-w-[240px]"
                                      title={s.source_repo}
                                    >
                                      <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                      </svg>
                                      <span className="truncate">Source Code</span>
                                      <span className="text-[10px] text-indigo-400 font-mono">↗</span>
                                    </a>
                                  ) : (
                                    <span className="text-[11px] text-slate-600 italic">No repo linked</span>
                                  )}

                                  {s.hosted_prototype ? (
                                    <a
                                      href={s.hosted_prototype}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded hover:bg-amber-500/20 transition truncate max-w-[240px]"
                                      title={s.hosted_prototype}
                                    >
                                      <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                      <span className="truncate">Live Prototype</span>
                                      <span className="text-[10px] text-amber-400 font-mono">↗</span>
                                    </a>
                                  ) : (
                                    <span className="text-[11px] text-slate-600 italic">No live link</span>
                                  )}
                                </div>
                              </td>

                              {/* Timestamps */}
                              <td className="px-3.5 py-3.5 align-top text-slate-400 text-xs">
                                <div>{formatDate(s.created_at)}</div>
                                {s.updated_at && s.updated_at !== s.created_at && (
                                  <div className="text-[10px] text-emerald-400/80 mt-1">
                                    Updated: {formatDate(s.updated_at)}
                                  </div>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-3.5 py-3.5 align-top text-center">
                                <div className="flex flex-col gap-1.5 items-center">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedFinalId(isExpanded ? null : s.id)}
                                    className={`inline-flex items-center justify-center gap-1 w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition shadow-sm ${
                                      isExpanded
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                    }`}
                                  >
                                    {isExpanded ? '▲ Close Dossier' : '▼ View Dossier (7)'}
                                  </button>
                                  <a
                                    href={`/api/admin/export?type=final&format=txt&id=${s.id}`}
                                    className="inline-flex items-center justify-center gap-1 w-full text-[11px] font-semibold px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
                                    title="Download complete project dossier as a .txt file"
                                  >
                                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download .txt
                                  </a>
                                </div>
                              </td>
                            </tr>

                            {/* Full Project Dossier (7 Sections) Accordion */}
                            {isExpanded && (
                              <tr className="bg-slate-950/90 border-b border-emerald-900/40">
                                <td colSpan={5} className="px-6 py-6">
                                  <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl space-y-6">
                                    {/* Dossier Header */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs uppercase tracking-wider font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                                            Final Project Dossier
                                          </span>
                                          <h3 className="text-lg font-bold text-white">{s.team_name}</h3>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
                                          Submitted by <span className="text-slate-200 font-medium">{s.participant_email}</span>
                                          {s.team_lead && (
                                            <> · Team Lead: <span className="text-slate-200 font-medium">{s.team_lead}</span></>
                                          )}
                                          {' '}· Date: {formatDate(s.created_at)}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <a
                                          href={`/api/admin/export?type=final&format=txt&id=${s.id}`}
                                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition"
                                        >
                                          Download Dossier (.txt)
                                        </a>
                                      </div>
                                    </div>

                                    {/* Key Deliverable Links Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                          </svg>
                                          Demo Video
                                        </div>
                                        {s.demo_video ? (
                                          <div className="flex items-center justify-between gap-2">
                                            <a
                                              href={s.demo_video}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-rose-300 hover:underline font-mono truncate"
                                            >
                                              {s.demo_video}
                                            </a>
                                            <button
                                              type="button"
                                              onClick={() => handleCopy(s.demo_video, `video-${s.id}`)}
                                              className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-800 shrink-0"
                                            >
                                              {copiedId === `video-${s.id}` ? '✓' : 'Copy'}
                                            </button>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-slate-600 italic">Not provided</p>
                                        )}
                                      </div>

                                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                          </svg>
                                          Source Code
                                        </div>
                                        {s.source_repo ? (
                                          <div className="flex items-center justify-between gap-2">
                                            <a
                                              href={s.source_repo}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-indigo-300 hover:underline font-mono truncate"
                                            >
                                              {s.source_repo}
                                            </a>
                                            <button
                                              type="button"
                                              onClick={() => handleCopy(s.source_repo, `repo-${s.id}`)}
                                              className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-800 shrink-0"
                                            >
                                              {copiedId === `repo-${s.id}` ? '✓' : 'Copy'}
                                            </button>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-slate-600 italic">Not provided</p>
                                        )}
                                      </div>

                                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                          Hosted Prototype
                                        </div>
                                        {s.hosted_prototype ? (
                                          <div className="flex items-center justify-between gap-2">
                                            <a
                                              href={s.hosted_prototype}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-amber-300 hover:underline font-mono truncate"
                                            >
                                              {s.hosted_prototype}
                                            </a>
                                            <button
                                              type="button"
                                              onClick={() => handleCopy(s.hosted_prototype, `proto-${s.id}`)}
                                              className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-800 shrink-0"
                                            >
                                              {copiedId === `proto-${s.id}` ? '✓' : 'Copy'}
                                            </button>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-slate-600 italic">Not provided</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* 7 Deliverables Content Blocks */}
                                    <div className="space-y-4">
                                      {/* 1. Problem */}
                                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                                            1. Core Problem Statement
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(s.problem, `prob-${s.id}`)}
                                            className="text-[11px] text-slate-500 hover:text-slate-300"
                                          >
                                            {copiedId === `prob-${s.id}` ? '✓ Copied' : 'Copy'}
                                          </button>
                                        </div>
                                        <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                                          {s.problem || <span className="italic text-slate-600">No problem statement entered.</span>}
                                        </p>
                                      </div>

                                      {/* 2. Solution */}
                                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                                            2. Working Solution
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(s.solution, `sol-${s.id}`)}
                                            className="text-[11px] text-slate-500 hover:text-slate-300"
                                          >
                                            {copiedId === `sol-${s.id}` ? '✓ Copied' : 'Copy'}
                                          </button>
                                        </div>
                                        <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                                          {s.solution || <span className="italic text-slate-600">No solution entered.</span>}
                                        </p>
                                      </div>

                                      {/* 3. AI Usage */}
                                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                                            3. General AI Integration & Usage
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(s.ai_usage, `ai-${s.id}`)}
                                            className="text-[11px] text-slate-500 hover:text-slate-300"
                                          >
                                            {copiedId === `ai-${s.id}` ? '✓ Copied' : 'Copy'}
                                          </button>
                                        </div>
                                        <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                                          {s.ai_usage || <span className="italic text-slate-600">No AI usage details entered.</span>}
                                        </p>
                                      </div>

                                      {/* 4. Technical Brief */}
                                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                                            4. Technical Architecture & Tech Stack
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(s.technical_brief, `tech-${s.id}`)}
                                            className="text-[11px] text-slate-500 hover:text-slate-300"
                                          >
                                            {copiedId === `tech-${s.id}` ? '✓ Copied' : 'Copy'}
                                          </button>
                                        </div>
                                        <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                                          {s.technical_brief || <span className="italic text-slate-600">No technical brief entered.</span>}
                                        </p>
                                      </div>

                                      {/* 5. Impact */}
                                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                            5. Real-World Impact & Transformation
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(s.impact, `imp-${s.id}`)}
                                            className="text-[11px] text-slate-500 hover:text-slate-300"
                                          >
                                            {copiedId === `imp-${s.id}` ? '✓ Copied' : 'Copy'}
                                          </button>
                                        </div>
                                        <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                                          {s.impact || <span className="italic text-slate-600">No impact metrics entered.</span>}
                                        </p>
                                      </div>

                                      {/* 6. Roadmap */}
                                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                            6. Development Roadmap
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(s.roadmap, `road-${s.id}`)}
                                            className="text-[11px] text-slate-500 hover:text-slate-300"
                                          >
                                            {copiedId === `road-${s.id}` ? '✓ Copied' : 'Copy'}
                                          </button>
                                        </div>
                                        <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                                          {s.roadmap || <span className="italic text-slate-600">No roadmap entered.</span>}
                                        </p>
                                      </div>

                                      {/* 7. AI Usage Statement (Qoder AI) */}
                                      <div className="p-4 rounded-xl bg-orange-950/20 border border-brand-orange/40">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                                            7. Alibaba Cloud / Qoder AI Usage Statement
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(s.ai_usage_statement, `qoder-${s.id}`)}
                                            className="text-[11px] text-brand-orange/80 hover:text-brand-orange"
                                          >
                                            {copiedId === `qoder-${s.id}` ? '✓ Copied' : 'Copy'}
                                          </button>
                                        </div>
                                        <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                                          {s.ai_usage_statement || <span className="italic text-slate-600">No Qoder AI statement entered.</span>}
                                        </p>
                                      </div>
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

          {/* ========================================================================= */}
          {/* TAB 2: TEAM REGISTRATIONS VIEW */}
          {/* ========================================================================= */}
          {activeTab === 'registrations' && (
            <div>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Teams" value={regStats.totalTeams} accent="text-brand-orange" subtitle="Registered teams" />
                <StatCard label="Total Participants" value={regStats.totalParticipants} subtitle="Across all teams" />
                <StatCard label="Faculties Represented" value={regStats.facultyCount} subtitle="Distinct faculties" />
                <StatCard
                  label="Solo / Duo / Trio"
                  value={`${regStats.bySize[1]} / ${regStats.bySize[2]} / ${regStats.bySize[3]}`}
                  subtitle="Team size breakdown"
                />
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
                  <table className="w-full text-sm table-fixed min-w-[820px]">
                    <thead>
                      <tr className="border-b-2 border-slate-700 text-left text-slate-400 text-xs uppercase tracking-widest bg-slate-800/60">
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[17%]" onClick={() => handleRegSort('team_name')}>
                          Team{sortIndicator(regSortKey, 'team_name', regSortDir)}
                        </th>
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[21%]" onClick={() => handleRegSort('full_name')}>
                          Lead Builder{sortIndicator(regSortKey, 'full_name', regSortDir)}
                        </th>
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[16%]" onClick={() => handleRegSort('faculty')}>
                          Faculty{sortIndicator(regSortKey, 'faculty', regSortDir)}
                        </th>
                        <th className="px-3 py-3 font-bold w-[7%] text-center">Size</th>
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[14%]" onClick={() => handleRegSort('created_at')}>
                          Registered{sortIndicator(regSortKey, 'created_at', regSortDir)}
                        </th>
                        <th className="px-3 py-3 font-bold w-[11%] text-center">Members</th>
                        <th className="px-3 py-3 font-bold w-[14%] text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center text-slate-500 text-base">
                            No registrations {regQuery ? 'match your search' : 'found'}.
                          </td>
                        </tr>
                      )}
                      {filteredRegistrations.map((r) => {
                        const isDuplicateName = duplicateTeamNames.has((r.team_name || '').trim().toLowerCase());
                        return (
                          <Fragment key={r.id}>
                            <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors duration-150">
                              <td className="px-3 py-3 font-bold text-white text-sm break-words">
                                {r.team_name}
                                {isDuplicateName && (
                                  <span
                                    className="ml-2 inline-block align-middle text-[10px] font-bold uppercase tracking-wider text-red-300 bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 rounded"
                                    title="Another team shares this exact name - rename one of them to avoid confusion."
                                  >
                                    Duplicate name
                                  </span>
                                )}
                              </td>
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
                              <td className="px-3 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setEditingReg(r)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white transition"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                            {expandedRegId === r.id && (
                              <tr className="bg-slate-950/60">
                                <td colSpan={7} className="px-6 py-5">
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: LEGACY INITIAL BRIEFS VIEW */}
          {/* ========================================================================= */}
          {activeTab === 'brief_submissions' && (
            <div>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Submissions" value={briefStats.total} accent="text-cyan-400" subtitle="Briefs received" />
                <StatCard label="Teams Submitted" value={briefStats.uniqueTeams} subtitle="Unique participating teams" />
                <StatCard label="Avg Brief Length" value={`${briefStats.avgWords} words`} subtitle="Per project brief" />
                <StatCard label="Latest Submission" value={briefStats.latest} subtitle="Most recent brief update" />
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
                    value={briefQuery}
                    onChange={(e) => setBriefQuery(e.target.value)}
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
                Showing {filteredBriefSubmissions.length} of {briefSubmissions.length} project submission{briefSubmissions.length === 1 ? '' : 's'}
              </p>

              {/* Submissions Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/40" style={{ minHeight: '420px' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed min-w-[760px]">
                    <thead>
                      <tr className="border-b-2 border-slate-700 text-left text-slate-400 text-xs uppercase tracking-widest bg-slate-800/60">
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[18%]" onClick={() => handleBriefSort('team_name')}>
                          Team{sortIndicator(briefSortKey, 'team_name', briefSortDir)}
                        </th>
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[22%]" onClick={() => handleBriefSort('participant_email')}>
                          Submitter Details{sortIndicator(briefSortKey, 'participant_email', briefSortDir)}
                        </th>
                        <th className="px-3 py-3 font-bold w-[34%]">
                          Project Brief Overview
                        </th>
                        <th className="px-3 py-3 cursor-pointer select-none font-bold w-[14%]" onClick={() => handleBriefSort('created_at')}>
                          Submitted{sortIndicator(briefSortKey, 'created_at', briefSortDir)}
                        </th>
                        <th className="px-3 py-3 font-bold w-[12%] text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBriefSubmissions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center text-slate-500 text-base">
                            No project submissions {briefQuery ? 'match your search' : 'received yet'}.
                          </td>
                        </tr>
                      )}
                      {filteredBriefSubmissions.map((s) => {
                        const isExpanded = expandedBriefId === s.id;
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
                                    onClick={() => setExpandedBriefId(isExpanded ? null : s.id)}
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
                                    onClick={() => handleCopy(s.project_brief, s.id)}
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
                                          onClick={() => handleCopy(s.project_brief, s.id)}
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

        {editingReg && (
          <EditRegistrationModal
            registration={editingReg}
            onClose={() => setEditingReg(null)}
            onSaved={handleRegistrationSaved}
          />
        )}
      </div>
    </>
  );
}
