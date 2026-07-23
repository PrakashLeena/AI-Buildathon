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
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
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
          ...(Array.isArray(r.members) ? r.members.flatMap((m) => [m?.name, m?.student_id]) : [])
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
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-white">AI Buildathon — Admin</h1>
              <p className="text-slate-400 text-xs">Registration dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-400 text-sm hidden sm:inline">{adminEmail}</span>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-sm font-semibold px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition disabled:opacity-60"
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
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
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2.5 rounded-lg border border-slate-700 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition disabled:opacity-60"
              >
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <a
                href="/api/admin/export"
                className="px-4 py-2.5 rounded-lg bg-brand-orange text-white text-sm font-semibold hover:brightness-110 transition shadow-lg shadow-brand-orange/20"
              >
                Export CSV
              </a>
            </div>
          </div>

          <p className="text-slate-500 text-xs mb-3">
            Showing {filtered.length} of {registrations.length} registration{registrations.length === 1 ? '' : 's'}
          </p>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('team_name')}>
                      Team{sortIndicator('team_name')}
                    </th>
                    <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('full_name')}>
                      Lead{sortIndicator('full_name')}
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 whitespace-nowrap">Student ID</th>
                    <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('faculty')}>
                      Faculty{sortIndicator('faculty')}
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">Size</th>
                    <th
                      className="px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                      onClick={() => handleSort('created_at')}
                    >
                      Registered{sortIndicator('created_at')}
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                        No registrations {query ? 'match your search' : 'yet'}.
                      </td>
                    </tr>
                  )}
                  {filtered.map((r) => (
                    <Fragment key={r.id}>
                      <tr className="border-b border-slate-800/60 hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{r.team_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{r.full_name}</td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.student_email}</td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.student_id}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{r.faculty}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{r.team_size}</td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDate(r.created_at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.team_size > 1 && (
                            <button
                              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                              className="text-brand-orange text-xs font-semibold hover:underline"
                            >
                              {expandedId === r.id ? 'Hide' : 'Members'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedId === r.id && (
                        <tr className="bg-slate-950/60">
                          <td colSpan={8} className="px-4 py-4">
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                              Department: <span className="text-slate-300">{r.department}</span> · Year:{' '}
                              <span className="text-slate-300">{r.year_of_study}</span>
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3">
                              {(r.members || []).map((m, idx) => (
                                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                                  <p className="text-white font-semibold text-sm">{m.name}</p>
                                  <p className="text-slate-400 text-xs">Student ID: {m.student_id}</p>
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
