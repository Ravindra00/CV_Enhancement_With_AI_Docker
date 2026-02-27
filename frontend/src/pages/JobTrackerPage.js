import React, { useState, useEffect } from 'react';
import { jobApplicationAPI, cvAPI, coverLetterAPI } from '../services/api';

const STATUSES = [
    { key: 'saved', label: 'Saved', color: '#6b7280', bg: '#f3f4f6', emoji: '🔖' },
    { key: 'applied', label: 'Applied', color: '#2563eb', bg: '#eff6ff', emoji: '📤' },
    { key: 'interviewing', label: 'Interviewing', color: '#d97706', bg: '#fffbeb', emoji: '🎙️' },
    { key: 'offer', label: 'Offer', color: '#16a34a', bg: '#f0fdf4', emoji: '🎉' },
    { key: 'rejected', label: 'Rejected', color: '#dc2626', bg: '#fef2f2', emoji: '❌' },
];

const EMPTY_APP = { company: '', role: '', job_url: '', location: '', salary_range: '', notes: '', cv_id: '', cover_letter_id: '', status: 'saved' };

const Badge = ({ status }) => {
    const s = STATUSES.find(x => x.key === status) || STATUSES[0];
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.emoji} {s.label}</span>;
};

const JobTrackerPage = () => {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('kanban'); // kanban | table
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);   // null = new
    const [form, setForm] = useState(EMPTY_APP);
    const [cvs, setCvs] = useState([]);
    const [coverLetters, setCoverLetters] = useState([]);
    const [stats, setStats] = useState({});
    const [saving, setSaving] = useState(false);
    const [showExport, setShowExport] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [appsRes, cvsRes, clRes, statsRes] = await Promise.all([
                jobApplicationAPI.getAll(),
                cvAPI.getAll(),
                coverLetterAPI.getAll(),
                jobApplicationAPI.getStats(),
            ]);
            setApps(appsRes.data);
            setCvs(cvsRes.data);
            setCoverLetters(clRes.data);
            setStats(statsRes.data);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const openNew = () => { setEditing(null); setForm(EMPTY_APP); setShowModal(true); };
    const openEdit = app => { setEditing(app.id); setForm({ ...EMPTY_APP, ...app, cv_id: app.cv_id || '', cover_letter_id: app.cover_letter_id || '' }); setShowModal(true); };

    const save = async () => {
        if (!form.company || !form.role) { alert('Company and role are required'); return; }
        setSaving(true);
        const payload = { ...form, cv_id: form.cv_id || null, cover_letter_id: form.cover_letter_id || null };
        try {
            if (editing) { await jobApplicationAPI.update(editing, payload); }
            else { await jobApplicationAPI.create(payload); }
            setShowModal(false);
            await load();
        } catch { alert('Save failed'); }
        setSaving(false);
    };

    const del = async (id) => {
        if (!window.confirm('Delete this application?')) return;
        await jobApplicationAPI.delete(id);
        setApps(prev => prev.filter(a => a.id !== id));
    };

    const changeStatus = async (id, newStatus) => {
        await jobApplicationAPI.updateStatus(id, newStatus);
        setApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    };

    /* ── Exports ── */
    const exportCSV = () => {
        const headers = ['Company', 'Role', 'Location', 'Salary', 'Status', 'Applied Date', 'Job URL', 'Notes'];
        const rows = apps.map(a => [
            a.company, a.role, a.location || '', a.salary_range || '',
            a.status, a.applied_date ? new Date(a.applied_date).toLocaleDateString() : '',
            a.job_url || '', (a.notes || '').replace(/\n/g, ' '),
        ].map(v => `"${String(v).replace(/"/g, '""')}"`));
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'job_applications.csv'; a.click();
        URL.revokeObjectURL(url);
        setShowExport(false);
    };

    const exportPDF = () => {
        const statusColors = { saved: '#6b7280', applied: '#2563eb', interviewing: '#d97706', offer: '#16a34a', rejected: '#dc2626' };
        const rows = apps.map(a => `
            <tr>
                <td>${a.company}</td><td>${a.role}</td>
                <td>${a.location || '—'}</td><td>${a.salary_range || '—'}</td>
                <td style="color:${statusColors[a.status]}; font-weight:600">${a.status}</td>
                <td>${a.applied_date ? new Date(a.applied_date).toLocaleDateString() : '—'}</td>
                <td style="max-width:200px;font-size:10px;color:#6b7280">${(a.notes || '').substring(0, 120)}</td>
            </tr>`).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
            <title>Job Applications</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
                h1 { font-size: 18px; margin-bottom: 4px; }
                p { color: #6b7280; margin: 0 0 16px; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #1a1a1a; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
                td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
                tr:nth-child(even) { background: #f9fafb; }
            </style></head><body>
            <h1>Job Application Tracker</h1>
            <p>Exported ${new Date().toLocaleDateString()} — ${apps.length} applications</p>
            <table><thead><tr>
                <th>Company</th><th>Role</th><th>Location</th><th>Salary</th><th>Status</th><th>Applied</th><th>Notes</th>
            </tr></thead><tbody>${rows}</tbody></table>
            <script>window.onload=()=>{window.print();}<\/script></body></html>`;
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        setShowExport(false);
    };

    const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300';
    const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

    const CardApp = ({ app }) => (
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition group">
            <div className="flex items-start justify-between gap-1 mb-2">
                <div>
                    <div className="font-semibold text-gray-900 text-sm leading-tight">{app.role}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{app.company}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openEdit(app)} className="text-gray-400 hover:text-gray-700 p-1 rounded">✏️</button>
                    <button onClick={() => del(app.id)} className="text-gray-400 hover:text-red-500 p-1 rounded">🗑</button>
                </div>
            </div>
            {app.location && <div className="text-xs text-gray-400 mb-1">📍 {app.location}</div>}
            {app.salary_range && <div className="text-xs text-gray-400 mb-1">💰 {app.salary_range}</div>}
            {app.applied_date && <div className="text-xs text-gray-400">📅 {new Date(app.applied_date).toLocaleDateString()}</div>}
            {/* Quick status change */}
            <div className="mt-2 pt-2 border-t border-gray-100">
                <select value={app.status} onChange={e => changeStatus(app.id, e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer">
                    {STATUSES.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                </select>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Job Tracker</h1>
                        <p className="text-gray-500 text-sm mt-1">Track every application in one place</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View toggle */}
                        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
                            {['kanban', 'table'].map(v => (
                                <button key={v} onClick={() => setView(v)} className={`px-4 py-2 text-sm font-medium transition ${view === v ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                                    {v === 'kanban' ? '⊡ Kanban' : '≡ Table'}
                                </button>
                            ))}
                        </div>
                        {/* Export dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowExport(e => !e)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition shadow-sm"
                            >
                                ⬇ Export
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {showExport && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-44 overflow-hidden">
                                    <button onClick={exportCSV} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
                                        📊 Export as CSV
                                    </button>
                                    <button onClick={exportPDF} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100">
                                        🖨 Print as PDF
                                    </button>
                                </div>
                            )}
                        </div>
                        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-700 transition shadow-sm">
                            + Add Application
                        </button>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-5 gap-3 mb-8">
                    {STATUSES.map(s => (
                        <div key={s.key} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                            <div className="text-2xl mb-1">{s.emoji}</div>
                            <div className="text-xl font-bold" style={{ color: s.color }}>{stats[s.key] || 0}</div>
                            <div className="text-xs text-gray-500">{s.label}</div>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-16 text-gray-400">Loading…</div>
                ) : view === 'kanban' ? (
                    /* ─── Kanban ─── */
                    <div className="grid grid-cols-5 gap-4">
                        {STATUSES.map(s => {
                            const col = apps.filter(a => a.status === s.key);
                            return (
                                <div key={s.key} className="bg-white rounded-2xl border border-gray-200 p-3 min-h-[500px]">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-sm font-semibold" style={{ color: s.color }}>{s.emoji} {s.label}</div>
                                        <span className="text-xs font-bold text-gray-400">{col.length}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {col.map(app => <CardApp key={app.id} app={app} />)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* ─── Table ─── */
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    {['Company', 'Role', 'Location', 'Salary', 'Status', 'Applied', ''].map(h => (
                                        <th key={h} className="text-left text-xs font-semibold text-gray-600 px-4 py-3">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {apps.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">No applications yet</td></tr>
                                ) : apps.map(app => (
                                    <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 font-medium text-gray-900">{app.company}</td>
                                        <td className="px-4 py-3 text-gray-700">{app.role}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{app.location || '—'}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{app.salary_range || '—'}</td>
                                        <td className="px-4 py-3"><Badge status={app.status} /></td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{app.applied_date ? new Date(app.applied_date).toLocaleDateString() : '—'}</td>
                                        <td className="px-4 py-3 flex gap-2">
                                            <button onClick={() => openEdit(app)} className="text-gray-400 hover:text-gray-700 transition">✏️</button>
                                            <button onClick={() => del(app.id)} className="text-gray-400 hover:text-red-500 transition">🗑</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ─── Modal ─── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-5">{editing ? 'Edit Application' : 'Add New Application'}</h2>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Company *</label><input className={inputCls} value={form.company} onChange={e => f('company', e.target.value)} placeholder="Google" /></div>
                                <div><label className={labelCls}>Role *</label><input className={inputCls} value={form.role} onChange={e => f('role', e.target.value)} placeholder="Software Engineer" /></div>
                                <div><label className={labelCls}>Location</label><input className={inputCls} value={form.location} onChange={e => f('location', e.target.value)} placeholder="Munich, Germany" /></div>
                                <div><label className={labelCls}>Salary Range</label><input className={inputCls} value={form.salary_range} onChange={e => f('salary_range', e.target.value)} placeholder="€60k–€70k" /></div>
                            </div>
                            <div><label className={labelCls}>Job URL</label><input className={inputCls} value={form.job_url} onChange={e => f('job_url', e.target.value)} placeholder="https://…" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Status</label>
                                    <select className={inputCls} value={form.status} onChange={e => f('status', e.target.value)}>
                                        {STATUSES.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                                    </select>
                                </div>
                                <div><label className={labelCls}>Applied Date</label><input type="date" className={inputCls} value={form.applied_date ? form.applied_date.slice(0, 10) : ''} onChange={e => f('applied_date', e.target.value)} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Link CV</label>
                                    <select className={inputCls} value={form.cv_id} onChange={e => f('cv_id', e.target.value)}>
                                        <option value="">None</option>
                                        {cvs.map(cv => <option key={cv.id} value={cv.id}>{cv.title || `CV #${cv.id}`}</option>)}
                                    </select>
                                </div>
                                <div><label className={labelCls}>Link Cover Letter</label>
                                    <select className={inputCls} value={form.cover_letter_id} onChange={e => f('cover_letter_id', e.target.value)}>
                                        <option value="">None</option>
                                        {coverLetters.map(cl => <option key={cl.id} value={cl.id}>{cl.title}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div><label className={labelCls}>Notes</label><textarea className={`${inputCls} resize-none`} rows={3} value={form.notes || ''} onChange={e => f('notes', e.target.value)} placeholder="Interview notes, recruiter name…" /></div>
                        </div>
                        <div className="flex gap-2 justify-end mt-5">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={save} disabled={saving} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
                                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Application'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobTrackerPage;
