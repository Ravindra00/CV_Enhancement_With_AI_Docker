import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cvAPI, customizeAPI, jobApplicationAPI } from '../services/api';
import CVPreview from '../components/CVPreview';

const CVCustomizePage = () => {
  const params = useParams();
  const cvId = params.id || params.cvId;
  const navigate = useNavigate();

  const [cv, setCV] = useState(null);
  const [cvData, setCVData] = useState({});          // live preview data
  const [originalCVData, setOriginalCVData] = useState({}); // backup before enhancement

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [jobDescription, setJobDescription] = useState('');

  // Keyword analysis results
  const [suggestions, setSuggestions] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [matchScore, setMatchScore] = useState(null);
  const [matchedKeywords, setMatchedKeywords] = useState([]);
  const [missingKeywords, setMissingKeywords] = useState([]);

  // AI Enhancement results
  const [enhancedCV, setEnhancedCV] = useState(null);   // pending enhanced data
  const [enhanceMsg, setEnhanceMsg] = useState('');
  const [enhanceStatus, setEnhanceStatus] = useState(''); // 'success'|'error'|''

  // Save to Job Tracker form
  const [showSaveJobForm, setShowSaveJobForm] = useState(false);
  const [saveJobCompany, setSaveJobCompany] = useState('');
  const [saveJobRole, setSaveJobRole] = useState('');
  const [saveJobStatus, setSaveJobStatus] = useState('saved');
  const [savingJob, setSavingJob] = useState(false);

  const [toast, setToast] = useState(null);
  const [previewScale, setPreviewScale] = useState(0.48);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Build a unified data object the CVPreview component can consume. */
  const buildPreviewData = (raw) => ({
    personal_info: raw.personal_info || {},
    experiences: raw.experiences || [],
    projects: raw.projects || [],
    skills: raw.skills || [],
    educations: raw.educations || [],
    languages: raw.languages || [],
    certifications: raw.certifications || [],
    interests: raw.interests || [],
    full_name: raw.full_name || '',
    title: raw.title || '',
    email: raw.email || '',
    phone: raw.phone || '',
    location: raw.location || '',
    linkedin_url: raw.linkedin_url || '',
    profile_summary: raw.profile_summary || '',
    photo_path: raw.photo_path || '',
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load CV ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchCV();
    const handleResize = () => setPreviewScale(window.innerWidth > 1600 ? 0.55 : 0.45);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cvId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCV = async () => {
    try {
      const r = await cvAPI.getOne(cvId);
      const raw = r.data;
      setCV(raw);
      const preview = buildPreviewData(raw);
      setOriginalCVData(JSON.parse(JSON.stringify(preview)));
      setCVData(JSON.parse(JSON.stringify(preview)));
    } catch {
      showToast('Failed to load CV', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Keyword Analysis (existing flow) ─────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) { showToast('Please enter a job description', 'error'); return; }
    setAnalyzing(true);
    setSuggestions([]);
    setMatchScore(null);
    setEnhancedCV(null);
    setEnhanceMsg('');
    setEnhanceStatus('');
    try {
      const res = await customizeAPI.analyzeCVWithJobDescription(cvId, jobDescription);
      const d = res.data;
      setSuggestions(d.suggestions || []);
      setMatchScore(d.score ?? null);
      setMatchedKeywords(d.matched_keywords || []);
      setMissingKeywords(d.missing_keywords || []);
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Analysis failed';
      showToast(`❌ ${msg}`, 'error');
      setSuggestions([]);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplySuggestion = async (suggestion, index) => {
    try {
      const res = await customizeAPI.applySuggestion(cvId, suggestion.id);
      setAppliedIds(prev => new Set([...prev, index]));
      if (res.data?.updated_cv) {
        setCVData(buildPreviewData(res.data.updated_cv));
      } else {
        const r = await cvAPI.getOne(cvId);
        setCVData(buildPreviewData(r.data));
      }
      showToast('✅ Suggestion applied!');
    } catch (error) {
      const msg = error.response?.data?.detail || error.message;
      showToast(`❌ Error: ${msg}`, 'error');
    }
  };

  // ── AI Section Enhancement (new flow) ────────────────────────────────────────

  const handleEnhanceWithAI = async () => {
    if (!jobDescription.trim()) { showToast('Please enter a job description', 'error'); return; }
    setEnhancing(true);
    setEnhancedCV(null);
    setEnhanceMsg('');
    setEnhanceStatus('');
    try {
      const res = await cvAPI.enhanceForJob(cvId, jobDescription);
      const d = res.data;

      if (d.status === 'success' && d.enhanced_cv) {
        const preview = buildPreviewData(d.enhanced_cv);
        setEnhancedCV(d.enhanced_cv);   // store raw for apply-ai-changes payload
        setCVData(preview);             // update live preview immediately
        setEnhanceStatus('success');
        setEnhanceMsg('✅ AI rewrote your Experiences, Projects and Skills. Review the preview on the right, then click Apply.');
      } else {
        setEnhanceStatus('error');
        setEnhanceMsg(d.message || 'AI enhancement failed. Please try again.');
        showToast('AI enhancement failed', 'error');
      }
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Enhancement failed';
      setEnhanceStatus('error');
      setEnhanceMsg(`❌ ${msg}`);
      showToast(`❌ ${msg}`, 'error');
    } finally {
      setEnhancing(false);
    }
  };

  const handleApplyAIChanges = async () => {
    if (!enhancedCV) return;
    setApplying(true);
    try {
      const res = await cvAPI.applyAIChanges(cvId, enhancedCV);
      const saved = res.data;
      const preview = buildPreviewData(saved);
      setCVData(preview);
      setOriginalCVData(JSON.parse(JSON.stringify(preview)));
      setEnhancedCV(null);
      setEnhanceMsg('');
      setEnhanceStatus('');
      showToast('🎉 AI changes saved to your CV!');

      // ── Auto-create job tracker entry ────────────────────────────────────
      try {
        // Extract a rough role & company from the job description text
        const jd = jobDescription.trim();
        const lines = jd.split('\n').map(l => l.trim()).filter(Boolean);
        const role = lines[0]?.substring(0, 120) || 'Applied Role';
        // Try to find company: look for line containing 'bei', 'at', 'for', '@', ':'
        const companyLine = lines.find(l =>
          /\b(bei|at|for|@|company|firma|unternehmen|arbeitgeber)\b/i.test(l)
        );
        const company = companyLine
          ? companyLine.replace(/^.*?[:\-@]\s*/, '').substring(0, 80)
          : 'Unknown Company';
        await jobApplicationAPI.create({
          company,
          role,
          notes: `Applied via AI Enhancement on ${new Date().toLocaleDateString()}. Job description:\n${jd.substring(0, 500)}`,
          status: 'applied',
          applied_date: new Date().toISOString().slice(0, 10),
          cv_id: parseInt(cvId),
        });
        showToast('📌 Job entry added to your Job Tracker (Applied)');
      } catch (trackerErr) {
        console.warn('Could not create job tracker entry:', trackerErr);
      }
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Apply failed';
      showToast(`❌ ${msg}`, 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleDiscardEnhancement = () => {
    // Revert preview to original (un-enhanced) data
    setCVData(JSON.parse(JSON.stringify(originalCVData)));
    setEnhancedCV(null);
    setEnhanceMsg('');
    setEnhanceStatus('');
  };

  // ── Save to Job Tracker ────────────────────────────────────────────────────────

  const openSaveJobForm = () => {
    // Pre-fill company and role from job description text
    const jd = jobDescription.trim();
    const lines = jd.split('\n').map(l => l.trim()).filter(Boolean);
    const role = lines[0]?.substring(0, 120) || '';
    const companyLine = lines.find(l => /\b(bei|at|for|@|company|firma|unternehmen|arbeitgeber)\b/i.test(l));
    const company = companyLine ? companyLine.replace(/^.*?[:\-@]\s*/, '').substring(0, 80) : '';
    setSaveJobRole(role);
    setSaveJobCompany(company);
    setSaveJobStatus('saved');
    setShowSaveJobForm(true);
  };

  const handleSaveToJobTracker = async (e) => {
    e.preventDefault();
    if (!saveJobCompany.trim() && !saveJobRole.trim()) {
      showToast('Please fill in at least company or role', 'error');
      return;
    }
    setSavingJob(true);
    try {
      await jobApplicationAPI.create({
        company: saveJobCompany.trim() || 'Unknown Company',
        role: saveJobRole.trim() || 'Unknown Role',
        status: saveJobStatus,
        notes: `Saved from AI Enhancement. Job description:\n${jobDescription.substring(0, 500)}`,
        applied_date: new Date().toISOString().slice(0, 10),
        cv_id: parseInt(cvId),
      });
      showToast('📌 Saved to Job Tracker!');
      setShowSaveJobForm(false);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not save to Job Tracker', 'error');
    } finally {
      setSavingJob(false);
    }
  };

  // ── PDF download ──────────────────────────────────────────────────────────────

  const handleDownloadPDF = async () => {
    try {
      showToast('Generating PDF…');
      const token = JSON.parse(localStorage.getItem('auth-store') || '{}')?.state?.token;
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/cvs/${cvId}/export/pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${cv?.title || 'CV'}_enhanced.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { showToast('PDF export failed', 'error'); }
  };

  // ── Sub-components ────────────────────────────────────────────────────────────

  const ScoreRing = ({ score }) => {
    const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626';
    const r = 28, circumference = 2 * Math.PI * r;
    const offset = circumference - (score / 100) * circumference;
    return (
      <div className="flex flex-col items-center">
        <svg width={72} height={72} viewBox="0 0 72 72" className="-rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="text-center -mt-14">
          <span className="text-xl font-bold text-gray-900">{score}%</span>
        </div>
        <p className="text-xs text-gray-500 mt-8 font-medium">Match Score</p>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white toast
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-14 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/cv-editor/${cvId}`)} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">AI Enhancement</h1>
            <p className="text-xs text-gray-500">{cv?.title}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI Powered
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/cv-editor/${cvId}`)}
            className="text-xs px-3 py-1.5 font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
            Edit CV
          </button>
          <button onClick={handleDownloadPDF}
            className="text-xs px-4 py-1.5 font-semibold text-white bg-primary hover:bg-primary-700 rounded-lg transition flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 112px)' }}>
        {/* Left panel */}
        <div className="w-[440px] flex-none border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Job description input */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Job Description</label>
              <p className="text-xs text-gray-500 mb-3">
                Paste the full job posting. Our AI will analyse your CV and offer two modes:
                keyword analysis or a full AI rewrite of key sections.
              </p>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={7}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-100 transition resize-none"
              />

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                {/* Analyze */}
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || enhancing || !jobDescription.trim()}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {analyzing ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Analyze Keywords
                    </>
                  )}
                </button>

                {/* Enhance with AI */}
                <button
                  onClick={handleEnhanceWithAI}
                  disabled={analyzing || enhancing || !jobDescription.trim()}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {enhancing ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Enhancing…
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Enhance with AI
                    </>
                  )}
                </button>
              </div>

              {/* Save to Job Tracker button */}
              {jobDescription.trim() && (
                <div className="mt-2">
                  {!showSaveJobForm ? (
                    <button
                      onClick={openSaveJobForm}
                      className="w-full py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      💾 Save to Job Tracker
                    </button>
                  ) : (
                    <form onSubmit={handleSaveToJobTracker} className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-amber-800 mb-1">📌 Save Job Opportunity</p>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Company</label>
                        <input
                          value={saveJobCompany}
                          onChange={e => setSaveJobCompany(e.target.value)}
                          placeholder="e.g. Google"
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Role</label>
                        <input
                          value={saveJobRole}
                          onChange={e => setSaveJobRole(e.target.value)}
                          placeholder="e.g. Software Engineer"
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Status</label>
                        <select
                          value={saveJobStatus}
                          onChange={e => setSaveJobStatus(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-amber-400"
                        >
                          <option value="saved">💾 Saved (Wishlist)</option>
                          <option value="applied">📤 Applied</option>
                          <option value="interview">🎯 Interview</option>
                        </select>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="submit" disabled={savingJob}
                          className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold text-xs rounded-lg transition">
                          {savingJob ? 'Saving…' : '✓ Save'}
                        </button>
                        <button type="button" onClick={() => setShowSaveJobForm(false)}
                          className="flex-1 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-xs rounded-lg transition">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* AI Enhancement Result Banner */}
            {enhanceMsg && (
              <div className={`rounded-xl p-4 border text-sm ${enhanceStatus === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                <p className="font-medium mb-1">{enhanceStatus === 'success' ? '✨ Enhancement Ready' : '⚠️ Enhancement Failed'}</p>
                <p className="text-xs leading-relaxed">{enhanceMsg}</p>

                {enhanceStatus === 'success' && enhancedCV && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleApplyAIChanges}
                      disabled={applying}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      {applying ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Saving…
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Apply Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDiscardEnhancement}
                      className="flex-1 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 font-semibold text-xs rounded-lg transition"
                    >
                      Discard
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Match Score */}
            {matchScore !== null && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-5">
                  <ScoreRing score={matchScore} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 mb-2">
                      {matchScore >= 70 ? '🎉 Strong match!' : matchScore >= 40 ? '⚡ Good potential' : '⚠️ Needs improvement'}
                    </p>
                    {matchedKeywords.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-green-700 mb-1">✓ Matched keywords</p>
                        <div className="flex flex-wrap gap-1">
                          {matchedKeywords.slice(0, 8).map((k, i) => (
                            <span key={i} className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {missingKeywords.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-1">✕ Missing keywords</p>
                        <div className="flex flex-wrap gap-1">
                          {missingKeywords.slice(0, 8).map((k, i) => (
                            <span key={i} className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Text Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">AI Keyword Suggestions</h3>
                  <span className="text-xs text-gray-500">{suggestions.length} suggestions</span>
                </div>
                <div className="space-y-3">
                  {suggestions.map((s, i) => (
                    <div key={i} className={`rounded-xl border p-4 transition ${appliedIds.has(i) ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.section}</span>
                          <h4 className="text-sm font-semibold text-gray-900 mt-0.5">{s.title}</h4>
                        </div>
                        {appliedIds.has(i) ? (
                          <span className="flex items-center gap-1 text-xs text-green-700 font-medium whitespace-nowrap">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Applied
                          </span>
                        ) : (
                          s.id && (
                            <button
                              onClick={() => handleApplySuggestion(s, i)}
                              className="text-xs px-3 py-1 bg-primary hover:bg-primary-700 text-white font-semibold rounded-lg transition whitespace-nowrap"
                            >
                              Apply
                            </button>
                          )
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{s.description}</p>
                      <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-700 border border-gray-100">
                        <span className="font-medium text-gray-900">Suggestion: </span>{s.suggestion || s.suggestion_text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!analyzing && !enhancing && suggestions.length === 0 && !matchScore && !enhanceMsg && (
              <div className="text-center py-10 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
                <p className="text-sm font-medium mb-1">Two ways to enhance your CV</p>
                <p className="text-xs">
                  <strong>Analyze Keywords</strong> → score + tips<br />
                  <strong>Enhance with AI</strong> → rewrites Experiences, Projects & Skills
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="flex-1 bg-gray-200 overflow-auto flex flex-col items-center pt-6 pb-10">
          <div className="mb-3 text-xs text-gray-500 font-medium flex items-center gap-2">
            Live Preview
            {enhancedCV && (
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                ✨ AI Enhanced — not saved yet
              </span>
            )}
          </div>
          <div style={{ width: 794 * previewScale + 32 }}>
            <div style={{ width: 794, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
              <CVPreview data={cvData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVCustomizePage;
