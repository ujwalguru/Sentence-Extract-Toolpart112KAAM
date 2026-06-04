import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ArrowRight, CheckCircle2, Loader2, Clock } from 'lucide-react';
import type { ChatData } from '../App';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE}${path}`;
const RECENT_KEY = 'bridge_recent_platforms';

interface Platform {
  id: string;
  name: string;
  url: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

// ── Platform SVG Icons ────────────────────────────────────────────────────────
const CHATGPT_ICON = (
  <svg viewBox="0 0 41 41" fill="none" className="w-6 h-6">
    <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.072-3.666 10.078 10.078 0 0 0-11.383 4.966 9.963 9.963 0 0 0-6.671 4.834 10.079 10.079 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.072 3.666 10.078 10.078 0 0 0 11.383-4.966 9.963 9.963 0 0 0 6.671-4.835 10.079 10.079 0 0 0-1.24-11.817zm-22.498 13.232a7.482 7.482 0 0 1-4.799-3.232 7.33 7.33 0 0 1-.913-5.609 7.4 7.4 0 0 0 .137.084l7.994 4.617a1.317 1.317 0 0 0 1.323 0l9.76-5.638v3.268l-7.696 4.444a7.483 7.483 0 0 1-5.806.046zM7.523 14.054a7.482 7.482 0 0 1 3.904-3.287V19.1a1.317 1.317 0 0 0 .661 1.145l9.76 5.638-2.838 1.64-7.682-4.436a7.483 7.483 0 0 1-3.805-7.033zm20.894 6.408-9.76-5.638 2.838-1.64 7.682 4.436a7.483 7.483 0 0 1 3.805 7.033 7.482 7.482 0 0 1-3.904 3.287V19.61a1.317 1.317 0 0 0-.661-1.147zm2.822-5.626a7.4 7.4 0 0 0-.137-.083l-7.994-4.617a1.316 1.316 0 0 0-1.323 0L12.025 15.7v-3.268l7.696-4.444a7.483 7.483 0 0 1 10.518 7.796zm-14.558 4.88-3.297-1.903v-3.805l3.297 1.903 3.297 1.902v3.806l-3.297-1.903z" fill="currentColor"/>
  </svg>
);

const CLAUDE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M8.5 16l3.5-8 3.5 8M9.5 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const GEMINI_ICON = (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    <path d="M12 2C12 2 8.5 8 8.5 12C8.5 16 12 22 12 22C12 22 15.5 16 15.5 12C15.5 8 12 2 12 2Z" fill="url(#gB)"/>
    <path d="M2 12C2 12 8 8.5 12 8.5C16 8.5 22 12 22 12C22 12 16 15.5 12 15.5C8 15.5 2 12 2 12Z" fill="url(#gP)"/>
    <defs>
      <linearGradient id="gB" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4285F4"/><stop offset="1" stopColor="#1a73e8"/>
      </linearGradient>
      <linearGradient id="gP" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#9C27B0"/><stop offset="1" stopColor="#4285F4"/>
      </linearGradient>
    </defs>
  </svg>
);

const PERPLEXITY_ICON = (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const GROK_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const DEEPSEEK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
  </svg>
);

const MISTRAL_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <rect x="2" y="2" width="4" height="4"/><rect x="8" y="2" width="4" height="4"/>
    <rect x="14" y="2" width="4" height="4"/><rect x="20" y="2" width="2" height="4"/>
    <rect x="2" y="8" width="4" height="4"/><rect x="14" y="8" width="4" height="4"/>
    <rect x="2" y="14" width="4" height="4"/><rect x="8" y="14" width="4" height="4"/>
    <rect x="14" y="14" width="4" height="4"/>
    <rect x="2" y="20" width="4" height="4"/><rect x="20" y="20" width="2" height="4"/>
  </svg>
);

const COPILOT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 10c-2.5 0-4.7-1.3-6-3.2.3-2 2-3.5 4-3.8v-.5c0-.3.2-.5.5-.5h3c.3 0 .5.2.5.5v.5c2 .3 3.7 1.8 4 3.8-1.3 1.9-3.5 3.2-6 3.2z" fill="currentColor"/>
  </svg>
);

const PLATFORMS: Platform[] = [
  { id: 'chatgpt',    name: 'ChatGPT',    url: 'https://chatgpt.com/',             icon: CHATGPT_ICON,    color: '#10a37f', bg: 'rgba(16,163,127,0.12)'  },
  { id: 'claude',     name: 'Claude',     url: 'https://claude.ai/new',            icon: CLAUDE_ICON,     color: '#e8790a', bg: 'rgba(232,121,10,0.12)'  },
  { id: 'gemini',     name: 'Gemini',     url: 'https://gemini.google.com/app',   icon: GEMINI_ICON,     color: '#4285F4', bg: 'rgba(66,133,244,0.12)'  },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai/',      icon: PERPLEXITY_ICON, color: '#20B2AA', bg: 'rgba(32,178,170,0.12)'  },
  { id: 'grok',       name: 'Grok',       url: 'https://grok.com/',               icon: GROK_ICON,       color: '#e5e5e5', bg: 'rgba(255,255,255,0.07)' },
  { id: 'deepseek',   name: 'DeepSeek',   url: 'https://chat.deepseek.com/',      icon: DEEPSEEK_ICON,   color: '#4F8EF7', bg: 'rgba(79,142,247,0.12)'  },
  { id: 'mistral',    name: 'Mistral',    url: 'https://chat.mistral.ai/chat',    icon: MISTRAL_ICON,    color: '#FF7000', bg: 'rgba(255,112,0,0.12)'   },
  { id: 'copilot',    name: 'Copilot',    url: 'https://copilot.microsoft.com/',  icon: COPILOT_ICON,    color: '#0078d4', bg: 'rgba(0,120,212,0.12)'   },
];

const platformById = Object.fromEntries(PLATFORMS.map(p => [p.id, p]));

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 3); } catch { return []; }
}
function saveRecent(id: string) {
  const prev = loadRecent().filter(x => x !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, 3)));
}

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

// Reusable platform card
function PlatformCard({
  platform, isSelected, status, statusMsg, onGo, disabled,
}: {
  platform: Platform;
  isSelected: boolean;
  status: 'idle' | 'loading' | 'done' | 'error';
  statusMsg: string;
  onGo: () => void;
  disabled: boolean;
}) {
  const isLoading = isSelected && status === 'loading';
  const isDone    = isSelected && status === 'done';
  const isError   = isSelected && status === 'error';

  return (
    <motion.button
      layout
      whileHover={!disabled ? { scale: 1.02, y: -1 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={() => !disabled && onGo()}
      disabled={disabled}
      className={`
        group relative flex items-center gap-3 p-3 rounded-xl border text-left w-full
        transition-colors duration-150
        ${isSelected
          ? isDone  ? 'border-green-500/40 bg-green-500/10'
          : isError ? 'border-red-500/30 bg-red-500/8'
          :           'border-white/20'
          : 'border-white/6 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.06] cursor-pointer'
        }
      `}
      style={isSelected && !isDone && !isError
        ? { borderColor: platform.color + '50', backgroundColor: platform.bg }
        : undefined}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: platform.bg, color: platform.color }}
      >
        {isLoading ? <Loader2 size={16} className="animate-spin opacity-80" />
        : isDone    ? <CheckCircle2 size={16} className="text-green-400" />
        :               platform.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-white truncate leading-tight">{platform.name}</div>
        {isSelected && statusMsg
          ? <div className={`text-[10px] mt-0.5 truncate ${isDone ? 'text-green-400' : isError ? 'text-red-400' : 'text-zinc-400'}`}>{statusMsg}</div>
          : <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{platform.url.replace('https://', '').replace(/\/$/, '')}</div>
        }
      </div>

      {!isSelected && !disabled && (
        <ArrowRight size={13} className="text-zinc-700 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      )}
    </motion.button>
  );
}

export function ContinueModal({ isOpen, onClose, chatData }: ContinueModalProps) {
  const [query,     setQuery]     = useState('');
  const [selected,  setSelected]  = useState<string | null>(null);
  const [status,    setStatus]    = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load recent on open
  useEffect(() => {
    if (isOpen) {
      setQuery(''); setSelected(null); setStatus('idle'); setStatusMsg('');
      setRecentIds(loadRecent());
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? PLATFORMS.filter(p => p.name.toLowerCase().includes(q)) : PLATFORMS;
  }, [query]);

  const recentPlatforms = useMemo(
    () => recentIds.map(id => platformById[id]).filter(Boolean) as Platform[],
    [recentIds]
  );
  const showRecent = !query && recentPlatforms.length > 0;

  async function handleGo(platform: Platform) {
    setSelected(platform.id);
    setStatus('loading');
    setStatusMsg('Generating bridge link…');
    try {
      const res = await fetch(apiUrl('/api/public-bridge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formatAsMarkdown(chatData) }),
      });
      if (!res.ok) throw new Error('server');
      const data = await res.json();
      if (!data.url) throw new Error('no_url');

      setStatusMsg('Copying passage…');
      const passage =
        `I had the following conversation with an AI assistant. Please read it carefully and continue from where it left off, maintaining the same context and tone.\n\n` +
        `Full conversation: ${data.url}`;

      await navigator.clipboard.writeText(passage).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = passage; ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
      });

      saveRecent(platform.id);
      setRecentIds(loadRecent());
      setStatus('done');
      setStatusMsg(`✓ Copied! Opening ${platform.name}…`);
      setTimeout(() => window.open(platform.url, '_blank'), 400);
      setTimeout(() => { onClose(); setStatus('idle'); }, 2000);
    } catch {
      setStatus('error');
      setStatusMsg('Failed — please try again.');
      setTimeout(() => { setStatus('idle'); setSelected(null); }, 2500);
    }
  }

  const cardProps = (platform: Platform) => ({
    platform,
    isSelected: selected === platform.id,
    status,
    statusMsg,
    onGo: () => handleGo(platform),
    disabled: status === 'loading' || status === 'done',
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 450, damping: 32, mass: 0.8 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-[480px] bg-[#0f0f0f] border border-white/[0.09] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.7)] overflow-hidden pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/[0.07]">
                <div>
                  <h2 className="text-white font-bold text-[15px] leading-tight">Continue in another AI</h2>
                  <p className="text-zinc-500 text-[11px] mt-0.5">Generates link · copies passage · opens AI</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 flex items-center justify-center transition-colors"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 pt-3 pb-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search platforms…"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              {/* Scrollable content */}
              <div className="px-4 pb-4 max-h-[380px] overflow-y-auto space-y-3">

                {/* Recently used */}
                <AnimatePresence>
                  {showRecent && (
                    <motion.div
                      key="recent"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-1.5 mb-2 mt-1">
                        <Clock size={10} className="text-zinc-600" />
                        <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Recently used</span>
                      </div>
                      <div className="flex gap-2">
                        {recentPlatforms.map(p => (
                          <motion.button
                            key={p.id}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                            onClick={() => status === 'idle' && handleGo(p)}
                            disabled={status !== 'idle'}
                            className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/6 transition-colors flex-1"
                            style={{ color: p.color }}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.bg }}>
                              {selected === p.id && status === 'loading'
                                ? <Loader2 size={14} className="animate-spin opacity-70" />
                                : selected === p.id && status === 'done'
                                ? <CheckCircle2 size={14} className="text-green-400" />
                                : p.icon}
                            </div>
                            <span className="text-[10px] font-semibold text-zinc-300">{p.name}</span>
                          </motion.button>
                        ))}
                      </div>
                      <div className="h-px bg-white/[0.06] mt-3 mb-1" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* All platforms */}
                {filtered.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 text-sm">No platforms found</div>
                ) : (
                  <motion.div
                    className="grid grid-cols-2 gap-2"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {filtered.map(platform => (
                      <div key={platform.id}>
                        <PlatformCard {...cardProps(platform)} />
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-2.5 border-t border-white/[0.06] bg-black/20">
                <p className="text-[10px] text-zinc-700 text-center">
                  Click any AI → link generated · passage copied · tab opened
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
