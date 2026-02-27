import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coverLetterAPI } from '../services/api';

const CoverLetterEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [letter, setLetter] = useState(null);
  const [title, setTitle] = useState('');
  const [letterText, setLetterText] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchLetter();
  }, [id]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLetter = async () => {
    try {
      setLoading(true);
      const res = await coverLetterAPI.get(id);
      
      console.log('📖 Fetched letter:', JSON.stringify(res.data, null, 2));
      
      // ✅ FIX: Extract text from content object properly
      setLetter(res.data);
      setTitle(res.data.title);
      
      // Extract the text content
      let text = '';
      if (typeof res.data.content === 'string') {
        // If content is a plain string
        text = res.data.content;
      } else if (res.data.content && typeof res.data.content === 'object') {
        // If content is an object, get the text field
        text = res.data.content.text || '';
      }
      
      console.log('📝 Extracted text:', text.substring(0, 100) + '...');
      setLetterText(text);
      
    } catch (err) {
      console.error('❌ Error fetching letter:', err);
      showToast('Failed to load cover letter', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveLetter = async () => {
    if (!title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }
    if (!letterText.trim()) {
      showToast('Cover letter cannot be empty', 'error');
      return;
    }

    try {
      setSaving(true);
      console.log('💾 Saving letter...');
      console.log('   Title:', title);
      console.log('   Text length:', letterText.length);
      
      // ✅ FIX: Send the FULL content object back, not empty!
      // The backend needs the complete structure
      const updateData = {
        title: title,
        content: {
          text: letterText,
          generated_with_ai: letter?.content?.generated_with_ai || false,
          job_description: letter?.content?.job_description || '',
          created_at: letter?.content?.created_at || new Date().toISOString()
        }
      };
      
      console.log('📤 Sending update:', JSON.stringify(updateData, null, 2));
      
      const res = await coverLetterAPI.update(id, updateData);
      
      console.log('✅ Update response:', JSON.stringify(res.data, null, 2));
      showToast('Cover letter saved successfully!');
      
      // Refresh the letter to confirm save
      setTimeout(() => {
        fetchLetter();
      }, 500);
      
    } catch (err) {
      console.error('❌ Error saving:', err.response?.data || err);
      showToast(err.response?.data?.detail || 'Failed to save cover letter', 'error');
    } finally {
      setSaving(false);
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
            <h1 className="text-3xl font-bold text-gray-900">Edit Cover Letter</h1>
            <p className="text-gray-500 mt-1">Modify and save your cover letter</p>
          </div>
          <button
            onClick={() => navigate('/cover-letters')}
            className="text-gray-600 hover:text-gray-900 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Editor */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          {/* Title Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Application for Senior Developer at TechCorp"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Letter Content Editor */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cover Letter</label>
            <textarea
              value={letterText}
              onChange={(e) => setLetterText(e.target.value)}
              placeholder="Your cover letter text..."
              rows={15}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">{letterText.length} characters</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={saveLetter}
              disabled={saving || !title.trim() || !letterText.trim()}
              className="flex-1 py-2 px-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {saving ? '💾 Saving...' : '✓ Save Changes'}
            </button>
            <button
              onClick={() => navigate('/cover-letters')}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              ← Back to List
            </button>
          </div>
        </div>

        {/* Info */}
        {letter && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <p className="font-semibold mb-1">💡 Info</p>
            <p>This cover letter was generated on {new Date(letter.created_at).toLocaleDateString()}</p>
            {letter.content?.generated_with_ai && (
              <p className="text-blue-700 mt-1">🤖 Generated with AI</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoverLetterEditorPage;