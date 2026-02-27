// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { Download, Edit2, Trash2, ChevronLeft } from 'lucide-react';
// import { cvAPI } from '../services/api';

// const CVViewPage = () => {
//     const { cvId } = useParams();
//     const navigate = useNavigate();
//     const printRef = useRef();

//     const [loading, setLoading] = useState(true);
//     const [exporting, setExporting] = useState(false);
//     const [cv, setCV] = useState(null);
//     const [toast, setToast] = useState(null);

//     useEffect(() => {
//         fetchCV();
//     }, [cvId]);

//     const showToast = (msg, type = 'success') => {
//         setToast({ msg, type });
//         setTimeout(() => setToast(null), 3000);
//     };

//     const fetchCV = async () => {
//         try {
//             setLoading(true);
//             const res = await cvAPI.get(cvId);
//             setCV(res.data);
//         } catch (err) {
//             showToast('Failed to load CV', 'error');
//             console.error(err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     // ✅ Download as PDF using Print Dialog
//     const downloadAsPDF = () => {
//         try {
//             setExporting(true);

//             const printWindow = window.open('', '', 'height=900,width=1000');
//             const cvName = cv?.personal_info?.name || 'CV';

//             const htmlContent = `
//         <!DOCTYPE html>
//         <html>
//           <head>
//             <title>${cvName} - CV</title>
//             <style>
//               body {
//                 font-family: 'Calibri', 'Arial', sans-serif;
//                 line-height: 1.5;
//                 padding: 20px;
//                 color: #333;
//                 background: white;
//               }
//               .container { max-width: 900px; margin: 0 auto; }
//               .header {
//                 margin-bottom: 20px;
//                 padding-bottom: 15px;
//                 border-bottom: 2px solid #c41e3a;
//               }
//               .name {
//                 font-size: 28px;
//                 font-weight: bold;
//                 color: #000;
//                 margin: 0;
//               }
//               .title {
//                 font-size: 16px;
//                 color: #c41e3a;
//                 margin: 5px 0;
//               }
//               .contact {
//                 font-size: 12px;
//                 color: #666;
//                 margin-top: 5px;
//               }
//               .section-title {
//                 font-size: 14px;
//                 font-weight: bold;
//                 color: #fff;
//                 background-color: #c41e3a;
//                 padding: 8px 12px;
//                 margin: 20px 0 10px 0;
//               }
//               .section-content {
//                 margin-bottom: 15px;
//               }
//               .job-entry {
//                 margin-bottom: 12px;
//               }
//               .job-title {
//                 font-weight: bold;
//                 font-size: 13px;
//                 color: #000;
//               }
//               .company {
//                 color: #c41e3a;
//                 font-weight: bold;
//                 font-size: 12px;
//               }
//               .dates {
//                 color: #666;
//                 font-size: 11px;
//               }
//               .description {
//                 font-size: 12px;
//                 margin-top: 3px;
//                 line-height: 1.4;
//               }
//               .skills-container {
//                 display: grid;
//                 grid-template-columns: 1fr 1fr;
//                 gap: 10px;
//               }
//               .skill-item {
//                 font-size: 12px;
//                 padding: 4px 0;
//               }
//               .skill-bar {
//                 width: 100%;
//                 height: 8px;
//                 background: #e0e0e0;
//                 margin-top: 2px;
//                 border-radius: 2px;
//               }
//               .skill-bar-fill {
//                 height: 100%;
//                 background: #c41e3a;
//                 border-radius: 2px;
//               }
//               .summary {
//                 font-size: 12px;
//                 line-height: 1.5;
//                 margin-bottom: 15px;
//               }
//               @media print {
//                 body { margin: 0; padding: 0; }
//                 .container { padding: 0; }
//               }
//             </style>
//           </head>
//           <body>
//             <div class="container">
//               ${cv?.personal_info ? `
//                 <div class="header">
//                   <p class="name">${cv.personal_info.name || ''}</p>
//                   <p class="title">${cv.personal_info.title || ''}</p>
//                   <div class="contact">
//                     ${cv.personal_info.email ? `Email: ${cv.personal_info.email}` : ''}
//                     ${cv.personal_info.phone ? ` | Phone: ${cv.personal_info.phone}` : ''}
//                     ${cv.personal_info.location ? ` | ${cv.personal_info.location}` : ''}
//                     ${cv.personal_info.linkedin ? `<br>LinkedIn: ${cv.personal_info.linkedin}` : ''}
//                   </div>
//                 </div>
//                 ${cv.personal_info.summary ? `
//                   <div class="summary">
//                     ${cv.personal_info.summary}
//                   </div>
//                 ` : ''}
//               ` : ''}

//               ${cv?.experiences && cv.experiences.length > 0 ? `
//                 <div class="section-title">WORK EXPERIENCE</div>
//                 <div class="section-content">
//                   ${cv.experiences.map((exp, idx) => `
//                     <div class="job-entry">
//                       <div class="job-title">${exp.position || ''}</div>
//                       <div class="company">${exp.company || ''}</div>
//                       <div class="dates">${exp.startDate || ''} – ${exp.endDate || ''}</div>
//                       ${exp.location ? `<div class="dates">${exp.location}</div>` : ''}
//                       ${exp.description ? `<div class="description">${exp.description}</div>` : ''}
//                       ${exp.skills && exp.skills.length > 0 ? `
//                         <div class="description" style="margin-top: 5px;">
//                           <strong>Skills:</strong> ${exp.skills.join(', ')}
//                         </div>
//                       ` : ''}
//                     </div>
//                   `).join('')}
//                 </div>
//               ` : ''}

//               ${cv?.educations && cv.educations.length > 0 ? `
//                 <div class="section-title">EDUCATION</div>
//                 <div class="section-content">
//                   ${cv.educations.map((edu, idx) => `
//                     <div class="job-entry">
//                       <div class="job-title">${edu.degree || ''} in ${edu.field || ''}</div>
//                       <div class="company">${edu.institution || ''}</div>
//                       <div class="dates">${edu.startDate || ''} – ${edu.endDate || ''}</div>
//                       ${edu.location ? `<div class="dates">${edu.location}</div>` : ''}
//                       ${edu.description ? `<div class="description">${edu.description}</div>` : ''}
//                     </div>
//                   `).join('')}
//                 </div>
//               ` : ''}

//               ${cv?.skills && cv.skills.length > 0 ? `
//                 <div class="section-title">SKILLS</div>
//                 <div class="section-content">
//                   <div class="skills-container">
//                     ${cv.skills.map((skill, idx) => `
//                       <div class="skill-item">
//                         <div><strong>${skill.name || ''}</strong> <span style="color: #999; font-size: 10px;">${skill.level || ''}</span></div>
//                         <div class="skill-bar">
//                           <div class="skill-bar-fill" style="width: ${skill.level === 'Expert' ? '100%' :
//                     skill.level === 'Advanced' ? '80%' :
//                         skill.level === 'Intermediate' ? '60%' : '40%'
//                 }"></div>
//                         </div>
//                       </div>
//                     `).join('')}
//                   </div>
//                 </div>
//               ` : ''}

//               ${cv?.certifications && cv.certifications.length > 0 ? `
//                 <div class="section-title">CERTIFICATIONS</div>
//                 <div class="section-content">
//                   ${cv.certifications.map((cert, idx) => `
//                     <div class="job-entry">
//                       <div class="job-title">${cert.name || ''}</div>
//                       <div class="dates">${cert.issuer || ''} • ${cert.issueDate || ''}</div>
//                     </div>
//                   `).join('')}
//                 </div>
//               ` : ''}

//               ${cv?.languages && cv.languages.length > 0 ? `
//                 <div class="section-title">LANGUAGES</div>
//                 <div class="section-content">
//                   <div style="font-size: 12px;">
//                     ${cv.languages.map((lang, idx) => `
//                       <div style="margin-bottom: 5px;">
//                         <strong>${lang.language}</strong> - ${lang.proficiency}
//                       </div>
//                     `).join('')}
//                   </div>
//                 </div>
//               ` : ''}

//               ${cv?.projects && cv.projects.length > 0 ? `
//                 <div class="section-title">PROJECTS</div>
//                 <div class="section-content">
//                   ${cv.projects.map((proj, idx) => `
//                     <div class="job-entry">
//                       <div class="job-title">${proj.name || ''}</div>
//                       ${proj.description ? `<div class="description">${proj.description}</div>` : ''}
//                       ${proj.technologies && proj.technologies.length > 0 ? `
//                         <div class="description"><strong>Tech:</strong> ${proj.technologies.join(', ')}</div>
//                       ` : ''}
//                     </div>
//                   `).join('')}
//                 </div>
//               ` : ''}
//             </div>
//           </body>
//         </html>
//       `;

//             printWindow.document.write(htmlContent);
//             printWindow.document.close();

//             // Trigger print dialog
//             setTimeout(() => {
//                 printWindow.print();
//                 setTimeout(() => printWindow.close(), 100);
//             }, 250);

//             showToast('Print dialog opened - select "Save as PDF"');
//         } catch (err) {
//             showToast('Failed to generate PDF', 'error');
//             console.error(err);
//         } finally {
//             setExporting(false);
//         }
//     };

//     // ✅ Download as Text
//     const downloadAsText = () => {
//         try {
//             setExporting(true);

//             let text = '';
//             if (cv?.personal_info) {
//                 text += `${cv.personal_info.name}\n`;
//                 text += `${cv.personal_info.title}\n\n`;
//                 text += `Contact: ${cv.personal_info.email} | ${cv.personal_info.phone}\n\n`;
//             }

//             if (cv?.personal_info?.summary) {
//                 text += `PROFILE\n${cv.personal_info.summary}\n\n`;
//             }

//             if (cv?.experiences?.length > 0) {
//                 text += `WORK EXPERIENCE\n`;
//                 cv.experiences.forEach(exp => {
//                     text += `${exp.position} at ${exp.company}\n`;
//                     text += `${exp.startDate} - ${exp.endDate}\n`;
//                     text += `${exp.description}\n\n`;
//                 });
//             }

//             if (cv?.educations?.length > 0) {
//                 text += `EDUCATION\n`;
//                 cv.educations.forEach(edu => {
//                     text += `${edu.degree} in ${edu.field} from ${edu.institution}\n`;
//                     text += `${edu.startDate} - ${edu.endDate}\n\n`;
//                 });
//             }

//             if (cv?.skills?.length > 0) {
//                 text += `SKILLS\n`;
//                 cv.skills.forEach(skill => {
//                     text += `${skill.name} (${skill.level})\n`;
//                 });
//             }

//             const element = document.createElement('a');
//             const file = new Blob([text], { type: 'text/plain' });
//             element.href = URL.createObjectURL(file);
//             element.download = `${cv?.title || 'CV'}.txt`;
//             document.body.appendChild(element);
//             element.click();
//             document.body.removeChild(element);

//             showToast('CV downloaded as text!');
//         } catch (err) {
//             showToast('Failed to download text file', 'error');
//         } finally {
//             setExporting(false);
//         }
//     };

//     // ✅ Copy to Clipboard
//     const copyToClipboard = async () => {
//         try {
//             let text = cv?.personal_info?.name + '\n';
//             if (cv?.personal_info?.summary) text += cv.personal_info.summary + '\n';

//             cv?.experiences?.forEach(exp => {
//                 text += `\n${exp.position} at ${exp.company}\n${exp.description}`;
//             });

//             await navigator.clipboard.writeText(text);
//             showToast('CV content copied to clipboard!');
//         } catch (err) {
//             showToast('Failed to copy to clipboard', 'error');
//         }
//     };

//     const handleDelete = async () => {
//         if (!window.confirm('Are you sure you want to delete this CV?')) return;
//         try {
//             await cvAPI.delete(cvId);
//             showToast('CV deleted successfully');
//             navigate('/dashboard');
//         } catch (err) {
//             showToast('Failed to delete CV', 'error');
//         }
//     };

//     if (loading) {
//         return (
//             <div className="min-h-screen flex items-center justify-center bg-gray-50">
//                 <div className="text-center">
//                     <svg className="animate-spin w-12 h-12 text-red-600 mx-auto" fill="none" viewBox="0 0 24 24">
//                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
//                     </svg>
//                     <p className="mt-4 text-gray-600">Loading CV...</p>
//                 </div>
//             </div>
//         );
//     }

//     if (!cv) {
//         return (
//             <div className="min-h-screen bg-gray-50 p-8">
//                 <button
//                     onClick={() => navigate('/dashboard')}
//                     className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
//                 >
//                     <ChevronLeft size={20} />
//                     Back to Dashboard
//                 </button>
//                 <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
//                     CV not found
//                 </div>
//             </div>
//         );
//     }

//     const { personal_info, experiences, educations, skills, certifications, languages, projects } = cv;

//     return (
//         <div className="min-h-screen bg-gray-50">
//             {toast && (
//                 <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
//                     {toast.msg}
//                 </div>
//             )}

//             {/* Header */}
//             <div className="bg-white border-b sticky top-0 z-10">
//                 <div className="max-w-4xl mx-auto px-8 py-4">
//                     <div className="flex items-center justify-between gap-4">
//                         <button
//                             onClick={() => navigate('/dashboard')}
//                             className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
//                         >
//                             <ChevronLeft size={20} />
//                             Back
//                         </button>
//                         <h1 className="flex-1 text-2xl font-bold text-gray-900">
//                             {cv.title || 'CV'}
//                         </h1>
//                         <div className="flex gap-3">
//                             <button
//                                 onClick={copyToClipboard}
//                                 className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//                                 title="Copy to clipboard"
//                             >
//                                 📋 Copy
//                             </button>
//                             <button
//                                 onClick={downloadAsText}
//                                 disabled={exporting}
//                                 className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
//                             >
//                                 📄 TXT
//                             </button>
//                             <button
//                                 onClick={downloadAsPDF}
//                                 disabled={exporting}
//                                 className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
//                             >
//                                 <Download size={16} />
//                                 PDF
//                             </button>
//                             <button
//                                 onClick={() => navigate(`/cv/${cvId}/edit`)}
//                                 className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
//                             >
//                                 <Edit2 size={16} />
//                                 Edit
//                             </button>
//                             <button
//                                 onClick={handleDelete}
//                                 className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
//                             >
//                                 <Trash2 size={16} />
//                                 Delete
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* CV Content */}
//             <div ref={printRef} className="max-w-4xl mx-auto p-8">
//                 {/* Personal Info */}
//                 {personal_info && (
//                     <div className="bg-white rounded-lg shadow-sm p-8 mb-6 border-l-4 border-red-600">
//                         <h2 className="text-3xl font-bold text-gray-900">{personal_info.name}</h2>
//                         <p className="text-lg text-red-600 font-semibold">{personal_info.title}</p>

//                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
//                             {personal_info.email && <div><p className="text-gray-600">Email</p><p className="font-medium">{personal_info.email}</p></div>}
//                             {personal_info.phone && <div><p className="text-gray-600">Phone</p><p className="font-medium">{personal_info.phone}</p></div>}
//                             {personal_info.location && <div><p className="text-gray-600">Location</p><p className="font-medium">{personal_info.location}</p></div>}
//                             {personal_info.linkedin && <div><p className="text-gray-600">LinkedIn</p><a href={personal_info.linkedin} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">Profile</a></div>}
//                         </div>

//                         {personal_info.summary && (
//                             <div className="mt-6 pt-6 border-t">
//                                 <p className="text-gray-700 leading-relaxed">{personal_info.summary}</p>
//                             </div>
//                         )}
//                     </div>
//                 )}

//                 {/* Experience */}
//                 {experiences && experiences.length > 0 && (
//                     <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
//                         <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
//                             <span className="w-1 h-6 bg-red-600"></span>
//                             Work Experience
//                         </h3>
//                         <div className="space-y-6">
//                             {experiences.map((exp, idx) => (
//                                 <div key={idx} className="pb-6 border-b last:border-b-0">
//                                     <div className="flex justify-between items-start mb-2">
//                                         <div>
//                                             <h4 className="text-lg font-bold text-gray-900">{exp.position}</h4>
//                                             <p className="text-red-600 font-medium">{exp.company}</p>
//                                         </div>
//                                         <span className="text-sm text-gray-600 whitespace-nowrap ml-4">{exp.startDate} – {exp.endDate}</span>
//                                     </div>
//                                     {exp.location && <p className="text-sm text-gray-600 mb-2">{exp.location}</p>}
//                                     {exp.description && <p className="text-gray-700 mb-3">{exp.description}</p>}
//                                     {exp.skills && exp.skills.length > 0 && (
//                                         <div className="flex flex-wrap gap-2">
//                                             {exp.skills.map((skill, sidx) => (
//                                                 <span key={sidx} className="px-3 py-1 bg-red-50 text-red-700 text-xs rounded-full">
//                                                     {skill}
//                                                 </span>
//                                             ))}
//                                         </div>
//                                     )}
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 )}

//                 {/* Education */}
//                 {educations && educations.length > 0 && (
//                     <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
//                         <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
//                             <span className="w-1 h-6 bg-red-600"></span>
//                             Education
//                         </h3>
//                         <div className="space-y-6">
//                             {educations.map((edu, idx) => (
//                                 <div key={idx} className="pb-6 border-b last:border-b-0">
//                                     <div className="flex justify-between items-start mb-2">
//                                         <div>
//                                             <h4 className="text-lg font-bold text-gray-900">{edu.degree} in {edu.field}</h4>
//                                             <p className="text-red-600 font-medium">{edu.institution}</p>
//                                         </div>
//                                         <span className="text-sm text-gray-600 whitespace-nowrap ml-4">{edu.startDate} – {edu.endDate}</span>
//                                     </div>
//                                     {edu.location && <p className="text-sm text-gray-600">{edu.location}</p>}
//                                     {edu.description && <p className="text-gray-700 mt-2">{edu.description}</p>}
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 )}

//                 {/* Skills */}
//                 {skills && skills.length > 0 && (
//                     <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
//                         <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
//                             <span className="w-1 h-6 bg-red-600"></span>
//                             Skills
//                         </h3>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                             {skills.map((skill, idx) => (
//                                 <div key={idx}>
//                                     <div className="flex justify-between items-center mb-2">
//                                         <h4 className="font-bold text-gray-900">{skill.name}</h4>
//                                         <span className="text-xs text-gray-600">{skill.level}</span>
//                                     </div>
//                                     <div className="w-full bg-gray-200 rounded-full h-2">
//                                         <div
//                                             className="bg-red-600 h-2 rounded-full"
//                                             style={{
//                                                 width: skill.level === 'Expert' ? '100%' : skill.level === 'Advanced' ? '80%' : skill.level === 'Intermediate' ? '60%' : '40%',
//                                             }}
//                                         ></div>
//                                     </div>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 )}

//                 {/* Certifications */}
//                 {certifications && certifications.length > 0 && (
//                     <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
//                         <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
//                             <span className="w-1 h-6 bg-red-600"></span>
//                             Certifications
//                         </h3>
//                         <div className="space-y-4">
//                             {certifications.map((cert, idx) => (
//                                 <div key={idx} className="pb-4 border-b last:border-b-0">
//                                     <h4 className="font-bold text-gray-900">{cert.name}</h4>
//                                     <p className="text-sm text-gray-600">{cert.issuer} • {cert.issueDate} {cert.expiryDate && `– ${cert.expiryDate}`}</p>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 )}

//                 {/* Languages */}
//                 {languages && languages.length > 0 && (
//                     <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
//                         <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
//                             <span className="w-1 h-6 bg-red-600"></span>
//                             Languages
//                         </h3>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             {languages.map((lang, idx) => (
//                                 <div key={idx} className="flex justify-between items-center">
//                                     <span className="font-medium text-gray-900">{lang.language}</span>
//                                     <span className="text-sm text-gray-600">{lang.proficiency}</span>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 )}

//                 {/* Projects */}
//                 {projects && projects.length > 0 && (
//                     <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
//                         <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
//                             <span className="w-1 h-6 bg-red-600"></span>
//                             Projects
//                         </h3>
//                         <div className="space-y-6">
//                             {projects.map((proj, idx) => (
//                                 <div key={idx} className="pb-6 border-b last:border-b-0">
//                                     <h4 className="text-lg font-bold text-gray-900 mb-2">{proj.name}</h4>
//                                     {proj.description && <p className="text-gray-700 mb-3">{proj.description}</p>}
//                                     {proj.technologies && proj.technologies.length > 0 && (
//                                         <div className="flex flex-wrap gap-2 mb-2">
//                                             {proj.technologies.map((tech, tidx) => (
//                                                 <span key={tidx} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
//                                                     {tech}
//                                                 </span>
//                                             ))}
//                                         </div>
//                                     )}
//                                     {proj.link && (
//                                         <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
//                                             View Project →
//                                         </a>
//                                     )}
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default CVViewPage;