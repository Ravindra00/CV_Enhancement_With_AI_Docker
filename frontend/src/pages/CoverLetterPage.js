import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coverLetterAPI, cvAPI } from '../services/api';

const CoverLetterPage = () => {
    const navigate = useNavigate();
    const [letters, setLetters] = useState([]);
    const [cvs, setCVs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [linkedCv, setLinkedCv] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        Promise.all([
            coverLetterAPI.getAll().then(r => setLetters(r.data)),
            cvAPI.getAll().then(r => setCVs(r.data)),
        ]).finally(() => setLoading(false));
    }, []);

    const create = async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            const res = await coverLetterAPI.create({ title: newTitle, cv_id: linkedCv ? +linkedCv : null });
            navigate(`/cover-letters/${res.data.id}`);
        } catch (e) { alert('Failed to create cover letter'); }
        setCreating(false);
    };

    const del = async (id) => {
        if (!window.confirm('Delete this cover letter?')) return;
        await coverLetterAPI.delete(id);
        setLetters(prev => prev.filter(l => l.id !== id));
    };

    const formatDate = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // ✅ Extract text from content object
    const getLetterText = (content) => {
        if (typeof content === 'string') {
            return content;
        }
        if (content && typeof content === 'object') {
            return content.text || '';
        }
        return '';
    };

    // ✅ Get preview text (first 100 chars)
    const getPreview = (content) => {
        const text = getLetterText(content);
        return text.substring(0, 100) + (text.length > 100 ? '...' : '');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Cover Letters</h1>
                        <p className="text-gray-500 text-sm mt-1">Create and manage your tailored cover letters</p>
                    </div>
                    <button
                        onClick={() => setShowNew(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-700 transition shadow-sm"
                    >
                        + New Cover Letter
                    </button>
                </div>

                {/* Modal */}
                {showNew && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">New Cover Letter</h2>
                            <div className="space-y-3 mb-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                                    <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && create()}
                                        placeholder="e.g. Application to Google"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Link to a CV (optional)</label>
                                    <select value={linkedCv} onChange={e => setLinkedCv(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                                        <option value="">None</option>
                                        {cvs.map(cv => <option key={cv.id} value={cv.id}>{cv.title || `CV #${cv.id}`}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                                <button onClick={create} disabled={creating || !newTitle.trim()} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition">
                                    {creating ? 'Creating…' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-200 animate-pulse rounded-2xl" />)}
                    </div>
                ) : letters.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="text-5xl mb-4">📝</div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">No cover letters yet</h3>
                        <p className="text-gray-500 text-sm">Create your first cover letter to get started</p>
                        <button onClick={() => setShowNew(true)} className="mt-4 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition">+ New Cover Letter</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {letters.map(letter => (
                            <div key={letter.id} className="bg-white rounded-2xl border border-gray-200 hover:shadow-card-hover transition-shadow p-5 flex flex-col gap-3">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-xl">✉️</div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => navigate(`/cover-letters/${letter.id}/view`)}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
                                            title="View"
                                        >
                                            👁️ View
                                        </button>
                                        <button
                                            onClick={() => navigate(`/cover-letters/${letter.id}/edit`)}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
                                            title="Edit"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => del(letter.id)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition"
                                            title="Delete"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>

                                {/* Title */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 truncate">{letter.title}</h3>
                                </div>

                                {/* Preview */}
                                <div className="flex-grow">
                                    <p className="text-sm text-gray-600 line-clamp-3">
                                        {getPreview(letter.content) || '(Empty)'}
                                    </p>
                                </div>

                                {/* Footer */}
                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-xs text-gray-400">{formatDate(letter.updated_at)}</span>
                                    <button
                                        onClick={() => navigate(`/cover-letters/${letter.id}`)}
                                        className="text-xs font-semibold text-primary hover:underline"
                                    >
                                        View →
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* New card */}
                        <button
                            onClick={() => setShowNew(true)}
                            className="h-40 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition"
                        >
                            <span className="text-3xl">+</span>
                            <span className="text-sm font-medium">New Cover Letter</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoverLetterPage;