import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCVStore } from '../store/cvStore';
import { cvAPI } from '../services/api';
import CVUploadModal from '../components/CVUploadModal';
import CVPreview from '../components/CVPreview';

/* ── tiny helper ── */
const timeAgo = (dateStr) => {
  const delta = (Date.now() - new Date(dateStr)) / 1000;
  if (delta < 60) return 'just now';
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  if (delta < 2592000) return `${Math.floor(delta / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

/* ── Styled delete confirm dialog ── */
const DeleteConfirm = ({ title, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdropBlur" onClick={onCancel}>
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full mx-4" onClick={e => e.stopPropagation()}>
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <h3 className="text-base font-bold text-gray-900 text-center mb-1">Delete Resume?</h3>
      <p className="text-sm text-gray-500 text-center mb-5">"<span className="font-medium text-gray-700">{title}</span>" will be permanently deleted. This cannot be undone.</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition">Delete</button>
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  const { cvs, setCVs, loading, setLoading, error, setError } = useCVStore();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, title }
  const navigate = useNavigate();

  useEffect(() => { fetchCVs(); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCVs = async () => {
    setLoading(true);
    try { const r = await cvAPI.getAll(); setCVs(r.data); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to fetch CVs'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const r = await cvAPI.create({
        title: newTitle.trim(),
        personal_info: {},
        experiences: [],
        educations: [],
        skills: [],
        certifications: [],
        languages: [],
        projects: []
      });
      setShowCreateModal(false);
      setNewTitle('');
      showToast('CV created!');
      navigate(`/cv-editor/${r.data.id}`);
    } catch (err) { showToast(err.response?.data?.detail || 'Failed to create CV', 'error'); }
    finally { setCreating(false); }
  };

  const handleFileUpload = async (file) => {
    try {
      const cvTitle = file.name.replace(/\.[^/.]+$/, '');
      const createRes = await cvAPI.create({ title: cvTitle });
      await cvAPI.uploadFile(createRes.data.id, file);
      await fetchCVs();
      setShowUploadModal(false);
      showToast('CV uploaded & parsed!');
      navigate(`/cv-editor/${createRes.data.id}`);
    } catch (err) { showToast(err.response?.data?.detail || 'Upload failed', 'error'); }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const cv = cvs.find(c => c.id === id);
    setConfirmDelete({ id, title: cv?.title || 'Untitled CV' });
  };

  const confirmDeleteNow = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try { await cvAPI.delete(id); await fetchCVs(); showToast('CV deleted'); }
    catch { showToast('Delete failed', 'error'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Delete confirm dialog */}
      {confirmDelete && (
        <DeleteConfirm
          title={confirmDelete.title}
          onConfirm={confirmDeleteNow}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {/* Toast */}
      {toast && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white toast ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Resumes</h1>
            <p className="text-gray-500 text-sm mt-0.5">Create and manage your professional CVs</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Import CV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-700 rounded-lg transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Resume
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl h-64 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {/* New resume card */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="group border-2 border-dashed border-gray-300 hover:border-primary rounded-xl flex flex-col items-center justify-center h-64 gap-3 transition hover:bg-red-50"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center transition">
                <svg className="w-5 h-5 text-gray-400 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <span className="text-sm font-medium text-gray-500 group-hover:text-primary transition">New resume</span>
            </button>

            {/* CV cards */}
            {cvs.map(cv => (
              <div
                key={cv.id}
                onClick={() => navigate(`/cv-editor/${cv.id}`)}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary-200 transition-all duration-200 group"
              >
                {/* Full CV preview thumbnail — correctly scaled */}
                <div className="relative bg-gray-50 overflow-hidden" style={{ height: 200 }}>
                  {/* 
                    CVPreview renders at exactly 794px wide.
                    We want it to fill a card that is ~100% of available width.
                    We use a fixed inner width and CSS scale so the preview fills the card.
                    transformOrigin top-left, then set the outer wrapper height to (794 * scale)-equivalent.
                  */}
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: 794,
                    transform: 'scale(var(--cv-scale, 0.24))',
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    '--cv-scale': '0.24',
                  }}>
                    <CVPreview data={cv} theme={cv.theme} />
                  </div>
                  {/* Overlay gradient at bottom for fade effect */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 56, background: 'linear-gradient(to bottom, transparent, rgba(249,250,251,0.95))' }} />
                  {/* Hover overlay with action buttons */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-2 p-3">
                    <div className="flex gap-2 flex-wrap justify-center">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/cv-editor/${cv.id}`); }}
                        className="bg-white text-gray-800 text-xs font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-primary hover:text-white transition min-w-[72px]"
                      >✏️ Edit</button>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/cv-customize/${cv.id}`); }}
                        className="bg-primary text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-primary-700 transition min-w-[72px]"
                      >⚡ AI</button>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/cover-letter/new?cvId=${cv.id}`); }}
                        className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition min-w-[72px]"
                      >✉ Letter</button>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(cv.id, e); }}
                      className="bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-red-700 transition w-full max-w-[220px] flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete
                    </button>
                  </div>
                </div>

                {/* Card footer */}
                <div className="px-3 py-2.5 border-t border-gray-100 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{cv.title || 'Untitled CV'}</p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">{timeAgo(cv.updated_at)} · A4</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Create New Resume</h2>
            <p className="text-gray-500 text-sm mb-5">Give your CV a title to get started</p>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Software Engineer CV"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-100 mb-4"
                autoFocus
                required
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-700 disabled:bg-gray-300 transition">
                  {creating ? 'Creating...' : 'Create & Edit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && <CVUploadModal onClose={() => setShowUploadModal(false)} onUpload={handleFileUpload} />}
    </div>
  );
};

export default DashboardPage;
