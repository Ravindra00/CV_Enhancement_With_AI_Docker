import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coverLetterAPI } from '../services/api';

const CoverLetterViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef();

    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [letter, setLetter] = useState(null);
    const [letterText, setLetterText] = useState('');
    const [toast, setToast] = useState(null);
    const [error, setError] = useState(null);

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
            setError(null);

            console.log('Fetching cover letter with ID:', id); // Debug log

            const res = await coverLetterAPI.get(id);
            console.log('Cover letter API response:', res.data); // Debug log

            if (!res.data) {
                setError('No letter data received from server');
                setLoading(false);
                return;
            }

            setLetter(res.data);

            // Extract text from content - handle multiple formats
            let text = '';
            if (res.data.content) {
                if (typeof res.data.content === 'string') {
                    text = res.data.content;
                } else if (typeof res.data.content === 'object') {
                    // Try different possible property names
                    text = res.data.content.text ||
                        res.data.content.content ||
                        res.data.content.body ||
                        JSON.stringify(res.data.content);
                }
            }

            setLetterText(text || '(No content available)');
            setError(null);
        } catch (err) {
            console.error('Error fetching cover letter:', err);
            setError(`Failed to load cover letter: ${err.message}`);
            showToast('Failed to load cover letter', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Download as Text File
    const downloadAsText = () => {
        try {
            setExporting(true);

            const element = document.createElement('a');
            const file = new Blob([letterText], { type: 'text/plain' });
            element.href = URL.createObjectURL(file);
            element.download = `${letter.title?.replace(/\s+/g, '_') || 'cover_letter'}.txt`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            showToast('Cover letter downloaded as text!');
        } catch (err) {
            showToast('Failed to download text file', 'error');
        } finally {
            setExporting(false);
        }
    };

    // ✅ Download as PDF
    const downloadAsPDF = () => {
        try {
            setExporting(true);

            // Create a new window with the letter content
            const printWindow = window.open('', '', 'height=600,width=800');

            // Format the content nicely for PDF
            const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${letter?.title || 'Cover Letter'}</title>
            <style>
              body {
                font-family: 'Calibri', 'Arial', sans-serif;
                line-height: 1.6;
                padding: 40px;
                color: #333;
              }
              .header {
                margin-bottom: 30px;
                text-align: center;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
              }
              .title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
              }
              .content {
                white-space: pre-wrap;
                word-wrap: break-word;
              }
              .footer {
                margin-top: 40px;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">${letter?.title || 'Cover Letter'}</div>
              <div>Generated on ${letter?.created_at ? new Date(letter.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</div>
            </div>
            <div class="content">${letterText}</div>
            <div class="footer">
              <p>This cover letter was generated using CV Enhancer AI</p>
            </div>
          </body>
        </html>
      `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();

            // Trigger print dialog (which allows save as PDF)
            setTimeout(() => {
                printWindow.print();
            }, 250);

            showToast('Print dialog opened - select "Save as PDF"');
        } catch (err) {
            showToast('Failed to generate PDF', 'error');
        } finally {
            setExporting(false);
        }
    };

    // ✅ Copy to Clipboard
    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(letterText);
            showToast('Cover letter copied to clipboard!');
        } catch (err) {
            showToast('Failed to copy to clipboard', 'error');
        }
    };

    // ✅ Print
    const handlePrint = () => {
        const printWindow = window.open('', '', 'height=600,width=800');

        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${letter?.title || 'Cover Letter'}</title>
          <style>
            body {
              font-family: 'Calibri', 'Arial', sans-serif;
              line-height: 1.6;
              padding: 40px;
              color: #333;
            }
            .header {
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${letter?.title || 'Cover Letter'}</div>
          </div>
          <div class="content">${letterText}</div>
        </body>
      </html>
    `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <svg className="animate-spin w-8 h-8 text-red-600 mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="mt-4 text-gray-600">Loading cover letter...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <button
                    onClick={() => navigate('/cover-letters')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
                >
                    ← Back to Cover Letters
                </button>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
                    <h2 className="font-bold mb-2">Error Loading Cover Letter</h2>
                    <p>{error}</p>
                    <p className="mt-4 text-sm">ID: {id}</p>
                </div>
            </div>
        );
    }

    if (!letter) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <button
                    onClick={() => navigate('/cover-letters')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
                >
                    ← Back to Cover Letters
                </button>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-700">
                    Cover letter not found
                </div>
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
                        <h1 className="text-3xl font-bold text-gray-900">{letter.title || 'Cover Letter'}</h1>
                        <p className="text-gray-500 mt-1">
                            Created on {letter.created_at ? new Date(letter.created_at).toLocaleDateString() : 'Unknown Date'}
                        </p>
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

                {/* Action Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <button
                        onClick={copyToClipboard}
                        className="py-2 px-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2"
                        title="Copy to clipboard"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span className="hidden sm:inline">Copy</span>
                    </button>

                    <button
                        onClick={handlePrint}
                        className="py-2 px-3 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition flex items-center justify-center gap-2"
                        title="Print"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4H9a2 2 0 01-2-2v-4a2 2 0 012-2h6a2 2 0 012 2v4a2 2 0 01-2 2zm0 0h2a2 2 0 002-2v-4a2 2 0 00-2-2h-2.5M9 11l3 3m0 0l3-3m-3 3V8" />
                        </svg>
                        <span className="hidden sm:inline">Print</span>
                    </button>

                    <button
                        onClick={downloadAsText}
                        disabled={exporting}
                        className="py-2 px-3 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
                        title="Download as text file"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8l-6 1m6-1l6-1" />
                        </svg>
                        <span className="hidden sm:inline">TXT</span>
                    </button>

                    <button
                        onClick={downloadAsPDF}
                        disabled={exporting}
                        className="py-2 px-3 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
                        title="Export as PDF"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8l-6 1m6-1l6-1" />
                        </svg>
                        <span className="hidden sm:inline">PDF</span>
                    </button>
                </div>

                {/* Document View */}
                <div
                    ref={printRef}
                    className="bg-white rounded-xl p-12 shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0"
                >
                    {/* Letter Content - Formatted for reading */}
                    <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap font-serif text-gray-800 leading-relaxed text-justify">
                            {letterText || '(No content available)'}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-6 flex gap-3 justify-center sm:justify-start">
                    <button
                        onClick={() => navigate(`/cover-letters/${id}/edit`)}
                        className="py-2 px-6 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                    >
                        ✎ Edit Letter
                    </button>
                    <button
                        onClick={() => navigate('/cover-letters')}
                        className="py-2 px-6 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                    >
                        ← Back to List
                    </button>
                </div>

                {/* Info */}
                {letter?.content?.generated_with_ai && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        <p className="font-semibold mb-1">🤖 AI Generated</p>
                        <p>This cover letter was generated using AI based on your CV and a job description.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoverLetterViewPage;