import { useState } from 'react';
import { faculties, facultyDeptData } from '../../data/facultyDepartments.js';
import { adminUpdateRegistration } from '../../lib/api.js';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyMember = {
  name: '',
  email: '',
  student_id: '',
  faculty: '',
  department: '',
  year_of_study: '1st Year'
};

function inputClass() {
  return 'w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand-orange transition';
}

// Admin-only "edit any team" modal. Unlike the leader self-service flow
// (which locks the team name and leader details), an admin can change
// everything - this is how a name collision between two teams gets fixed.
export default function EditRegistrationModal({ registration, onClose, onSaved }) {
  const [form, setForm] = useState({
    team_name: registration.team_name || '',
    full_name: registration.full_name || '',
    student_email: registration.student_email || '',
    student_id: registration.student_id || '',
    faculty: registration.faculty || '',
    department: registration.department || '',
    year_of_study: registration.year_of_study || '1st Year'
  });
  const [members, setMembers] = useState(
    (Array.isArray(registration.members) ? registration.members : []).map((m) => ({ ...emptyMember, ...m }))
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const teamSize = members.length + 1;

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSizeChange = (size) => {
    setMembers((prev) => {
      const needed = size - 1;
      const next = prev.slice(0, needed);
      while (next.length < needed) next.push({ ...emptyMember });
      return next;
    });
  };

  const handleMemberChange = (index, field) => (e) => {
    const value = e.target.value;
    setMembers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'faculty') next[index].department = '';
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.team_name.trim()) {
      setError('Team name is required.');
      return;
    }
    if (!EMAIL_RE.test(form.student_email.trim())) {
      setError('A valid lead builder email is required.');
      return;
    }
    for (let i = 0; i < members.length; i += 1) {
      const m = members[i];
      if (!m.name.trim() || !m.student_id.trim() || !m.faculty || !m.department || !EMAIL_RE.test((m.email || '').trim())) {
        setError(`Please complete all details for member ${i + 2}.`);
        return;
      }
    }

    setError('');
    setSaving(true);
    try {
      const { registration: updated } = await adminUpdateRegistration({
        id: registration.id,
        team_name: form.team_name.trim(),
        full_name: form.full_name.trim(),
        student_email: form.student_email.trim().toLowerCase(),
        student_id: form.student_id.trim(),
        faculty: form.faculty.trim(),
        department: form.department.trim(),
        year_of_study: form.year_of_study,
        team_size: teamSize,
        members: members.map((m) => ({
          name: m.name.trim(),
          email: (m.email || '').trim().toLowerCase(),
          student_id: m.student_id.trim(),
          faculty: m.faculty,
          department: m.department,
          year_of_study: m.year_of_study || '1st Year'
        }))
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-white font-bold text-lg">Edit Team Registration</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Team Name</label>
            <input type="text" className={inputClass()} value={form.team_name} onChange={setField('team_name')} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Lead Builder Name</label>
              <input type="text" className={inputClass()} value={form.full_name} onChange={setField('full_name')} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Lead Builder Email</label>
              <input type="email" className={inputClass()} value={form.student_email} onChange={setField('student_email')} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Student ID / Reg No</label>
              <input type="text" className={inputClass()} value={form.student_id} onChange={setField('student_id')} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Year of Study</label>
              <select className={inputClass()} value={form.year_of_study} onChange={setField('year_of_study')}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Faculty</label>
              <select
                className={inputClass()}
                value={form.faculty}
                onChange={(e) => setForm((prev) => ({ ...prev, faculty: e.target.value, department: '' }))}
              >
                <option value="" disabled>Select Faculty</option>
                {faculties.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Department</label>
              <select className={inputClass()} value={form.department} onChange={setField('department')} disabled={!form.faculty}>
                <option value="" disabled>{form.faculty ? 'Select Department' : 'Select Faculty First'}</option>
                {(facultyDeptData[form.faculty] || []).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Team Size</label>
            <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
              {[1, 2, 3].map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => handleSizeChange(size)}
                  className={`px-4 py-1.5 text-sm font-semibold transition ${
                    teamSize === size ? 'bg-brand-orange text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {members.map((member, index) => (
            <div key={index} className="border-t border-slate-800 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-orange mb-2.5">Member {index + 2}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Full name"
                  className={inputClass()}
                  value={member.name}
                  onChange={handleMemberChange(index, 'name')}
                />
                <input
                  type="text"
                  placeholder="Student ID / Reg No"
                  className={inputClass()}
                  value={member.student_id}
                  onChange={handleMemberChange(index, 'student_id')}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  className={inputClass()}
                  value={member.email || ''}
                  onChange={handleMemberChange(index, 'email')}
                />
                <select
                  className={inputClass()}
                  value={member.year_of_study || '1st Year'}
                  onChange={handleMemberChange(index, 'year_of_study')}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  className={inputClass()}
                  value={member.faculty || ''}
                  onChange={handleMemberChange(index, 'faculty')}
                >
                  <option value="" disabled>Select Faculty</option>
                  {faculties.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <select
                  className={inputClass()}
                  value={member.department || ''}
                  onChange={handleMemberChange(index, 'department')}
                  disabled={!member.faculty}
                >
                  <option value="" disabled>{member.faculty ? 'Select Department' : 'Select Faculty First'}</option>
                  {(facultyDeptData[member.faculty] || []).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-brand-orange text-white text-sm font-bold hover:brightness-110 transition disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
