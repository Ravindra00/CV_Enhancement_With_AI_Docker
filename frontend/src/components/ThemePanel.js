import React, { useState, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────────────
   ThemePanel — collapsible sidebar for CV color, font, layout,
   and accent-style customization
─────────────────────────────────────────────────────────────────── */

const PRESET_COLORS = [
    { label: 'Charcoal', value: '#1a1a1a' },
    { label: 'Crimson', value: '#be123c' },
    { label: 'Ruby', value: '#dc2626' },
    { label: 'Navy', value: '#1e3a5f' },
    { label: 'Ocean', value: '#0369a1' },
    { label: 'Sky', value: '#0284c7' },
    { label: 'Forest', value: '#166534' },
    { label: 'Emerald', value: '#059669' },
    { label: 'Slate', value: '#334155' },
    { label: 'Purple', value: '#7c3aed' },
    { label: 'Violet', value: '#6d28d9' },
    { label: 'Teal', value: '#0d9488' },
    { label: 'Amber', value: '#b45309' },
    { label: 'Orange', value: '#c2410c' },
    { label: 'Indigo', value: '#4338ca' },
    { label: 'Pink', value: '#be185d' },
    { label: 'Brown', value: '#78350f' },
    { label: 'Graphite', value: '#374151' },
];

const FONT_OPTIONS = [
    { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
    { label: 'Roboto', value: 'Roboto, Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, Times New Roman, serif' },
    { label: 'Playfair', value: '"Playfair Display", Georgia, serif' },
    { label: 'Merriweather', value: 'Merriweather, Georgia, serif' },
    { label: 'Lato', value: 'Lato, Helvetica, sans-serif' },
    { label: 'Montserrat', value: 'Montserrat, system-ui, sans-serif' },
];

const LAYOUTS = [
    { label: 'Clean', value: 'clean', icon: '📄', desc: 'White, icon headers' },
    { label: 'Classic', value: 'classic', icon: '🎨', desc: 'Color header banner' },
    { label: 'Modern', value: 'modern', icon: '⊡', desc: 'Colored sidebar' },
    { label: 'Executive', value: 'executive', icon: '💼', desc: 'Two-column body' },
    { label: 'Minimal', value: 'minimal', icon: '▭', desc: 'Ultra clean' },
];

const ACCENT_STYLES = [
    { label: 'Line', value: 'line', icon: '—' },
    { label: 'Badge', value: 'badge', icon: '🏷' },
    { label: 'Dot', value: 'dot', icon: '●' },
];

const ThemePanel = ({ theme, onThemeChange }) => {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('layout'); // layout | color | font | accent

    const set = useCallback((key, val) => {
        onThemeChange({ ...theme, [key]: val });
    }, [theme, onThemeChange]);

    const Tab = ({ id, label }) => (
        <button
            onClick={() => setTab(id)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${tab === id ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-200 shadow-sm" style={{ background: theme.primaryColor }} />
                    <span className="text-sm font-semibold text-gray-900">Theme & Design</span>
                    <span className="text-xs text-gray-400 font-normal capitalize">{theme.layout}</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="border-t border-gray-100">
                    {/* Tab bar */}
                    <div className="flex gap-1 px-3 py-2 bg-gray-50 border-b border-gray-100">
                        <Tab id="layout" label="Layout" />
                        <Tab id="color" label="Color" />
                        <Tab id="font" label="Font" />
                        <Tab id="accent" label="Accent" />
                    </div>

                    <div className="px-4 pb-4 pt-3">

                        {/* ── Layout tab ── */}
                        {tab === 'layout' && (
                            <div className="space-y-2">
                                {LAYOUTS.map(l => (
                                    <button
                                        key={l.value}
                                        onClick={() => set('layout', l.value)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition ${theme.layout === l.value
                                                ? 'border-primary bg-primary-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className="text-xl w-7 text-center">{l.icon}</span>
                                        <div>
                                            <p className={`text-xs font-bold ${theme.layout === l.value ? 'text-primary' : 'text-gray-800'}`}>{l.label}</p>
                                            <p className="text-[10px] text-gray-400">{l.desc}</p>
                                        </div>
                                        {theme.layout === l.value && (
                                            <svg className="w-4 h-4 text-primary ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Color tab ── */}
                        {tab === 'color' && (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500">Presets</p>
                                <div className="grid grid-cols-6 gap-2">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => set('primaryColor', c.value)}
                                            title={c.label}
                                            className={`w-full aspect-square rounded-lg border-2 transition hover:scale-110 ${theme.primaryColor === c.value ? 'border-gray-900 ring-2 ring-gray-300' : 'border-transparent'
                                                }`}
                                            style={{ background: c.value }}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-3 mt-2 pt-3 border-t border-gray-100">
                                    <label className="text-xs text-gray-500 font-medium">Custom</label>
                                    <input
                                        type="color"
                                        value={theme.primaryColor}
                                        onChange={e => set('primaryColor', e.target.value)}
                                        className="w-9 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                                    />
                                    <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded">{theme.primaryColor}</span>
                                </div>
                            </div>
                        )}

                        {/* ── Font tab ── */}
                        {tab === 'font' && (
                            <div className="space-y-1">
                                {FONT_OPTIONS.map(f => (
                                    <button
                                        key={f.value}
                                        onClick={() => set('fontFamily', f.value)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm border-2 transition ${theme.fontFamily === f.value
                                                ? 'border-primary bg-primary-50 text-primary font-semibold'
                                                : 'border-transparent text-gray-600 hover:bg-gray-50'
                                            }`}
                                        style={{ fontFamily: f.value }}
                                    >
                                        {f.label} <span className="text-[10px] ml-1 opacity-50">Aa Bb Cc</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Accent tab ── */}
                        {tab === 'accent' && (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 mb-3">Section header style</p>
                                {ACCENT_STYLES.map(a => (
                                    <button
                                        key={a.value}
                                        onClick={() => set('accentStyle', a.value)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition ${(theme.accentStyle || 'line') === a.value
                                                ? 'border-primary bg-primary-50 text-primary'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className="text-lg w-7 text-center">{a.icon}</span>
                                        <span className="text-xs font-semibold">{a.label}</span>
                                        {(theme.accentStyle || 'line') === a.value && (
                                            <svg className="w-4 h-4 text-primary ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThemePanel;
