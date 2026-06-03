import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatData } from '../App';
import {
  X, Download, FileDown, Clock, User, Plus, Trash2,
  ChevronUp, ChevronDown, FileText, Search, ArrowLeftRight,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

interface Message {
  role: string;
  content: string;
  content_html?: string;
  images?: string[];
  timestamp?: string;
}

interface PdfEditorProps { chatData: ChatData; onClose: () => void; }

const THEMES: Record<string, any> = {
  // ── ChatGPT ─────────────────────────────────────────────────────────────
  // Dark charcoal bg, user = rounded dark pill right, assistant = plain left
  'chatgpt': {
    bg: 'bg-[#212121]',
    text: 'text-[#ececf1]',
    titleBorder: 'border-[#3a3a3a]',
    userBubble:      'bg-[#2f2f2f] text-[#ececf1] rounded-[18px] rounded-tr-[4px] px-5 py-3.5 shadow-sm max-w-[85%]',
    assistantBubble: 'text-[#ececf1] px-1 py-1',
    role:    'text-[#8e8ea0] text-[9px] tracking-[0.18em]',
    footer:  'text-[#565869] border-[#3a3a3a]',
    proseClass: 'prose-invert',
    isDark: true,
    fontFamily: '"Söhne", ui-sans-serif, system-ui, -apple-system, sans-serif',
    codeBlockBg: '#0d0d0d',
    codeBlockBorder: '#3a3a3a',
    inlineCodeBg: 'rgba(255,255,255,0.1)',
    inlineCodeColor: '#ef4444',
    titleColor: '#ececf1',
  },

  // ── Claude (Anthropic) ──────────────────────────────────────────────────
  // Warm cream bg, orange accent, user = warm tan pill right, assistant = plain serif
  'claude': {
    bg: 'bg-[#faf9f5]',
    text: 'text-[#3d3929]',
    titleBorder: 'border-[#e5e0d8]',
    userBubble:      'bg-[#ede8dc] text-[#3d3929] rounded-[20px] rounded-tr-[4px] px-5 py-3.5 shadow-sm max-w-[85%] border border-[#ddd8ce]',
    assistantBubble: 'text-[#3d3929] px-1 py-1',
    role:    'text-[#b5a898] text-[9px] tracking-[0.12em] font-medium',
    footer:  'text-[#b5a898] border-[#e5e0d8]',
    proseClass: 'prose-stone',
    isDark: false,
    fontFamily: '"Tiempos Text", Georgia, "Times New Roman", serif',
    codeBlockBg: '#1a1814',
    codeBlockBorder: '#3a3530',
    inlineCodeBg: '#f0ebe2',
    inlineCodeColor: '#c2410c',
    titleColor: '#1a1714',
    accentColor: '#d97757',
  },

  // ── Gemini (Google) ──────────────────────────────────────────────────────
  // Clean white, Google blue accent, user = blue-gray rounded pill, assistant = plain
  'gemini': {
    bg: 'bg-[#ffffff]',
    text: 'text-[#1f1f1f]',
    titleBorder: 'border-[#e8eaed]',
    userBubble:      'bg-[#dde3ea] text-[#1f1f1f] rounded-[22px] rounded-tr-[5px] px-5 py-3.5 shadow-sm max-w-[85%]',
    assistantBubble: 'text-[#1f1f1f] px-1 py-1',
    role:    'text-[#5f6368] text-[9px] tracking-[0.12em] font-medium',
    footer:  'text-[#9aa0a6] border-[#e8eaed]',
    proseClass: 'prose-zinc',
    isDark: false,
    fontFamily: '"Google Sans", "Roboto", ui-sans-serif, system-ui, sans-serif',
    codeBlockBg: '#202124',
    codeBlockBorder: '#3c4043',
    inlineCodeBg: '#f1f3f4',
    inlineCodeColor: '#d93025',
    titleColor: '#1f1f1f',
    accentColor: '#1a73e8',
  },

  // ── DeepSeek ──────────────────────────────────────────────────────────────
  // White/light gray, blue accent (#4D6BFE), both messages in bordered cards
  'deepseek': {
    bg: 'bg-[#f7f7f8]',
    text: 'text-[#0f172a]',
    titleBorder: 'border-[#e5e7eb]',
    userBubble:      'bg-[#4d6bfe] text-white rounded-[18px] rounded-tr-[4px] px-5 py-3.5 shadow-sm max-w-[85%]',
    assistantBubble: 'bg-white text-[#0f172a] rounded-[12px] px-5 py-4 border border-[#e5e7eb] shadow-sm w-full',
    role:    'text-[#6b7280] text-[9px] tracking-[0.15em] uppercase font-semibold',
    footer:  'text-[#9ca3af] border-[#e5e7eb]',
    proseClass: 'prose-slate',
    isDark: false,
    fontFamily: '"PingFang SC", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif',
    codeBlockBg: '#1e1e2e',
    codeBlockBorder: '#313244',
    inlineCodeBg: '#eff6ff',
    inlineCodeColor: '#4d6bfe',
    titleColor: '#0f172a',
    accentColor: '#4d6bfe',
  },

  // ── Perplexity ────────────────────────────────────────────────────────────
  // Near-black bg, teal accent, clean minimal cards
  'perplexity': {
    bg: 'bg-[#1c1c1c]',
    text: 'text-[#e8e8e8]',
    titleBorder: 'border-[#2e2e2e]',
    userBubble:      'bg-[#20b2aa1a] text-[#e8e8e8] rounded-[16px] rounded-tr-[3px] px-5 py-3.5 border border-[#20b2aa33] max-w-[85%]',
    assistantBubble: 'bg-[#242424] text-[#e8e8e8] rounded-[12px] px-5 py-4 border border-[#2e2e2e] w-full',
    role:    'text-[#20b2aa] text-[9px] tracking-[0.18em] uppercase font-bold',
    footer:  'text-[#555] border-[#2e2e2e]',
    proseClass: 'prose-invert',
    isDark: true,
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    codeBlockBg: '#141414',
    codeBlockBorder: '#2e2e2e',
    inlineCodeBg: 'rgba(32,178,170,0.12)',
    inlineCodeColor: '#20b2aa',
    titleColor: '#e8e8e8',
    accentColor: '#20b2aa',
  },

  // ── Grok (xAI) ───────────────────────────────────────────────────────────
  // Pure black, Twitter/X blue pill for user, assistant plain on black
  'grok': {
    bg: 'bg-[#000000]',
    text: 'text-[#e7e9ea]',
    titleBorder: 'border-[#2f3336]',
    userBubble:      'bg-[#1d9bf0] text-white rounded-[20px] rounded-tr-[4px] px-5 py-3 shadow-md max-w-[85%]',
    assistantBubble: 'text-[#e7e9ea] px-1 py-1',
    role:    'text-[#536471] text-[9px] tracking-[0.1em] font-bold',
    footer:  'text-[#536471] border-[#2f3336]',
    proseClass: 'prose-invert',
    isDark: true,
    fontFamily: '"Chirp", "TwitterChirp", ui-sans-serif, system-ui, -apple-system, sans-serif',
    codeBlockBg: '#15202b',
    codeBlockBorder: '#2f3336',
    inlineCodeBg: 'rgba(29,155,240,0.12)',
    inlineCodeColor: '#1d9bf0',
    titleColor: '#e7e9ea',
    accentColor: '#1d9bf0',
  },

  // ── Notion ────────────────────────────────────────────────────────────────
  // Minimal document style, serif feel, user = light gray, assistant = plain
  'notion': {
    bg: 'bg-white',
    text: 'text-[#37352f]',
    titleBorder: 'border-[#e9e9e7]',
    userBubble:      'bg-[#f1f1ef] text-[#37352f] rounded-[4px] px-4 py-3 max-w-[85%] border border-[#e9e9e7]',
    assistantBubble: 'text-[#37352f] px-1 py-1',
    role:    'text-[#9b9a97] text-[9px] tracking-[0.1em] lowercase',
    footer:  'text-[#9b9a97] border-[#e9e9e7]',
    proseClass: 'prose-stone',
    isDark: false,
    fontFamily: '"Georgia", "Times New Roman", ui-serif, serif',
    codeBlockBg: '#f7f6f3',
    codeBlockBorder: '#e9e9e7',
    inlineCodeBg: '#f7f6f3',
    inlineCodeColor: '#eb5757',
    titleColor: '#37352f',
  },

  // ── Minimal Light ─────────────────────────────────────────────────────────
  'minimal-light': {
    bg: 'bg-white',
    text: 'text-gray-900',
    titleBorder: 'border-gray-200',
    userBubble:      'bg-gray-100 text-gray-900 border border-gray-200 rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-[85%]',
    assistantBubble: 'text-gray-800 px-1 py-1',
    role:    'text-gray-400 text-[9px] tracking-widest',
    footer:  'text-gray-400 border-gray-200',
    proseClass: 'prose-zinc',
    isDark: false,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    codeBlockBg: '#18181b',
    codeBlockBorder: '#3f3f46',
    inlineCodeBg: '#f4f4f5',
    inlineCodeColor: '#e11d48',
    titleColor: '#111827',
  },

  // ── Minimal Dark ──────────────────────────────────────────────────────────
  'minimal-dark': {
    bg: 'bg-[#111111]',
    text: 'text-[#d4d4d4]',
    titleBorder: 'border-[#2a2a2a]',
    userBubble:      'bg-[#1e1e1e] text-[#d4d4d4] border border-[#2a2a2a] rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-[85%]',
    assistantBubble: 'text-[#a3a3a3] px-1 py-1',
    role:    'text-[#525252] text-[9px] tracking-widest',
    footer:  'text-[#404040] border-[#2a2a2a]',
    proseClass: 'prose-invert prose-zinc',
    isDark: true,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    codeBlockBg: '#0a0a0a',
    codeBlockBorder: '#2a2a2a',
    inlineCodeBg: 'rgba(255,255,255,0.07)',
    inlineCodeColor: '#f87171',
    titleColor: '#e5e5e5',
  },
};

const THEME_LABELS: Record<string, string> = {
  'chatgpt': 'ChatGPT',
  'claude': 'Claude',
  'gemini': 'Gemini',
  'deepseek': 'DeepSeek',
  'perplexity': 'Perplexity',
  'grok': 'Grok',
  'notion': 'Notion',
  'minimal-light': 'Light',
  'minimal-dark': 'Dark',
};

/* ── Pixel-accurate brand SVG icons (12×12) ─────────────────────────── */
const THEME_ICONS: Record<string, React.ReactNode> = {
  /* OpenAI / ChatGPT — green polygonal knot */
  chatgpt: (
    <svg width="13" height="13" viewBox="0 0 41 41" fill="none">
      <path d="M37.53 16.47a10.23 10.23 0 00-.88-8.4A10.37 10.37 0 0025.5 3.1a10.24 10.24 0 00-7.7-3.1 10.37 10.37 0 00-9.89 7.18 10.24 10.24 0 00-6.84 4.96 10.37 10.37 0 001.28 12.16 10.23 10.23 0 00.88 8.4 10.37 10.37 0 0011.15 4.98 10.24 10.24 0 007.7 3.1 10.37 10.37 0 009.9-7.19 10.24 10.24 0 006.83-4.96 10.37 10.37 0 00-1.28-12.16zM24.17 38.18a7.69 7.69 0 01-4.94-1.79l.24-.14 8.2-4.73a1.36 1.36 0 00.69-1.19v-11.6l3.47 2a.12.12 0 01.07.1v9.57a7.73 7.73 0 01-7.73 7.78zM6.27 31.2a7.69 7.69 0 01-.92-5.2l.24.15 8.2 4.73a1.36 1.36 0 001.38 0l10.02-5.78v4a.13.13 0 01-.05.11L16.9 34a7.73 7.73 0 01-10.63-2.8zm-1.68-17a7.69 7.69 0 014.02-3.39v9.7a1.36 1.36 0 00.69 1.18l10.01 5.78-3.47 2a.13.13 0 01-.12.01L7.3 25.1a7.73 7.73 0 01-2.7-10.9zm28.52 6.63l-10.02-5.79 3.47-2a.13.13 0 01.12-.01l8.42 4.86a7.73 7.73 0 01-1.2 13.95v-9.7a1.36 1.36 0 00-.79-1.31zm3.46-5.23l-.24-.15-8.2-4.73a1.36 1.36 0 00-1.38 0L16.73 16.5v-4a.13.13 0 01.05-.11L24.1 7.6a7.73 7.73 0 0111.44 8.01zM15.14 22.16l-3.47-2a.12.12 0 01-.07-.1v-9.57a7.73 7.73 0 0112.68-5.93l-.24.14-8.2 4.73a1.36 1.36 0 00-.69 1.19l-.01 11.54zm1.88-4.07l4.46-2.57 4.46 2.57v5.14l-4.46 2.58-4.46-2.58v-5.14z" fill="#10a37f"/>
    </svg>
  ),
  /* Anthropic / Claude — orange stylized A */
  claude: (
    <svg width="13" height="13" viewBox="0 0 46 46" fill="none">
      <path d="M32.73 7H26.5L38.5 39h6.23L32.73 7zm-19.46 0L1.27 39H7.5l2.48-6.82h12.3L24.76 39H31L19.27 7h-6zm-1.5 19.7l4.23-11.6 4.23 11.6H11.77z" fill="#d97757"/>
    </svg>
  ),
  /* Google Gemini — four-point gradient star */
  gemini: (
    <svg width="13" height="13" viewBox="0 0 28 28" fill="none">
      <defs>
        <linearGradient id="gGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4285f4"/>
          <stop offset="50%" stopColor="#9b72cb"/>
          <stop offset="100%" stopColor="#d96570"/>
        </linearGradient>
      </defs>
      <path d="M14 2C14 8.63 8.63 14 2 14c6.63 0 12 5.37 12 12 0-6.63 5.37-12 12-12-6.63 0-12-5.37-12-12z" fill="url(#gGrad)"/>
    </svg>
  ),
  /* DeepSeek — stylized whale/wave in brand blue */
  deepseek: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#4d6bfe"/>
      <path d="M7 15c1.5-4 3-6 5-6s3.5 2 5 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <circle cx="9.5" cy="10.5" r="1" fill="white"/>
    </svg>
  ),
  /* Perplexity — teal hexagonal mark */
  perplexity: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="#20b2aa" opacity=".9"/>
      <path d="M12 2v20M3 7l9 5 9-5" stroke="#0d7377" strokeWidth="1" fill="none"/>
    </svg>
  ),
  /* Grok / xAI — white X on black */
  grok: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#000"/>
      <path d="M4 4l16 16M20 4L4 20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  /* Notion — black N */
  notion: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="3" fill="#fff" stroke="#e9e9e7" strokeWidth="1.5"/>
      <path d="M6 4.5h3.5L18 16V7.5h-2.5v-3H18.5a1 1 0 011 1V20h-3.5L7.5 8.5V17H10v3H5.5a1 1 0 01-1-1V4.5H6z" fill="#37352f"/>
    </svg>
  ),
  /* Minimal Light — sun */
  'minimal-light': (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill="#f59e0b"/>
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  /* Minimal Dark — crescent moon */
  'minimal-dark': (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" fill="#818cf8"/>
    </svg>
  ),
};

const ROLE_CYCLE = ['user', 'assistant', 'system'];

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function AutoResizeTextarea({ value, onChange, onBlur, className, style, autoFocus }: any) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = `${ref.current.scrollHeight}px`; }
  };
  useEffect(() => { resize(); }, [value]);
  useEffect(() => { if (autoFocus && ref.current) { ref.current.focus(); ref.current.selectionStart = ref.current.value.length; } }, [autoFocus]);
  return (
    <textarea
      ref={ref} value={value}
      onChange={e => { onChange(e.target.value); resize(); }}
      onBlur={onBlur}
      className={className}
      style={{ ...style, overflow: 'hidden', resize: 'none', width: '100%' }}
    />
  );
}

const ROLE_AVATARS: Record<string, { emoji: string; color: string }> = {
  user: { emoji: '👤', color: '#6366f1' },
  assistant: { emoji: '🤖', color: '#10b981' },
  human: { emoji: '👤', color: '#6366f1' },
  model: { emoji: '🤖', color: '#10b981' },
  system: { emoji: '⚙️', color: '#f59e0b' },
};

const PdfMessage = React.memo(function PdfMessage({
  msg, idx, currentTheme, fontSize, editingIdx, setEditingIdx,
  onRoleChange, onContentChange, onDelete, onMoveUp, onMoveDown,
  showAvatars, isFirst, isLast,
}: any) {
  const isUser = msg.role === 'user' || msg.role === 'human';
  const avatar = ROLE_AVATARS[msg.role?.toLowerCase()] ?? { emoji: '💬', color: '#94a3b8' };
  const isEditing = editingIdx === idx;
  const displayContent = msg.content_html || msg.content;

  return (
    <div data-msgidx={idx} className={`group flex w-full gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`} style={{ pageBreakInside: 'avoid' }}>
      {/* Avatar */}
      {showAvatars && (
        <div className="flex-shrink-0 pt-1" style={{ width: 30, height: 30, borderRadius: '50%', background: avatar.color + '22', border: `2px solid ${avatar.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
          {avatar.emoji}
        </div>
      )}

      <div className={`flex flex-col flex-1 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Role + actions row */}
        <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <button
            onClick={() => {
              const cur = ROLE_CYCLE.indexOf(msg.role.toLowerCase());
              onRoleChange(idx, ROLE_CYCLE[(cur + 1) % ROLE_CYCLE.length]);
            }}
            className={`text-[10px] uppercase tracking-widest font-bold px-1 rounded hover:opacity-60 transition-opacity ${currentTheme.role}`}
            title="Click to change role"
            style={{ outline: 'none' }}
          >{msg.role}</button>

          {/* Per-message controls — visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onMoveUp(idx)} disabled={isFirst} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 transition-colors" title="Move up"><ChevronUp size={11} /></button>
            <button onClick={() => onMoveDown(idx)} disabled={isLast} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 transition-colors" title="Move down"><ChevronDown size={11} /></button>
            <button onClick={() => onDelete(idx)} className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-500/20 text-red-400 transition-colors" title="Delete"><Trash2 size={11} /></button>
          </div>
        </div>

        {/* Images */}
        {msg.images?.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {msg.images.map((url: string, i: number) => (
              <img key={i} src={url} alt="attachment" className="max-w-full rounded-xl border border-gray-200/20" style={{ maxHeight: 240, objectFit: 'contain' }} />
            ))}
          </div>
        )}

        {/* Content — single click to edit */}
        <div
          className={`w-full ${msg.role === 'user' || msg.role === 'human' ? currentTheme.userBubble : currentTheme.assistantBubble}`}
          style={{ wordBreak: 'break-word' }}
        >
          {isEditing ? (
            <AutoResizeTextarea
              autoFocus
              value={msg.content}
              onChange={(v: string) => onContentChange(idx, v)}
              onBlur={() => setEditingIdx(null)}
              className={`w-full bg-transparent border-none focus:ring-0 p-0 m-0 outline-none font-sans leading-relaxed`}
              style={{ minHeight: 60, color: 'inherit', fontSize: fontSize === 'sm' ? 13 : fontSize === 'lg' ? 17 : 15 }}
            />
          ) : (
            <div
              onClick={() => setEditingIdx(idx)}
              className={`prose max-w-none cursor-text ${fontSize === 'sm' ? 'prose-sm' : fontSize === 'lg' ? 'prose-lg' : 'prose-base'} ${currentTheme.proseClass} relative group/content`}
              title="Click to edit"
            >
              <div className="absolute -inset-1 border border-dashed border-transparent group-hover/content:border-blue-400/40 rounded-lg pointer-events-none transition-colors" />
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}
                components={{
                  pre: ({ node, ...props }) => (
                    <pre style={{ background: currentTheme.codeBlockBg || '#1e1e1e', border: `1px solid ${currentTheme.codeBlockBorder || '#3a3a3a'}`, color: '#e4e4e7' }}
                      className="p-4 rounded-xl overflow-x-auto text-[13px] font-mono my-4 leading-relaxed" {...props} />
                  ),
                  code: ({ node, inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match
                      ? <code className={className} {...props}>{children}</code>
                      : <code style={{ background: currentTheme.inlineCodeBg || 'rgba(0,0,0,0.08)', color: currentTheme.inlineCodeColor || '#e11d48' }}
                          className="rounded-md px-1.5 py-0.5 text-[0.88em] font-mono" {...props}>{children}</code>;
                  },
                }}
              >{displayContent}</ReactMarkdown>
            </div>
          )}
        </div>

      </div>
    </div>
  );
});

function Divider() { return <div className="w-px h-6 bg-zinc-200 dark:bg-white/10 shrink-0 mx-0.5" />; }

function Toggle({ on, onToggle, label, icon }: { on: boolean; onToggle: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button type="button" onClick={onToggle} title={label}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${on ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' : 'bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/20'}`}
    >{icon}<span className="hidden sm:inline">{label}</span></button>
  );
}

export function PdfEditor({ chatData, onClose }: PdfEditorProps) {
  const [pdfName, setPdfName] = useState(chatData.title || 'AI_Chat_Export');
  const [messages, setMessages] = useState<Message[]>(() => chatData.messages.map(m => ({ ...m })));
  const [exporting, setExporting] = useState(false);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [margin, setMargin] = useState(20);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('sm');
  const [pdfTheme, setPdfTheme] = useState('chatgpt');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [exportingWord, setExportingWord] = useState(false);
  const [showAvatars, setShowAvatars] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchIdx, setMatchIdx] = useState(0);

  const currentTheme = THEMES[pdfTheme];
  const pdfRef = useRef<HTMLDivElement>(null);

  // Find & Replace helpers
  const matchingIndices = findText.trim()
    ? messages.reduce<number[]>((acc, msg, i) => {
        if ((msg.content_html || msg.content).toLowerCase().includes(findText.toLowerCase())) acc.push(i);
        return acc;
      }, [])
    : [];

  const clampedMatch = matchingIndices.length ? matchIdx % matchingIndices.length : 0;
  const currentMatchMsgIdx = matchingIndices[clampedMatch] ?? -1;

  const scrollToMsg = useCallback((msgIdx: number) => {
    const el = document.querySelector<HTMLElement>(`[data-msgidx="${msgIdx}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleFindNext = useCallback(() => {
    if (!matchingIndices.length) return;
    const next = (clampedMatch + 1) % matchingIndices.length;
    setMatchIdx(next);
    scrollToMsg(matchingIndices[next]);
  }, [matchingIndices, clampedMatch, scrollToMsg]);

  const handleFindPrev = useCallback(() => {
    if (!matchingIndices.length) return;
    const prev = (clampedMatch - 1 + matchingIndices.length) % matchingIndices.length;
    setMatchIdx(prev);
    scrollToMsg(matchingIndices[prev]);
  }, [matchingIndices, clampedMatch, scrollToMsg]);

  const handleReplaceCurrent = useCallback(() => {
    if (currentMatchMsgIdx === -1 || !findText.trim()) return;
    setMessages(prev => {
      const u = [...prev];
      const msg = u[currentMatchMsgIdx];
      const content = msg.content_html || msg.content;
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      u[currentMatchMsgIdx] = { ...msg, content: content.replace(regex, replaceText), content_html: undefined };
      return u;
    });
    toast.success('Replaced 1 match');
  }, [currentMatchMsgIdx, findText, replaceText]);

  const handleReplaceAll = useCallback(() => {
    if (!findText.trim()) return;
    const count = matchingIndices.length;
    if (!count) { toast.error('No matches found'); return; }
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    setMessages(prev => prev.map(msg => {
      const content = msg.content_html || msg.content;
      if (!content.toLowerCase().includes(findText.toLowerCase())) return msg;
      return { ...msg, content: content.replace(regex, replaceText), content_html: undefined };
    }));
    toast.success(`Replaced ${count} match${count !== 1 ? 'es' : ''}`);
  }, [findText, replaceText, matchingIndices]);

  const handleContentChange = useCallback((idx: number, val: string) => {
    setMessages(prev => { const u = [...prev]; u[idx] = { ...u[idx], content: val, content_html: undefined }; return u; });
  }, []);

  const handleRoleChange = useCallback((idx: number, role: string) => {
    setMessages(prev => { const u = [...prev]; u[idx] = { ...u[idx], role }; return u; });
  }, []);

  const handleDelete = useCallback((idx: number) => {
    setMessages(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleMoveUp = useCallback((idx: number) => {
    if (idx === 0) return;
    setMessages(prev => { const u = [...prev]; [u[idx - 1], u[idx]] = [u[idx], u[idx - 1]]; return u; });
  }, []);

  const handleMoveDown = useCallback((idx: number) => {
    setMessages(prev => {
      if (idx >= prev.length - 1) return prev;
      const u = [...prev]; [u[idx], u[idx + 1]] = [u[idx + 1], u[idx]]; return u;
    });
  }, []);

  const handleAddMessage = (role: 'user' | 'assistant') => {
    setMessages(prev => [...prev, { role, content: '' }]);
    setTimeout(() => setEditingIdx(messages.length), 50);
  };

  const handleWordExport = async () => {
    setExportingWord(true);
    toast.promise(
      (async () => {
        const doc = new Document({ sections: [{ properties: {}, children: [
          new Paragraph({ text: pdfName, heading: HeadingLevel.HEADING_1, spacing: { after: 400 } }),
          ...messages.flatMap(msg => [
            new Paragraph({ children: [new TextRun({ text: msg.role.toUpperCase(), bold: true, color: '888888', size: 20 })], spacing: { before: 200, after: 100 } }),
            ...stripHtml(msg.content_html || msg.content).split('\n').map(line =>
              new Paragraph({ children: [new TextRun({ text: line, size: 22 })], spacing: { after: 100 } })
            ),
          ]),
        ]}] });
        saveAs(await Packer.toBlob(doc), `${pdfName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`);
      })(),
      {
        loading: 'Building Word document…',
        success: () => { setExportingWord(false); return 'Word document downloaded!'; },
        error: (e) => { setExportingWord(false); console.error(e); return 'Word export failed.'; },
      }
    );
  };

  const handleExport = async () => {
    if (!pdfRef.current) return;
    // Exit edit mode first so textarea content is captured
    setEditingIdx(null);
    setExporting(true);
    await new Promise(r => setTimeout(r, 150));
    toast.promise(
      (async () => {
        const html2pdf = (await import('html2pdf.js')).default;
        await html2pdf().from(pdfRef.current!).set({
          margin: 10,
          filename: `${pdfName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm' as const, format: pageSize, orientation: 'portrait' as const },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        }).save();
      })(),
      {
        loading: 'Generating PDF…',
        success: () => { setExporting(false); return 'PDF downloaded!'; },
        error: (e) => { setExporting(false); console.error(e); return 'Failed to generate PDF.'; },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-100 dark:bg-[#0a0a0a]">

      {/* Live preview badge */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full border border-zinc-200 dark:border-white/10 shadow-sm pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold">Live Edit — Click message to edit · Click role to change · Hover for move/delete</span>
      </div>

      {/* Document scroll area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 flex items-start justify-center" style={{ paddingBottom: showFindReplace ? (toolbarExpanded ? '360px' : '190px') : (toolbarExpanded ? '280px' : '110px') }}>
        <div
          className={`${currentTheme.bg} ${currentTheme.text} shadow-2xl rounded-sm overflow-hidden transition-all duration-300`}
          style={{
            width: pageSize === 'a4' ? '210mm' : '215.9mm',
            minHeight: pageSize === 'a4' ? '297mm' : pageSize === 'letter' ? '279.4mm' : '355.6mm',
            padding: `${margin}mm`,
            fontFamily: currentTheme.fontFamily || 'Inter, system-ui, sans-serif',
          }}
        >
          <div ref={pdfRef} className="w-full h-full pb-8">
            {/* Editable title */}
            <h1
              className={`text-3xl font-extrabold tracking-tight mb-8 pb-4 border-b ${currentTheme.titleBorder} leading-tight hover:bg-black/5 dark:hover:bg-white/5 transition-colors p-2 -mx-2 rounded`}
              style={{ wordBreak: 'break-word', outline: 'none', color: currentTheme.titleColor || 'inherit' }}
              contentEditable suppressContentEditableWarning
              onBlur={e => setPdfName(e.currentTarget.textContent || 'AI_Chat_Export')}
              title="Click to edit title"
              suppressHydrationWarning
            >{pdfName}</h1>

            {/* Messages */}
            <div className={`flex flex-col ${compactMode ? 'gap-2' : 'gap-6'}`}>
              {messages.map((msg, idx) => (
                <PdfMessage
                  key={idx}
                  msg={msg} idx={idx}
                  currentTheme={currentTheme} fontSize={fontSize}
                  editingIdx={editingIdx} setEditingIdx={setEditingIdx}
                  onRoleChange={handleRoleChange}
                  onContentChange={handleContentChange}
                  onDelete={handleDelete}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  showAvatars={showAvatars}
                  showTimestamps={showTimestamps}
                  isFirst={idx === 0}
                  isLast={idx === messages.length - 1}
                />
              ))}
            </div>

            {/* Inline add buttons */}
            <div className="mt-8 flex gap-3 justify-center opacity-40 hover:opacity-100 transition-opacity">
              <button onClick={() => handleAddMessage('user')} className="flex items-center gap-1 px-3 py-1.5 border-2 border-dashed border-indigo-300 text-indigo-400 rounded-xl text-[10px] font-bold uppercase tracking-wide hover:border-indigo-500 hover:text-indigo-600 transition-colors">
                <Plus size={11} /> User
              </button>
              <button onClick={() => handleAddMessage('assistant')} className="flex items-center gap-1 px-3 py-1.5 border-2 border-dashed border-emerald-300 text-emerald-400 rounded-xl text-[10px] font-bold uppercase tracking-wide hover:border-emerald-500 hover:text-emerald-600 transition-colors">
                <Plus size={11} /> AI
              </button>
            </div>

            {/* Footer */}
            <div className={`mt-12 pt-4 border-t text-center text-[10px] font-mono ${currentTheme.footer}`}>
              Generated by Seamless AI Continuity Bridge
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating bottom toolbar ─────────────────────────────────────── */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">

        {/* Expanded settings tray — slides up */}
        {toolbarExpanded && (
          <div className="bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 flex flex-wrap gap-x-6 gap-y-4 max-w-[90vw] sm:max-w-2xl">

            {/* Document name */}
            <div className="flex flex-col gap-1 min-w-[160px]">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Document Name</span>
              <input
                type="text" value={pdfName}
                onChange={e => setPdfName(e.target.value)}
                className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:text-white w-full"
              />
            </div>

            {/* Page size */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Page</span>
              <select value={pageSize} onChange={e => setPageSize(e.target.value as any)}
                className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none dark:text-white appearance-none cursor-pointer">
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
              </select>
            </div>

            {/* Font size */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Font</span>
              <select value={fontSize} onChange={e => setFontSize(e.target.value as any)}
                className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none dark:text-white appearance-none cursor-pointer">
                <option value="sm">Small</option>
                <option value="base">Normal</option>
                <option value="lg">Large</option>
              </select>
            </div>

            {/* Margin */}
            <div className="flex flex-col gap-1 min-w-[140px]">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Margin ({margin}mm)</span>
              <input type="range" min={0} max={40} step={5} value={margin}
                onChange={e => setMargin(Number(e.target.value))}
                className="w-full accent-zinc-900 dark:accent-white mt-1" />
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2 justify-end">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Display</span>
              <div className="flex gap-2">
                <Toggle on={showAvatars} onToggle={() => setShowAvatars(v => !v)} label="Avatars" icon={<User size={11} />} />
                <Toggle on={showTimestamps} onToggle={() => setShowTimestamps(v => !v)} label="Times" icon={<Clock size={11} />} />
                <Toggle on={compactMode} onToggle={() => setCompactMode(v => !v)} label="Compact" icon={<ChevronDown size={11} />} />
              </div>
            </div>

            {/* Add message */}
            <div className="flex flex-col gap-2 justify-end">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Add</span>
              <div className="flex gap-2">
                <button onClick={() => handleAddMessage('user')} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wide hover:bg-indigo-100 transition-colors">
                  <Plus size={10} /> User
                </button>
                <button onClick={() => handleAddMessage('assistant')} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wide hover:bg-emerald-100 transition-colors">
                  <Plus size={10} /> AI
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Find & Replace panel ── */}
        {showFindReplace && (
          <div className="mb-2 flex items-center gap-2 bg-white dark:bg-[#1a1a1a] border border-violet-300 dark:border-violet-500/40 rounded-2xl shadow-2xl px-3 py-2.5 w-full max-w-2xl mx-auto">
            <Search size={13} className="text-violet-500 shrink-0" />
            <input
              autoFocus
              placeholder="Find…"
              value={findText}
              onChange={e => { setFindText(e.target.value); setMatchIdx(0); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.shiftKey ? handleFindPrev() : handleFindNext(); } if (e.key === 'Escape') setShowFindReplace(false); }}
              className="flex-1 min-w-0 bg-transparent outline-none text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400"
            />
            {/* Match indicator */}
            <span className={`text-[10px] font-bold shrink-0 tabular-nums px-1.5 py-0.5 rounded-md ${matchingIndices.length ? 'text-violet-600 bg-violet-50 dark:bg-violet-500/10' : findText ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-zinc-400'}`}>
              {findText ? (matchingIndices.length ? `${clampedMatch + 1}/${matchingIndices.length}` : '0 found') : ''}
            </span>
            <button onClick={handleFindPrev} disabled={!matchingIndices.length} title="Previous (Shift+Enter)"
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 disabled:opacity-30 transition-colors">
              <ChevronLeft size={13} />
            </button>
            <button onClick={handleFindNext} disabled={!matchingIndices.length} title="Next (Enter)"
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 disabled:opacity-30 transition-colors">
              <ChevronRight size={13} />
            </button>
            <div className="w-px h-4 bg-zinc-200 dark:bg-white/10 shrink-0" />
            <ArrowLeftRight size={12} className="text-zinc-400 shrink-0" />
            <input
              placeholder="Replace with…"
              value={replaceText}
              onChange={e => setReplaceText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleReplaceCurrent(); if (e.key === 'Escape') setShowFindReplace(false); }}
              className="flex-1 min-w-0 bg-transparent outline-none text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400"
            />
            <button onClick={handleReplaceCurrent} disabled={!matchingIndices.length}
              className="px-2 py-1 rounded-lg bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[10px] font-bold uppercase tracking-wide hover:bg-violet-200 dark:hover:bg-violet-500/25 disabled:opacity-30 transition-colors whitespace-nowrap">
              Replace
            </button>
            <button onClick={handleReplaceAll} disabled={!matchingIndices.length}
              className="px-2 py-1 rounded-lg bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wide hover:bg-violet-700 disabled:opacity-30 transition-colors whitespace-nowrap">
              All
            </button>
            <button onClick={() => setShowFindReplace(false)} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-400 transition-colors">
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── Main pill ── */}
        <div className="flex items-center gap-1 bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-white/10 rounded-full shadow-2xl px-2 py-2">

          {/* Close */}
          <button onClick={onClose} className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors" title="Close">
            <X size={16} />
          </button>

          <Divider />

          {/* Title chip */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 max-w-[130px]">
            <FileText size={12} />
            <span className="text-xs font-medium truncate">{pdfName}</span>
          </div>

          {/* Message counter chip */}
          {(() => {
            const pageHeightMm = pageSize === 'a4' ? 297 : pageSize === 'letter' ? 279.4 : 355.6;
            const usableMm = pageHeightMm - margin * 2 - 30; // 30mm for title
            const msgHeightMm = compactMode
              ? (fontSize === 'sm' ? 14 : fontSize === 'lg' ? 22 : 17)
              : (fontSize === 'sm' ? 28 : fontSize === 'lg' ? 42 : 34);
            const perPage = Math.max(1, Math.floor(usableMm / msgHeightMm));
            const pages = Math.ceil(messages.length / perPage);
            return (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shrink-0" title={`${messages.length} messages · ~${perPage} per page · ~${pages} page${pages !== 1 ? 's' : ''}`}>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tabular-nums">{messages.length}</span>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500">msgs</span>
                <span className="w-px h-3 bg-zinc-300 dark:bg-white/10 mx-0.5" />
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tabular-nums">~{perPage}</span>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500">/pg</span>
                <span className="w-px h-3 bg-zinc-300 dark:bg-white/10 mx-0.5" />
                <span className="text-[10px] font-bold text-violet-500 tabular-nums">{pages}p</span>
              </div>
            );
          })()}

          <Divider />

          {/* Theme chips */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
            {Object.entries(THEME_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setPdfTheme(k)} title={v}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  pdfTheme === k
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10'
                }`}
              >
                <span className="flex-shrink-0 opacity-90">{THEME_ICONS[k]}</span>
                <span className="hidden sm:inline">{v}</span>
              </button>
            ))}
          </div>

          <Divider />

          {/* Find & Replace toggle */}
          <button
            onClick={() => setShowFindReplace(v => !v)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${showFindReplace ? 'bg-violet-600 text-white shadow' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10'}`}
            title="Find & Replace (Ctrl+H)"
          >
            <Search size={13} />
            <span className="hidden sm:inline">Find</span>
          </button>

          <Divider />

          {/* Settings expand */}
          <button
            onClick={() => setToolbarExpanded(v => !v)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${toolbarExpanded ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10'}`}
            title="More settings"
          >
            {toolbarExpanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            <span className="hidden sm:inline">Settings</span>
          </button>

          <Divider />

          {/* Word export */}
          <button onClick={handleWordExport} disabled={exportingWord}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
            title="Download Word (.docx)">
            {exportingWord ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileDown size={13} />}
            <span className="hidden sm:inline">Word</span>
          </button>

          {/* PDF export */}
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-black text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
            title="Download PDF">
            {exporting ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black rounded-full animate-spin" /> : <Download size={13} />}
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
