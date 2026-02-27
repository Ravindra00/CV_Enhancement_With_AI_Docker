import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const AdminPage = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = useCallback(async () => {
        try {
            const [statsRes, usersRes] = await Promise.all([
                adminAPI.getStats(),
                adminAPI.getUsers(),
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
        } catch (err) {
            showToast('Failed to load admin data', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user?.is_superuser) {
            navigate('/dashboard');
            return;
        }
        load();
    }, [user, navigate, load]);

    const toggle = async (uid, field, val) => {
        try {
            const res = await adminAPI.updateUser(uid, { [field]: val });
            setUsers(prev => prev.map(u => u.id === uid ? { ...u, ...res.data } : u));
            showToast(`Updated ${field}`);
        } catch (err) {
            showToast(err.response?.data?.detail || 'Update failed', 'error');
        }
    };

    const handleDelete = async (uid) => {
        setDeleting(uid);
        try {
            await adminAPI.deleteUser(uid);
            setUsers(prev => prev.filter(u => u.id !== uid));
            showToast('User deleted');
        } catch (err) {
            showToast(err.response?.data?.detail || 'Delete failed', 'error');
        } finally {
            setDeleting(null);
            setConfirmDelete(null);
        }
    };

    if (!user?.is_superuser) return null;

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f1629 100%)', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 10, background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                    {toast.msg}
                </div>
            )}

            {/* Delete confirm dialog */}
            {confirmDelete && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#1e2035', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>🗑️</div>
                            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Delete User?</h3>
                            <p style={{ color: '#9ca3af', margin: 0, fontSize: 14 }}>
                                This will permanently delete <strong style={{ color: 'white' }}>{confirmDelete.name}</strong> and all their CVs and data.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px', background: '#374151', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                            <button
                                onClick={() => handleDelete(confirmDelete.id)}
                                disabled={deleting === confirmDelete.id}
                                style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 600 }}
                            >{deleting === confirmDelete.id ? 'Deleting…' : 'Delete'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Admin Panel</h1>
                        <p style={{ color: '#9ca3af', margin: 0 }}>Manage users and system access</p>
                    </div>
                    <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'white', cursor: 'pointer', fontWeight: 600 }}>← Dashboard</button>
                </div>

                {/* Stats cards */}
                {stats && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
                        {[
                            { label: 'Total Users', value: stats.total_users, icon: '👥', color: '#6366f1' },
                            { label: 'Active Users', value: stats.active_users, icon: '✅', color: '#10b981' },
                            { label: 'AI Restricted', value: stats.ai_restricted_users, icon: '🤖', color: '#f59e0b' },
                            { label: 'Total CVs', value: stats.total_cvs, icon: '📄', color: '#8b5cf6' },
                            { label: 'Inactive', value: stats.inactive_users, icon: '🔴', color: '#ef4444' },
                        ].map((s, i) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '18px 20px', borderTop: `3px solid ${s.color}` }}>
                                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                                <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Users table */}
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Users ({users.length})</h2>
                        <button onClick={load} style={{ padding: '8px 16px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, color: '#a5b4fc', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>↻ Refresh</button>
                    </div>

                    {loading ? (
                        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Loading users…</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                                        {['ID', 'Name', 'Email', 'CVs', 'Active', 'AI Access', 'Superuser', 'Joined', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#9ca3af', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '12px 16px', color: '#6b7280' }}>#{u.id}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                                                {u.name}
                                                {u.id === user.id && <span style={{ marginLeft: 6, fontSize: 10, background: '#6366f1', padding: '1px 6px', borderRadius: 4 }}>You</span>}
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#9ca3af' }}>{u.email}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <span style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, padding: '2px 10px', color: '#c4b5fd', fontWeight: 600 }}>{u.cv_count}</span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <Toggle checked={u.is_active} disabled={u.id === user.id} onChange={v => toggle(u.id, 'is_active', v)} color="#10b981" />
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <Toggle checked={u.ai_access} onChange={v => toggle(u.id, 'ai_access', v)} color="#f59e0b" />
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <Toggle checked={u.is_superuser} disabled={u.id === user.id} onChange={v => toggle(u.id, 'is_superuser', v)} color="#6366f1" />
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#6b7280', whiteSpace: 'nowrap', fontSize: 11 }}>
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {u.id !== user.id && (
                                                    <button
                                                        onClick={() => setConfirmDelete(u)}
                                                        style={{ padding: '5px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                                    >Delete</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Mini toggle component ── */
const Toggle = ({ checked, onChange, disabled, color }) => (
    <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
            background: checked ? color : '#374151',
            position: 'relative', transition: 'background 0.2s', opacity: disabled ? 0.4 : 1, flexShrink: 0,
        }}
    >
        <span style={{
            position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18,
            borderRadius: '50%', background: 'white', transition: 'left 0.2s', display: 'block',
        }} />
    </button>
);

export default AdminPage;
