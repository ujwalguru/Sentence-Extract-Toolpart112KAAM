import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import type { ChatData } from '../App';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE}${path}`;

interface Platform {
  id: string;
  name: string;
  url: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

// SVG logo icons for each platform
const CHATGPT_ICON = (
  <svg viewBox="0 0 41 41" fill="none" className="w-7 h-7">
    <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.072-3.666 10.078 10.078 0 0 0-11.383 4.966 9.963 9.963 0 0 0-6.671 4.834 10.079 10.079 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.072 3.666 10.078 10.078 0 0 0 11.383-4.966 9.963 9.963 0 0 0 6.671-4.835 10.079 10.079 0 0 0-1.24-11.817zm-22.498 13.232a7.482 7.482 0 0 1-4.799-3.232 7.33 7.33 0 0 1-.913-5.609 7.4 7.4 0 0 0 .137.084l7.994 4.617a1.317 1.317 0 0 0 1.323 0l9.76-5.638v3.268l-7.696 4.444a7.483 7.483 0 0 1-5.806.046zM7.523 14.054a7.482 7.482 0 0 1 3.904-3.287V19.1a1.317 1.317 0 0 0 .661 1.145l9.76 5.638-2.838 1.64-7.682-4.436a7.483 7.483 0 0 1-3.805-7.033zm20.894 6.408-9.76-5.638 2.838-1.64 7.682 4.436a7.483 7.483 0 0 1 3.805 7.033 7.482 7.482 0 0 1-3.904 3.287V19.61a1.317 1.317 0 0 0-.661-1.147zm2.822-5.626a7.4 7.4 0 0 0-.137-.083l-7.994-4.617a1.316 1.316 0 0 0-1.323 0L12.025 15.7v-3.268l7.696-4.444a7.483 7.483 0 0 1 10.518 7.796zm-14.558 4.88-3.297-1.903v-3.805l3.297 1.903 3.297 1.902v3.806l-3.297-1.903z" fill="currentColor"/>
  </svg>
);

const CLAUDE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
    <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128-4.72-2.648-.184.08-.08.23.08.23 4.72 2.648.08.23-.08.23-4.72 2.647-.184-.08-.08-.23.08-.23zM19.291 8.045l-4.72 2.647-.08.23.08.128 4.72 2.648.184-.08.08-.23-.08-.23-4.72-2.648-.08-.23.08-.23 4.72-2.647.184.08.08.23-.08.23z" fill="currentColor"/>
    <path d="M9.93 19.533l2.55-14.972.128-.124.23.08 2.55 14.972-.128.124-.23-.08z" fill="currentColor"/>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </svg>
);

const GEMINI_ICON = (
  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
    <path d="M12 2C12 2 8 8 8 12C8 16 12 22 12 22C12 22 16 16 16 12C16 8 12 2 12 2Z" fill="url(#gemBlue)"/>
    <path d="M2 12C2 12 8 8 12 8C16 8 22 12 22 12C22 12 16 16 12 16C8 16 2 12 2 12Z" fill="url(#gemPurple)"/>
    <defs>
      <linearGradient id="gemBlue" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4285F4"/>
        <stop offset="1" stopColor="#0D47A1"/>
      </linearGradient>
      <linearGradient id="gemPurple" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7C3AED"/>
        <stop offset="1" stopColor="#4285F4"/>
      </linearGradient>
    </defs>
  </svg>
);

const PERPLEXITY_ICON = (
  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const GROK_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const DEEPSEEK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    <path d="M12 7V5M12 19v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const MISTRAL_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <rect x="2" y="2" width="4" height="4"/>
    <rect x="8" y="2" width="4" height="4"/>
    <rect x="14" y="2" width="4" height="4"/>
    <rect x="20" y="2" width="2" height="4"/>
    <rect x="2" y="8" width="4" height="4"/>
    <rect x="14" y="8" width="4" height="4"/>
    <rect x="2" y="14" width="4" height="4"/>
    <rect x="8" y="14" width="4" height="4"/>
    <rect x="14" y="14" width="4" height="4"/>
    <rect x="2" y="20" width="4" height="4"/>
    <rect x="20" y="20" width="2" height="4"/>
  </svg>
);

const COPILOT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="currentColor"/>
  </svg>
);

const PLATFORMS: Platform[] = [
  { id: 'chatgpt',    name: 'ChatGPT',    url: 'https://chatgpt.com/',                   icon: CHATGPT_ICON,    color: '#10a37f', bg: 'rgba(16,163,127,0.1)'  },
  { id: 'claude',     name: 'Claude',     url: 'https://claude.ai/new',                  icon: CLAUDE_ICON,     color: '#d97706', bg: 'rgba(217,119,6,0.1)'   },
  { id: 'gemini',     name: 'Gemini',     url: 'https://gemini.google.com/app',          icon: GEMINI_ICON,     color: '#4285F4', bg: 'rgba(66,133,244,0.1)'  },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai/',             icon: PERPLEXITY_ICON, color: '#20B2AA', bg: 'rgba(32,178,170,0.1)'  },
  { id: 'grok',       name: 'Grok',       url: 'https://grok.com/',                      icon: GROK_ICON,       color: '#ffffff', bg: 'rgba(255,255,255,0.08)' },
  { id: 'deepseek',   name: 'DeepSeek',   url: 'https://chat.deepseek.com/',             icon: DEEPSEEK_ICON,   color: '#4F8EF7', bg: 'rgba(79,142,247,0.1)'  },
  { id: 'mistral',    name: 'Mistral',    url: 'https://chat.mistral.ai/chat',           icon: MISTRAL_ICON,    color: '#FF7000', bg: 'rgba(255,112,0,0.1)'   },
  { id: 'copilot',    name: 'Copilot',    url: 'https://copilot.microsoft.com/',         icon: COPILOT_ICON,    color: '#0078d4', bg: 'rgba(0,120,212,0.1)'   },
];

function formatAsMarkdown(data: ChatData): string {
  return `# ${data.title}\n\n` +
    data.messages.map(m =>
      `**${m.role === 'user' ? 'User' : 'Assistant'}:**\n\n${(m.content_html || m.content).replace(/<[^>]*>?/gm, '')}`
    ).join('\n\n---\n\n');
}

interface ContinueModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatData: ChatData;
}

export function ContinueModal({ isOpen, onClose, chatData }: ContinueModalProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(null);
      setStatus('idle');
      setStatusMsg('');
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? PLATFORMS.filter(p => p.name.toLowerCase().includes(q)) : PLATFORMS;
  }, [query]);

  async function handleGo(platform: Platform) {
    setSelected(platform.id);
    setStatus('loading');
    setStatusMsg('Generating public bridge link…');

    try {
      const text = formatAsMarkdown(chatData);
      const res = await fetch(apiUrl('/api/public-bridge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      if (!data.url) throw new Error('No URL returned');

      setStatusMsg('Copying passage to clipboard…');

      const passage =
        `I had the following conversation with an AI assistant. Please read it carefully and continue from where it left off, maintaining the same context and tone.\n\n` +
        `Full conversation: ${data.url}`;

      await navigator.clipboard.writeText(passage).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = passage;
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
      });

      setStatus('done');
      setStatusMsg(`✓ Link copied! Opening ${platform.name}…`);

      setTimeout(() => { window.open(platform.url, '_blank'); }, 500);
      setTimeout(() => { onClose(); setStatus('idle'); }, 2200);
    } catch {
      setStatus('error');
      setStatusMsg('Failed to generate link. Please try again.');
      setTimeout(() => { setStatus('idle'); setSelected(null); }, 3000);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
                <div>
                  <h2 className="text-white font-bold text-base tracking-tight">Continue in another AI</h2>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Generates a public link · Copies a passage · Opens your chosen AI
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 pt-4 pb-3">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search AI platforms…"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-all"
                  />
                </div>
              </div>

              {/* Platform grid */}
              <div className="px-4 pb-4 max-h-72 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-zinc-600 text-sm">No platforms found</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filtered.map(platform => {
                      const isSelected = selected === platform.id;
                      const isLoading = isSelected && status === 'loading';
                      const isDone = isSelected && status === 'done';
                      const isError = isSelected && status === 'error';

                      return (
                        <button
                          key={platform.id}
                          onClick={() => status === 'idle' && handleGo(platform)}
                          disabled={status === 'loading' || status === 'done'}
                          className={`
                            group relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200
                            ${isSelected
                              ? isDone
                                ? 'border-green-500/40 bg-green-500/10'
                                : isError
                                ? 'border-red-500/30 bg-red-500/8'
                                : 'border-white/20 bg-white/8'
                              : 'border-white/6 bg-white/3 hover:border-white/15 hover:bg-white/6 cursor-pointer'
                            }
                          `}
                          style={isSelected && !isDone && !isError ? { borderColor: platform.color + '40', backgroundColor: platform.bg } : {}}
                        >
                          {/* Icon */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{ backgroundColor: platform.bg, color: platform.color }}
                          >
                            {isLoading ? (
                              <Loader2 size={18} className="animate-spin opacity-70" />
                            ) : isDone ? (
                              <CheckCircle2 size={18} className="text-green-400" />
                            ) : (
                              platform.icon
                            )}
                          </div>

                          {/* Label */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{platform.name}</div>
                            {isSelected && statusMsg ? (
                              <div className={`text-[10px] mt-0.5 truncate ${isDone ? 'text-green-400' : isError ? 'text-red-400' : 'text-zinc-400'}`}>
                                {statusMsg}
                              </div>
                            ) : (
                              <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{platform.url.replace('https://', '').replace(/\/$/, '')}</div>
                            )}
                          </div>

                          {/* Go arrow (shows on hover when idle) */}
                          {!isSelected && status === 'idle' && (
                            <ArrowRight
                              size={14}
                              className="text-zinc-600 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-5 py-3 border-t border-white/6 bg-black/20">
                <p className="text-[10px] text-zinc-600 text-center">
                  Click any AI to generate a public link and copy the passage automatically
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
