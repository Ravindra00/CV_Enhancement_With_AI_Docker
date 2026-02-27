import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { cvAPI, coverLetterAPI } from '../services/api';

const CoverLetterGeneratorPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cvId = parseInt(searchParams.get('cvId')) || null;

  const [cv, setCV] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [coverLetterTitle, setCoverLetterTitle] = useState('AI Generated Cover Letter');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [toast, setToast] = useState(null);

  const [generatedLetterId, setGeneratedLetterId] = useState(null); // To track if the letter has been saved  

  const generateAndSaveCoverLetter = async () => {
    if (!jobDescription.trim()) {
      showToast('Please enter a job description', 'error');
      return;
    }
    if (!cvId) {
      showToast('CV not selected', 'error');
      return;
    }

    try {
      setGenerating(true);
      const res = await coverLetterAPI.generateWithAI(cvId, jobDescription, coverLetterTitle);
      const letterText = res.data.content?.text || res.data.content;
      if (!letterText) {
        showToast('Error: No content in response', 'error');
        return;
      }
      setGeneratedLetter(letterText);

      // Save the generated letter immediately
      const saveRes = await coverLetterAPI.create({
        cv_id: cvId,
        title: coverLetterTitle,
        content: { text: letterText }
      });
      setGeneratedLetterId(saveRes.data.id); // Store the ID of the saved letter
      showToast('Cover letter generated and saved successfully!');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to generate cover letter', 'error');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (cvId) {
      fetchCV();
    }
  }, [cvId]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCV = async () => {
    try {
      setLoading(true);
      const res = await cvAPI.getOne(cvId);
      setCV(res.data);
    } catch (err) {
      showToast('Failed to load CV', 'error');
    } finally {
      setLoading(false);
    }
  };

  const extractJobDescriptionFromUrl = async () => {
    if (!jobUrl.trim()) {
      showToast('Please enter a job URL', 'error');
      return;
    }
    try {
      setGenerating(true);
      const res = await coverLetterAPI.extractFromURL(jobUrl);
      setJobDescription(res.data.job_description);
      showToast('Job description extracted successfully');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to extract job description', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const generateCoverLetter = async () => {
    if (!jobDescription.trim()) {
      showToast('Please enter a job description', 'error');
      return;
    }
    if (!cvId) {
      showToast('CV not selected', 'error');
      return;
    }

    try {
      setGenerating(true);
      const res = await coverLetterAPI.generateWithAI(cvId, jobDescription, coverLetterTitle);
      // setGeneratedLetter(res.data.content?.text || res.data.content || '');

      // Backend returns { text: "...", generated_with_ai: true }
      const letterText = res.data.content?.text || res.data.content;
      if (!letterText) {
        showToast('Error: No content in response', 'error');
        return;
      }
      setGeneratedLetter(letterText);
      setGeneratedLetterId(res.data.id);
      showToast('Cover letter generated successfully!');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to generate cover letter', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const saveCoverLetter = async () => {
    if (!generatedLetter.trim()) {
      showToast('No cover letter to save', 'error');
      return;
    }
    try {
      setGenerating(true);
      const saveRes = await coverLetterAPI.create({
        cv_id: cvId,
        title: coverLetterTitle,
        content: { text: typeof generatedLetter === 'string' ? generatedLetter : generatedLetter.text || '' }
      });
      setGeneratedLetterId(saveRes.data.id);
      showToast('Cover letter saved!');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to save', 'error');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {toast && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Generate Cover Letter</h1>
            <p className="text-gray-500 mt-1">Using AI with {cv?.title}</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-900 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input Section */}
          <div className="space-y-6">
            {/* Job Description Input */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Description</h2>

              {/* URL Input Option */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Extract from URL (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={jobUrl}
                    onChange={e => setJobUrl(e.target.value)}
                    placeholder="https://linkedin.com/jobs/..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <button
                    onClick={extractJobDescriptionFromUrl}
                    disabled={generating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {generating ? 'Extracting...' : 'Extract'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Supports LinkedIn, Indeed, and similar job boards</p>
              </div>

              {/* Text Textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Or Paste Job Description</label>
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                />
              </div>
            </div>

            {/* Cover Letter Title */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cover Letter Title</h2>
              <input
                type="text"
                value={coverLetterTitle}
                onChange={e => setCoverLetterTitle(e.target.value)}
                placeholder="e.g. Application for Senior Developer at TechCorp"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={generateAndSaveCoverLetter}
              disabled={generating || !jobDescription.trim() || !cvId}
              className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating with AI...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate with AI
                </>
              )}
            </button>
          </div>

          {/* Right: Preview Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 h-fit sticky top-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>

            {/* {generatedLetter ? (
              <>
                <div className="prose prose-sm max-w-none mb-4 bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {generatedLetter}
                </div>
                <button
                  onClick={saveCoverLetter}
                  disabled={generating}
                  className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 transition"
                >
                  {generating ? 'Saving...' : 'Save Cover Letter'}
                </button>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Enter a job description and click "Generate with AI" to see the preview</p>
              </div>
            )} */}
            {generatedLetter ? (
              <>
                {/* FIXED: Display the text, not the object */}
                <div className="prose prose-sm max-w-none mb-4 bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {/* ✅ FIX: Get the text directly */}
                  {typeof generatedLetter === 'string'
                    ? generatedLetter
                    : generatedLetter.content_text || generatedLetter.text || JSON.stringify(generatedLetter)}
                </div>
                { /* rest of the button */}

                <div className="space-y-2">
                  {/* Save cover letter */}
                  <button
                    onClick={saveCoverLetter}
                    disabled={generating}
                    className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    {generating ? 'Saving...' : 'Save Cover Letter'}
                  </button>
                  {/* View saved letter */}
                  {generatedLetterId && (
                    <button
                      onClick={() => navigate(`/cover-letters/${generatedLetterId}`)}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                      ✎ Edit in Full Editor
                    </button>
                  )}

                  {/* Back to list */}
                  <button
                    onClick={() => navigate('/cover-letters')}
                    className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                  >
                    ✓ View All Letters
                  </button>

                  {/* Generate another */}
                  <button
                    onClick={() => {
                      setJobDescription('');
                      setJobUrl('');
                      setGeneratedLetter('');
                      setGeneratedLetterId(null);
                      setCoverLetterTitle('AI Generated Cover Letter');
                    }}
                    className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                  >
                    ↻ Generate Another
                  </button>
                </div>
              </>) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Enter a job description and click "Generate with AI" to see the preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterGeneratorPage;
