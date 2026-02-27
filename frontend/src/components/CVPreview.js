import React from 'react';

/* ───────────────────────────────────────────────────────────────
   CVPreview — A4 live preview with dynamic themes & paging
   Props:
     data   — parsed CV data
     theme  — { primaryColor, fontFamily, layout, accentStyle }
     scale  — canvas scale (default 1)
─────────────────────────────────────────────────────────────── */

const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000';

const DEFAULT_THEME = {
    primaryColor: '#1a1a1a',
    fontFamily: 'Inter, system-ui, sans-serif',
    layout: 'clean',
    accentStyle: 'line', // line | badge | dot
};

/* ─── Language detection ─── */
const GERMAN_MARKERS = [
    'erfahrung', 'kenntnisse', 'fähigkeiten', 'verantwortlich',
    'unternehmen', 'tätigkeiten', 'entwicklung', 'aufgaben',
    'bereich', 'mittels', 'wurden', 'wurde', 'haben',
    'leitung', 'planung', 'umsetzung', 'werkzeug', 'arbeit',
    'softwareentwickler', 'ingenieur', 'datenbankadministrator',
];

const detectGerman = (data) => {
    const pi = data.personal_info || {};
    let sample = '';
    sample += (pi.title || pi.jobTitle || '') + ' ';
    sample += (pi.summary || data.profile_summary || '').substring(0, 400) + ' ';
    const exps = data.experiences || data.experience || [];
    exps.slice(0, 2).forEach(e => { sample += (e.description || '').substring(0, 200) + ' '; });
    sample = sample.toLowerCase();
    const score = GERMAN_MARKERS.filter(w => sample.includes(w)).length;
    return score >= 2;
};

const LABELS_EN = {
    profile: 'Profile', experience: 'Experience', education: 'Education',
    skills: 'Skills', languages: 'Languages', interests: 'Interests',
    projects: 'Projects', certifications: 'Certifications',
};
const LABELS_DE = {
    profile: 'Profil', experience: 'Berufserfahrung', education: 'Bildung',
    skills: 'Fähigkeiten', languages: 'Sprachen', interests: 'Interessen',
    projects: 'Projekte', certifications: 'Zertifikate',
};

/* ─── Photo size / shape helpers ─── */
const PHOTO_SIZE_MAP = { small: 56, medium: 76, large: 100 };

/* ─── helpers ─── */
const rgba = (hex, a) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
};

/** Resolve photo URL — handles /uploads/... paths from backend */
const resolvePhoto = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('/uploads/') || photo.startsWith('uploads/')) {
        return `${API_BASE}/${photo.replace(/^\//, '')}`;
    }
    return photo;
};

/** Flatten skills: handles list-of-strings, list-of-objects, or dict-of-categories */
const flattenSkills = (skills) => {
    if (!skills) return [];
    if (Array.isArray(skills)) {
        return skills.map(s => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean);
    }
    if (typeof skills === 'object') {
        return Object.entries(skills).flatMap(([, v]) =>
            Array.isArray(v) ? v.map(s => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean) : []
        );
    }
    return [];
};

/** Get skill categories if skills is a dict */
const getSkillCategories = (skills) => {
    if (!skills || Array.isArray(skills)) return null;
    if (typeof skills === 'object' && !Array.isArray(skills)) return skills;
    return null;
};

/* ─── Section title variants ─── */
const SectionTitle = ({ label, color, border, style = 'line', icon }) => {
    if (style === 'badge') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, marginTop: 3 }}>
                {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
                <span style={{ background: color, color: 'white', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 3 }}>{label}</span>
            </div>
        );
    }
    if (style === 'dot') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, marginTop: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <h2 style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color, margin: 0 }}>{label}</h2>
                <div style={{ flex: 1, height: 1, background: rgba(color, 0.3) }} />
            </div>
        );
    }
    // default: line
    return (
        <div style={{ marginBottom: 7, marginTop: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {icon && <span style={{ fontSize: 11, lineHeight: 1 }}>{icon}</span>}
                <h2 style={{ fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1a1a1a', margin: 0, whiteSpace: 'nowrap' }}>{label}</h2>
            </div>
            <div style={{ height: 1.5, background: '#1a1a1a', marginTop: 3, borderRadius: 1 }} />
        </div>
    );
};

const CVPreview = ({ data = {}, theme: themeProp = {}, scale = 1 }) => {
    const theme = { ...DEFAULT_THEME, ...themeProp };
    const primary = theme.primaryColor;
    const primaryLight = rgba(primary, 0.12);
    const primaryBorder = rgba(primary, 0.3);
    const accentStyle = theme.accentStyle || 'line';

    const pi = data.personal_info || {};
    const photo = resolvePhoto(pi.photo || data.photo_path);
    const experiences = data.experiences || [];
    const education = data.educations || [];
    const rawSkills = data.skills;
    const skills = flattenSkills(rawSkills);
    const skillCategories = getSkillCategories(rawSkills);
    const certs = data.certifications || [];
    const langs = data.languages || [];
    const projects = data.projects || [];
    const interests = data.interests || [];
    const hobbies = data.hobbies || data.hobbies_text || '';
    const customSections = data.custom_sections || [];
    const summary = pi.summary || data.profile_summary || '';
    const name = pi.name || data.full_name || '';
    const title = pi.title || pi.jobTitle || data.title || '';
    const email = pi.email || data.email || '';
    const phone = pi.phone || data.phone || '';
    const location = pi.location || data.location || '';
    const linkedin = pi.linkedin || pi.linkedin_url || data.linkedin_url || '';
    const website = pi.website || '';

    // Language detection
    const isGerman = detectGerman(data);
    const L = isGerman ? LABELS_DE : LABELS_EN;

    // Photo shape / size
    const photoSizePx = typeof pi.photoSize === 'number'
        ? pi.photoSize
        : (PHOTO_SIZE_MAP[pi.photoSize] || 76);
    const photoRadius = pi.photoShape === 'square' ? '6px' : '50%';

    const sTitle = (label, icon) => <SectionTitle label={label} color={primary} border={primaryBorder} style={accentStyle} icon={icon} />;

    /* ─── Skills renderer (handles dict or flat list) ─── */
    const renderSkills = (compact = false) => {
        if (skillCategories) {
            return (
                <div>
                    {Object.entries(skillCategories).map(([cat, items], ci) => (
                        <div key={ci} style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 7.5, fontWeight: 700, color: '#4b5563', marginRight: 6 }}>{cat}:</span>
                            <span style={{ fontSize: 7.5, color: '#374151' }}>
                                {(Array.isArray(items) ? items : []).map(s => typeof s === 'string' ? s : s?.name || '').filter(Boolean).join(' · ')}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        if (compact) {
            return <div style={{ fontSize: 8, color: '#374151', lineHeight: '16px' }}>{skills.join(' · ')}</div>;
        }
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {skills.map((s, i) => (
                    <span key={i} style={{ background: primaryLight, color: primary, border: `1px solid ${primaryBorder}`, borderRadius: 10, padding: '1px 8px', fontSize: 7.5, fontWeight: 500 }}>{s}</span>
                ))}
            </div>
        );
    };

    /* ─── CLEAN layout (matches reference PDF) ─── */
    if (theme.layout === 'clean') {
        const currentLabel = isGerman ? 'Heute' : 'Present';
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', background: 'white', padding: '32px 36px 24px' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1, paddingRight: 20 }}>
                        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 3px', letterSpacing: '-0.02em', color: '#111' }}>{name || 'Your Name'}</h1>
                        {title && <p style={{ fontSize: 11, color: '#555', fontWeight: 500, margin: '0 0 10px' }}>{title}</p>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 16px', fontSize: 8, color: '#444' }}>
                            {email && <span>✉ {email}</span>}
                            {phone && <span>✆ {phone}</span>}
                            {location && <span>📍 {location}</span>}
                            {linkedin && <span>in {linkedin}</span>}
                            {website && <span>🔗 {website}</span>}
                        </div>
                    </div>
                    {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover', flexShrink: 0, border: '2px solid #e5e7eb' }} />}
                </div>
                <div style={{ height: 1, background: '#e5e7eb', marginBottom: 14 }} />

                {/* Profile */}
                {summary && (
                    <div style={{ marginBottom: 12 }}>
                        {sTitle(L.profile, '👤')}
                        <p style={{ margin: 0, color: '#374151', lineHeight: '16px', textAlign: 'justify' }}>{summary}</p>
                    </div>
                )}

                {/* Experience */}
                {experiences.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        {sTitle(L.experience, '💼')}
                        {experiences.map((exp, i) => (
                            <div key={i} style={{ marginBottom: 9 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <div>
                                        <span style={{ fontWeight: 700, fontSize: 9 }}>{exp.role || exp.position || exp.job_title || '—'}</span>
                                        {exp.company && <span style={{ color: '#555', fontWeight: 400 }}>, {exp.company}</span>}
                                        {exp.location && <span style={{ color: '#888' }}> — {exp.location}</span>}
                                    </div>
                                    <span style={{ color: '#888', fontSize: 7.5, whiteSpace: 'nowrap', marginLeft: 10 }}>
                                        {exp.startDate}{(exp.startDate && (exp.endDate || exp.current)) ? ' – ' : ''}{exp.current ? currentLabel : exp.endDate}
                                    </span>
                                </div>
                                {exp.description && (
                                    <div style={{ marginTop: 3, paddingLeft: 0 }}>
                                        {exp.description.split('\n').filter(Boolean).map((line, j) => (
                                            <div key={j} style={{ display: 'flex', gap: 5, marginBottom: 1 }}>
                                                <span style={{ color: '#888', flexShrink: 0 }}>•</span>
                                                <span style={{ color: '#374151' }}>{line.replace(/^[•\-]\s*/, '')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Education */}
                {education.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        {sTitle(L.education, '🎓')}
                        {education.map((edu, i) => (
                            <div key={i} style={{ marginBottom: 7 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <div>
                                        <span style={{ fontWeight: 700 }}>{edu.degree}{edu.field ? ` – ${edu.field}` : ''}</span>
                                        {edu.institution && <span style={{ color: '#555' }}>, {edu.institution}</span>}
                                    </div>
                                    <span style={{ color: '#888', fontSize: 7.5, whiteSpace: 'nowrap', marginLeft: 10 }}>
                                        {edu.startDate}{edu.startDate && edu.endDate ? ' – ' : ''}{edu.endDate}
                                    </span>
                                </div>
                                {edu.grade && <div style={{ color: '#888', marginTop: 2, fontSize: 8 }}>{isGerman ? 'Note' : 'Grade'}: {edu.grade}</div>}
                            </div>
                        ))}
                    </div>
                )}

                {/* Skills */}
                {(skills.length > 0 || skillCategories) && (
                    <div style={{ marginBottom: 12 }}>
                        {sTitle(L.skills, '⚡')}
                        {renderSkills()}
                    </div>
                )}

                {/* Languages */}
                {langs.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        {sTitle(L.languages, '🌐')}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px 0' }}>
                            {langs.map((l, i) => (
                                <div key={i} style={{ display: 'flex', gap: 6 }}>
                                    <span style={{ fontWeight: 600 }}>{l.language}</span>
                                    <span style={{ color: '#888' }}>{l.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Interests / Hobbies */}
                {(interests.length > 0 || hobbies) && (
                    <div style={{ marginBottom: 12 }}>
                        {sTitle(L.interests, '🎯')}
                        {interests.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 16px' }}>
                                {interests.map((interest, i) => {
                                    const txt = typeof interest === 'string' ? interest : interest?.name || interest?.interest || '';
                                    return txt ? <span key={i} style={{ fontSize: 8.5, color: '#374151' }}>• {txt}</span> : null;
                                })}
                            </div>
                        ) : (
                            <p style={{ margin: 0, color: '#374151' }}>{hobbies}</p>
                        )}
                    </div>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        {sTitle(L.projects, '🚀')}
                        {projects.map((p, i) => (
                            <div key={i} style={{ marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                                    {(p.link || p.url) && <span style={{ color: '#888', fontSize: 7.5 }}>{p.link || p.url}</span>}
                                </div>
                                {p.description && <div style={{ color: '#555', marginTop: 2 }}>{p.description}</div>}
                            </div>
                        ))}
                    </div>
                )}

                {/* Certifications */}
                {certs.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        {sTitle(L.certifications, '🏅')}
                        {certs.map((c, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                                    {c.issuer && <span style={{ color: '#888' }}> — {c.issuer}</span>}
                                </div>
                                <span style={{ color: '#888', fontSize: 7.5 }}>{c.issueDate || c.date}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Custom Sections */}
                {customSections.filter(cs => cs.title && cs.content).map((cs, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                        {sTitle(cs.title, '📌')}
                        <p style={{ margin: 0, color: '#374151', lineHeight: '16px', whiteSpace: 'pre-wrap' }}>{cs.content}</p>
                    </div>
                ))}
            </div>
        );
    }

    /* ─── Modern layout: left sidebar + main ─── */
    if (theme.layout === 'modern') {
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', display: 'flex', background: 'white' }}>
                {/* Sidebar */}
                <div style={{ width: 220, background: primary, color: 'white', padding: '20px 14px', flexShrink: 0 }}>
                    {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover', display: 'block', margin: '0 auto 12px', border: '3px solid rgba(255,255,255,0.4)' }} />}
                    <h1 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 3px', lineHeight: 1.2, textAlign: 'center' }}>{name || 'Your Name'}</h1>
                    {title && <p style={{ fontSize: 8.5, opacity: 0.8, margin: '0 0 12px', textAlign: 'center' }}>{title}</p>}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: 10, marginBottom: 12 }}>
                        {[email && `✉ ${email}`, phone && `✆ ${phone}`, location && `📍 ${location}`, linkedin && `in ${linkedin}`].filter(Boolean).map((c, i) => (
                            <div key={i} style={{ fontSize: 7.5, opacity: 0.88, marginBottom: 3, wordBreak: 'break-word' }}>{c}</div>
                        ))}
                    </div>
                    {skills.length > 0 && (
                        <>
                            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7, marginBottom: 6 }}>Skills</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                {skills.map((s, i) => <span key={i} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '1px 6px', fontSize: 7.5 }}>{s}</span>)}
                            </div>
                        </>
                    )}
                    {langs.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, marginBottom: 5 }}>Languages</div>
                            {langs.map((l, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 2 }}>
                                    <span>{l.language}</span><span style={{ opacity: 0.75 }}>{l.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {(interests.length > 0 || hobbies) && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, marginBottom: 5 }}>Interests</div>
                            {interests.length > 0 ? interests.map((interest, i) => {
                                const txt = typeof interest === 'string' ? interest : interest?.name || interest?.interest || '';
                                return txt ? <div key={i} style={{ fontSize: 7.5, opacity: 0.85, marginBottom: 2 }}>• {txt}</div> : null;
                            }) : <div style={{ fontSize: 7.5, opacity: 0.85 }}>{hobbies}</div>}
                        </div>
                    )}
                </div>
                {/* Main */}
                <div style={{ flex: 1, padding: '20px 18px 16px 16px' }}>
                    {summary && <><SectionTitle label="Profile" color={primary} border={primaryBorder} style={accentStyle} /><p style={{ margin: '0 0 10px', color: '#374151', lineHeight: '15px' }}>{summary}</p></>}
                    {_renderExp(experiences, primary, primaryBorder, accentStyle)}
                    {_renderEdu(education, primary, primaryBorder, accentStyle)}
                    {certs.length > 0 && <>{<SectionTitle label="Certifications" color={primary} border={primaryBorder} style={accentStyle} />}{certs.map((c, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><div><span style={{ fontWeight: 600 }}>{c.name}</span>{c.issuer && <span style={{ color: '#6b7280' }}> — {c.issuer}</span>}</div><span style={{ color: '#6b7280', fontSize: 7.5 }}>{c.issueDate || c.date}</span></div>)}</>}
                    {projects.length > 0 && <>{<SectionTitle label="Projects" color={primary} border={primaryBorder} style={accentStyle} />}{projects.map((p, i) => <div key={i} style={{ marginBottom: 5 }}><span style={{ fontWeight: 700 }}>{p.name}</span>{(p.link || p.url) && <span style={{ color: primary, fontSize: 7.5, marginLeft: 5 }}>{p.link || p.url}</span>}{p.description && <div style={{ color: '#555', marginTop: 1 }}>{p.description}</div>}</div>)}</>}
                </div>
            </div>
        );
    }

    /* ─── Executive layout: two-column header, colored accent ─── */
    if (theme.layout === 'executive') {
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', background: 'white' }}>
                <div style={{ background: primary, padding: '22px 28px 16px', color: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 3px' }}>{name || 'Your Name'}</h1>
                            {title && <p style={{ fontSize: 10, opacity: 0.85, margin: 0 }}>{title}</p>}
                        </div>
                        {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)' }} />}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px', marginTop: 8, opacity: 0.9, fontSize: 7.5 }}>
                        {email && <span>✉ {email}</span>}{phone && <span>✆ {phone}</span>}{location && <span>📍 {location}</span>}{linkedin && <span>in {linkedin}</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', padding: '14px 24px 20px', gap: 18 }}>
                    {/* Left col */}
                    <div style={{ width: 200, flexShrink: 0 }}>
                        {(skills.length > 0 || skillCategories) && <><SectionTitle label="Skills" color={primary} border={primaryBorder} style={accentStyle} /><div style={{ marginBottom: 10 }}>{renderSkills(true)}</div></>}
                        {langs.length > 0 && <><SectionTitle label="Languages" color={primary} border={primaryBorder} style={accentStyle} />{langs.map((l, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span style={{ fontWeight: 500 }}>{l.language}</span><span style={{ color: '#6b7280' }}>{l.proficiency}</span></div>)}</>}
                        {(interests.length > 0 || hobbies) && (
                            <div style={{ marginTop: 10 }}>
                                <SectionTitle label="Interests" color={primary} border={primaryBorder} style={accentStyle} />
                                {interests.length > 0 ? interests.map((interest, i) => {
                                    const txt = typeof interest === 'string' ? interest : interest?.name || '';
                                    return txt ? <div key={i} style={{ marginBottom: 2, fontSize: 8.5 }}>• {txt}</div> : null;
                                }) : <div style={{ fontSize: 8.5 }}>{hobbies}</div>}
                            </div>
                        )}
                        {certs.length > 0 && <div style={{ marginTop: 10 }}><SectionTitle label="Certifications" color={primary} border={primaryBorder} style={accentStyle} />{certs.map((c, i) => <div key={i} style={{ marginBottom: 4 }}><div style={{ fontWeight: 600, fontSize: 8 }}>{c.name}</div>{c.issuer && <div style={{ color: '#888', fontSize: 7.5 }}>{c.issuer}</div>}</div>)}</div>}
                    </div>
                    {/* Right col — divider + main */}
                    <div style={{ flex: 1, borderLeft: `2px solid ${primary}`, paddingLeft: 16 }}>
                        {summary && <><SectionTitle label="Profile" color={primary} border={primaryBorder} style={accentStyle} /><p style={{ margin: '0 0 10px', color: '#374151', lineHeight: '15px' }}>{summary}</p></>}
                        {_renderExp(experiences, primary, primaryBorder, accentStyle)}
                        {_renderEdu(education, primary, primaryBorder, accentStyle)}
                        {projects.length > 0 && <><SectionTitle label="Projects" color={primary} border={primaryBorder} style={accentStyle} />{projects.map((p, i) => <div key={i} style={{ marginBottom: 5 }}><span style={{ fontWeight: 700 }}>{p.name}</span>{(p.link || p.url) && <span style={{ color: primary, fontSize: 7.5, marginLeft: 5 }}>{p.link || p.url}</span>}{p.description && <div style={{ color: '#555', marginTop: 1 }}>{p.description}</div>}</div>)}</>}
                    </div>
                </div>
            </div>
        );
    }

    /* ─── Minimal layout ─── */
    if (theme.layout === 'minimal') {
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', background: 'white', padding: '28px 32px 24px' }}>
                <div style={{ borderBottom: `2px solid ${primary}`, paddingBottom: 12, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#111' }}>{name || 'Your Name'}</h1>
                            {title && <p style={{ fontSize: 10, color: primary, fontWeight: 600, margin: '2px 0 6px' }}>{title}</p>}
                            <div style={{ display: 'flex', gap: 12, fontSize: 7.5, color: '#6b7280', flexWrap: 'wrap' }}>
                                {email && <span>✉ {email}</span>}{phone && <span>✆ {phone}</span>}{location && <span>📍 {location}</span>}{linkedin && <span>in {linkedin}</span>}
                            </div>
                        </div>
                        {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover' }} />}
                    </div>
                </div>
                {summary && <><SectionTitle label="Profile" color={primary} border={primaryBorder} style={accentStyle} /><p style={{ margin: '0 0 10px', color: '#374151' }}>{summary}</p></>}
                {_renderExp(experiences, primary, primaryBorder, accentStyle)}
                {_renderEdu(education, primary, primaryBorder, accentStyle)}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {skills.length > 0 && <div><SectionTitle label="Skills" color={primary} border={primaryBorder} style={accentStyle} />{renderSkills()}</div>}
                    {langs.length > 0 && <div><SectionTitle label="Languages" color={primary} border={primaryBorder} style={accentStyle} />{langs.map((l, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span style={{ fontWeight: 500 }}>{l.language}</span><span style={{ color: '#6b7280' }}>{l.proficiency}</span></div>)}</div>}
                </div>
                {(interests.length > 0 || hobbies) && (
                    <div style={{ marginTop: 10 }}>
                        <SectionTitle label="Interests" color={primary} border={primaryBorder} style={accentStyle} />
                        {interests.length > 0 ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px' }}>{interests.map((interest, i) => { const txt = typeof interest === 'string' ? interest : interest?.name || ''; return txt ? <span key={i} style={{ fontSize: 8.5 }}>• {txt}</span> : null; })}</div> : <p style={{ margin: 0, fontSize: 8.5 }}>{hobbies}</p>}
                    </div>
                )}
                {certs.length > 0 && <div style={{ marginTop: 10 }}><SectionTitle label="Certifications" color={primary} border={primaryBorder} style={accentStyle} />{certs.map((c, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><div><span style={{ fontWeight: 600 }}>{c.name}</span>{c.issuer && <span style={{ color: '#6b7280' }}> — {c.issuer}</span>}</div><span style={{ color: '#6b7280', fontSize: 7.5 }}>{c.issueDate || c.date}</span></div>)}</div>}
                {projects.length > 0 && <div style={{ marginTop: 10 }}><SectionTitle label="Projects" color={primary} border={primaryBorder} style={accentStyle} />{projects.map((p, i) => <div key={i} style={{ marginBottom: 5 }}><span style={{ fontWeight: 700 }}>{p.name}</span>{(p.link || p.url) && <span style={{ color: primary, fontSize: 7.5, marginLeft: 5 }}>{p.link || p.url}</span>}{p.description && <div style={{ color: '#555', marginTop: 1 }}>{p.description}</div>}</div>)}</div>}
                {/* Custom Sections */}
                {customSections.filter(cs => cs.title && cs.content).map((cs, i) => (
                    <div key={i} style={{ marginTop: 10 }}>
                        <SectionTitle label={cs.title} color={primary} border={primaryBorder} style={accentStyle} />
                        <p style={{ margin: 0, color: '#374151', lineHeight: '16px', whiteSpace: 'pre-wrap' }}>{cs.content}</p>
                    </div>
                ))}
            </div>
        );
    }

    /* ─── Classic layout (default) ─── */
    return (
        <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', background: 'white' }}>
            <div style={{ background: primary, padding: '18px 24px 14px', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{name || 'Your Name'}</h1>
                        {title && <p style={{ fontSize: 10, fontWeight: 400, margin: '3px 0 0', opacity: 0.85 }}>{title}</p>}
                    </div>
                    {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 8, opacity: 0.9, fontSize: 7.5 }}>
                    {email && <span>✉ {email}</span>}{phone && <span>✆ {phone}</span>}{location && <span>📍 {location}</span>}{linkedin && <span>in {linkedin}</span>}{website && <span>🔗 {website}</span>}
                </div>
            </div>
            <div style={{ padding: '14px 24px 20px' }}>
                {summary && <div style={{ marginBottom: 10 }}><SectionTitle label="Profile" color={primary} border={primaryBorder} style={accentStyle} /><p style={{ margin: 0, color: '#374151', lineHeight: '16px' }}>{summary}</p></div>}
                {_renderExp(experiences, primary, primaryBorder, accentStyle)}
                {_renderEdu(education, primary, primaryBorder, accentStyle)}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
                    {skills.length > 0 && <div><SectionTitle label="Skills" color={primary} border={primaryBorder} style={accentStyle} />{renderSkills()}</div>}
                    {langs.length > 0 && <div><SectionTitle label="Languages" color={primary} border={primaryBorder} style={accentStyle} />{langs.map((l, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span style={{ fontWeight: 500 }}>{l.language}</span><span style={{ color: '#6b7280' }}>{l.proficiency}</span></div>)}</div>}
                </div>
                {(interests.length > 0 || hobbies) && (
                    <div style={{ marginBottom: 10 }}>
                        <SectionTitle label="Interests" color={primary} border={primaryBorder} style={accentStyle} />
                        {interests.length > 0 ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px' }}>{interests.map((interest, i) => { const txt = typeof interest === 'string' ? interest : interest?.name || ''; return txt ? <span key={i} style={{ fontSize: 8.5 }}>• {txt}</span> : null; })}</div> : <p style={{ margin: 0 }}>{hobbies}</p>}
                    </div>
                )}
                {certs.length > 0 && <div style={{ marginBottom: 10 }}><SectionTitle label="Certifications" color={primary} border={primaryBorder} style={accentStyle} />{certs.map((c, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><div><span style={{ fontWeight: 600 }}>{c.name}</span>{c.issuer && <span style={{ color: '#6b7280' }}> — {c.issuer}</span>}</div><span style={{ color: '#6b7280', fontSize: 7.5 }}>{c.issueDate || c.date}</span></div>)}</div>}
                {projects.length > 0 && <div><SectionTitle label="Projects" color={primary} border={primaryBorder} style={accentStyle} />{projects.map((p, i) => <div key={i} style={{ marginBottom: 5 }}><span style={{ fontWeight: 700 }}>{p.name}</span>{(p.link || p.url) && <span style={{ color: primary, fontSize: 7.5, marginLeft: 5 }}>{p.link || p.url}</span>}{p.description && <div style={{ color: '#555', marginTop: 1 }}>{p.description}</div>}</div>)}</div>}
                {/* Custom Sections */}
                {customSections.filter(cs => cs.title && cs.content).map((cs, i) => (
                    <div key={i}>
                        <SectionTitle label={cs.title} color={primary} border={primaryBorder} style={accentStyle} />
                        <p style={{ margin: '0 0 8px', color: '#374151', lineHeight: '16px', whiteSpace: 'pre-wrap' }}>{cs.content}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─── Shared renderers ─── */
function _renderExp(experiences, primary, border, accentStyle) {
    if (!experiences.length) return null;
    return (
        <div style={{ marginBottom: 10 }}>
            <SectionTitle label="Experience" color={primary} border={border} style={accentStyle} />
            {experiences.map((exp, i) => (
                <div key={i} style={{ marginBottom: 7, pageBreakInside: 'avoid' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                            <span style={{ fontWeight: 700, fontSize: 9 }}>{exp.role || exp.position || exp.job_title || 'Role'}</span>
                            {exp.company && <span style={{ color: primary, fontWeight: 600 }}> · {exp.company}</span>}
                            {exp.location && <span style={{ color: '#6b7280' }}> — {exp.location}</span>}
                        </div>
                        <span style={{ color: '#6b7280', fontSize: 7.5, whiteSpace: 'nowrap', marginLeft: 8 }}>
                            {exp.startDate}{(exp.startDate && (exp.endDate || exp.current)) ? ' – ' : ''}{exp.current ? 'Present' : exp.endDate}
                        </span>
                    </div>
                    {exp.description && (
                        <div style={{ marginTop: 2, color: '#374151' }}>
                            {exp.description.split('\n').filter(Boolean).map((line, j) => (
                                <div key={j} style={{ paddingLeft: 10, position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 2 }}>•</span>
                                    {line.replace(/^[•\-]\s*/, '')}
                                </div>
                            ))}
                        </div>
                    )}
                    {i < experiences.length - 1 && <div style={{ marginTop: 4, borderTop: '1px dashed #f0f0f0' }} />}
                </div>
            ))}
        </div>
    );
}

function _renderEdu(education, primary, border, accentStyle) {
    if (!education.length) return null;
    return (
        <div style={{ marginBottom: 10 }}>
            <SectionTitle label="Education" color={primary} border={border} style={accentStyle} />
            {education.map((edu, i) => (
                <div key={i} style={{ marginBottom: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                            <span style={{ fontWeight: 700 }}>{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</span>
                            {edu.institution && <span style={{ color: primary, fontWeight: 600 }}> · {edu.institution}</span>}
                        </div>
                        <span style={{ color: '#6b7280', fontSize: 7.5, whiteSpace: 'nowrap', marginLeft: 8 }}>
                            {edu.startDate}{edu.startDate && edu.endDate ? ' – ' : ''}{edu.endDate}
                        </span>
                    </div>
                    {edu.grade && <div style={{ color: '#6b7280', marginTop: 1 }}>Grade: {edu.grade}</div>}
                </div>
            ))}
        </div>
    );
}

export default CVPreview;
