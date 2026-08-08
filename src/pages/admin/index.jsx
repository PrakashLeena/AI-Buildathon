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
  let loadError = null;

  if (isSupabaseConfigured) {
    const { data, error } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) loadError = error.message;
    else registrations = data || [];
  } else {
    loadError = supabaseConfigError;
  }

  return {
    props: {
      adminEmail: admin.email,
      initialRegistrations: registrations,
      loadError
    }
  };
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold ${accent || 'text-white'}`}>{value}</p>
    </div>
  );
}

function formatDate(iso) {
  try {
    // Fixed locale + timezone so SSR and the browser render the same string
    // (avoids React hydration mismatches that scramble table alignment).
    return new Date(iso).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Colombo'
    });
  } catch {
    return iso;
  }
}

export default function AdminDashboard({ adminEmail, initialRegistrations, loadError }) {
  const router = useRouter();
  const [registrations, setRegistrations] = useState(initialRegistrations || []);
  const [error, setError] = useState(loadError || '');
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const stats = useMemo(() => {
    const totalTeams = registrations.length;
    const totalParticipants = registrations.reduce((sum, r) => sum + (r.team_size || 1), 0);
    const facultySet = new Set(registrations.map((r) => r.faculty).filter(Boolean));
    const bySize = { 1: 0, 2: 0, 3: 0 };
    registrations.forEach((r) => {
      if (bySize[r.team_size] !== undefined) bySize[r.team_size] += 1;
    });
    return { totalTeams, totalParticipants, facultyCount: facultySet.size, bySize };
  }, [registrations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
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

    const sorted = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [registrations, query, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      const res = await fetch('/api/admin/registrations', { credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        throw new Error(body.error || 'Failed to refresh.');
      }
      setRegistrations(body.registrations || []);
    } catch (err) {
      setError(err.message || 'Failed to refresh.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      router.replace('/admin/login');
    }
  };

  const sortIndicator = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  return (
    <>
      <Head>
        <title>Admin Dashboard — AI Buildathon</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="admin-root min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">AI Buildathon — Admin</h1>
              <p className="text-slate-400 text-xs">Registration dashboard</p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <span className="text-slate-400 text-sm hidden sm:inline truncate max-w-[220px]">{adminEmail}</span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-sm font-semibold px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition disabled:opacity-60 whitespace-nowrap"
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Teams" value={stats.totalTeams} accent="text-brand-orange" />
            <StatCard label="Total Participants" value={stats.totalParticipants} />
            <StatCard label="Faculties Represented" value={stats.facultyCount} />
            <StatCard label="Solo / Duo / Trio" value={`${stats.bySize[1]} / ${stats.bySize[2]} / ${stats.bySize[3]}`} />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <input
              type="text"
              placeholder="Search by team, name, email, student ID, faculty…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-orange transition"
            />
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2.5 rounded-lg border border-slate-700 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition disabled:opacity-60 whitespace-nowrap"
              >
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <a
                href="/api/admin/export"
                className="inline-flex items-center px-4 py-2.5 rounded-lg bg-brand-orange text-white text-sm font-semibold hover:brightness-110 transition shadow-lg shadow-brand-orange/20 whitespace-nowrap"
              >
                Export CSV
              </a>
            </div>
          </div>

          <p className="text-slate-500 text-xs mb-3">
            Showing {filtered.length} of {registrations.length} registration{registrations.length === 1 ? '' : 's'}
          </p>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/40" style={{ minHeight: '420px' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b-2 border-slate-700 text-left text-slate-400 text-xs uppercase tracking-widest bg-slate-800/60">
                    <th className="px-6 py-4 cursor-pointer select-none whitespace-nowrap font-bold" onClick={() => handleSort('team_name')}>
                      Team{sortIndicator('team_name')}
                    </th>
                    <th className="px-6 py-4 cursor-pointer select-none whitespace-nowrap font-bold" onClick={() => handleSort('full_name')}>
                      Lead Builder{sortIndicator('full_name')}
                    </th>
                    <th className="px-6 py-4 cursor-pointer select-none whitespace-nowrap font-bold" onClick={() => handleSort('faculty')}>
                      Faculty{sortIndicator('faculty')}
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap font-bold">Size</th>
                    <th
                      className="px-6 py-4 cursor-pointer select-none whitespace-nowrap font-bold"
                      onClick={() => handleSort('created_at')}
                    >
                      Registered{sortIndicator('created_at')}
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap font-bold">Members</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-500 text-base">
                        No registrations {query ? 'match your search' : 'yet'}.
                      </td>
                    </tr>
                  )}
                  {filtered.map((r) => (
                    <Fragment key={r.id}>
                      <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors duration-150">
                        <td className="px-6 py-4 font-bold text-white whitespace-nowrap text-base">{r.team_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-slate-100 font-semibold text-base">{r.full_name}</p>
                          <p className="text-slate-400 text-sm mt-0.5">{r.student_email}</p>
                          <p className="text-slate-500 text-xs mt-0.5">ID: {r.student_id}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-200">{r.faculty}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-white font-bold text-sm">{r.team_size}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 whitespace-nowrap text-sm">{formatDate(r.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {r.team_size > 1 ? (
                            <button
                              type="button"
                              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                              className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border-2 transition-all duration-150 shadow-sm ${
                                expandedId === r.id
                                  ? 'bg-cyan-500/30 text-cyan-100 border-cyan-400 shadow-cyan-500/20'
                                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25 hover:border-cyan-400 hover:text-cyan-100 hover:shadow-md hover:shadow-cyan-500/20'
                              }`}
                            >
                              <span className="text-base leading-none">{expandedId === r.id ? '▲' : '▼'}</span>
                              {expandedId === r.id ? 'Hide Members' : `Members (${r.team_size - 1})`}
                            </button>
                          ) : (
                            <span className="text-slate-600 text-sm">Solo</span>
                          )}
                        </td>
                      </tr>
                      {expandedId === r.id && (
                        <tr className="bg-slate-950/60">
                          <td colSpan={6} className="px-6 py-5">
                            <p className="text-sm uppercase tracking-wider text-slate-500 mb-3">
                              Department: <span className="text-slate-300">{r.department}</span> · Year:{' '}
                              <span className="text-slate-300">{r.year_of_study}</span>
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3">
                              {(r.members || []).map((m, idx) => (
                                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className="text-white font-semibold text-sm">{m.name}</p>
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                      Member {idx + 2}
                                    </span>
                                  </div>
                                  {m.email && <p className="text-slate-400 text-xs">{m.email}</p>}
                                  <p className="text-slate-400 text-xs">Student ID: {m.student_id}</p>
                                  {(m.faculty || m.department) && (
                                    <p className="text-slate-400 text-xs">
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
        </main>
      </div>
    </>
  );
}
