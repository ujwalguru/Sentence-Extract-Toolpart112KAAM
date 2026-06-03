import React, { useEffect, useState } from 'react';
import { Copy, Download, ExternalLink, CheckCircle2, Loader2, AlertCircle, FileText, User, Bot, Clock, Share2 } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

interface Message {
  role: 'user' | 'assistant' | 'unknown';
  content: string;
}

interface ParsedChat {
  title: string;
  messages: Message[];
  raw: string;
}

function parseRawText(raw: string): ParsedChat {
  const lines = raw.split('\n');
  let title = 'Shared Conversation';
  const messages: Message[] = [];

  if (lines[0]?.startsWith('# ')) {
    title = lines[0].replace(/^# /, '').trim();
  }

  let currentRole: Message['role'] | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentRole && currentLines.join('').trim()) {
      messages.push({ role: currentRole, content: currentLines.join('\n').trim() });
    }
    currentLines = [];
  };

  // Match both "User:" / "## User" (markdown) and "USER:" (formatAsPrompt output)
  const userRe = /^(##\s*)?user\s*:/i;
  const assistantRe = /^(##\s*)?assistant\s*:/i;

  for (const line of lines) {
    if (userRe.test(line)) {
      flush();
      currentRole = 'user';
      const inline = line.replace(userRe, '').trim();
      if (inline) currentLines.push(inline);
    } else if (assistantRe.test(line)) {
      flush();
      currentRole = 'assistant';
      const inline = line.replace(assistantRe, '').trim();
      if (inline) currentLines.push(inline);
    } else if (currentRole) {
      // Skip the preamble line from formatAsPrompt if it appears before any role
      currentLines.push(line);
    }
  }
  flush();

  if (messages.length === 0 && raw.trim()) {
    messages.push({ role: 'unknown', content: raw.trim() });
  }

  return { title, messages, raw };
}

function MessageBubble({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === 'user';
  const isAssistant = msg.role === 'assistant';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
        isUser ? 'bg-blue-500/20 border border-blue-500/30' :
        isAssistant ? 'bg-emerald-500/20 border border-emerald-500/30' :
        'bg-zinc-700/50 border border-zinc-600/30'
      }`}>
        {isUser ? (
          <User size={13} className="text-blue-400" />
        ) : (
          <Bot size={13} className="text-emerald-400" />
        )}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${
          isUser ? 'text-blue-400 text-right' : 'text-emerald-400'
        }`}>
          {isUser ? 'You' : isAssistant ? 'Assistant' : 'Message'}
        </span>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-500/10 border border-blue-500/15 text-zinc-200 rounded-tr-sm'
            : isAssistant
            ? 'bg-zinc-800/80 border border-white/8 text-zinc-200 rounded-tl-sm'
            : 'bg-zinc-800/50 border border-white/5 text-zinc-300'
        }`}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

export function PasteViewer({ pasteId }: { pasteId: string }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error' | 'expired'>('loading');
  const [chat, setChat] = useState<ParsedChat | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState<'link' | 'text' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/paste/${pasteId}`);
        if (res.status === 404) { setState('error'); setErrorMsg('This paste does not exist.'); return; }
        if (res.status === 410) { setState('expired'); return; }
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const raw = await res.text();
        setChat(parseRawText(raw));
        setState('loaded');
      } catch (e: any) {
        setState('error');
        setErrorMsg(e.message || 'Failed to load paste');
      }
    })();
  }, [pasteId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  };

  const copyText = () => {
    if (chat) navigator.clipboard.writeText(chat.raw);
    setCopied('text');
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadText = () => {
    if (!chat) return;
    const blob = new Blob([chat.raw], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openInBridge = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/6 bg-black/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
              <Share2 size={12} className="text-white/70" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-white/90 transition-colors">
              Seamless Bridge
            </span>
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {copied === 'link' ? <CheckCircle2 size={11} className="text-green-400" /> : <Copy size={11} />}
              {copied === 'link' ? 'Copied!' : 'Copy Link'}
            </button>
            <a
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] bg-white text-black rounded-lg hover:bg-zinc-100 transition-all"
            >
              <ExternalLink size={11} />
              Open Bridge
            </a>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={28} className="animate-spin text-zinc-500" />
            <p className="text-sm text-zinc-500 tracking-wide">Loading conversation…</p>
          </div>
        )}

        {state === 'expired' && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2">
              <Clock size={28} className="text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Paste Expired</h1>
            <p className="text-sm text-zinc-500 max-w-xs">This shared conversation has expired. Pastes are available for 7 days after creation.</p>
            <a href="/" className="mt-4 px-5 py-2.5 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-100 transition-colors">
              Create a New Link
            </a>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Not Found</h1>
            <p className="text-sm text-zinc-500 max-w-xs">{errorMsg || 'This paste could not be found.'}</p>
            <a href="/" className="mt-4 px-5 py-2.5 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-100 transition-colors">
              Back to Bridge
            </a>
          </div>
        )}

        {state === 'loaded' && chat && (
          <>
            {/* Meta header */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight mb-1">{chat.title}</h1>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono uppercase tracking-[0.12em]">
                    <span className="flex items-center gap-1">
                      <FileText size={9} />
                      {chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={9} />
                      Expires in 7 days
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={copyText}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    {copied === 'text' ? <CheckCircle2 size={11} className="text-green-400" /> : <Copy size={11} />}
                    {copied === 'text' ? 'Copied!' : 'Copy Text'}
                  </button>
                  <button
                    onClick={downloadText}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <Download size={11} />
                    Download
                  </button>
                </div>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex flex-col gap-4 mb-10">
              {chat.messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} index={i} />
              ))}
            </div>

            {/* CTA */}
            <div className="border border-white/8 rounded-2xl bg-white/2 p-6 text-center">
              <p className="text-sm text-zinc-400 mb-1 font-medium">Continue this conversation in another AI</p>
              <p className="text-[11px] text-zinc-600 mb-4">Seamless Bridge lets you move any chat between ChatGPT, Claude, Gemini and more.</p>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-100 transition-colors"
              >
                <ExternalLink size={14} />
                Open Seamless Bridge
              </a>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 text-center text-[10px] text-zinc-700 font-mono tracking-widest uppercase">
        Seamless Bridge · AI Continuity Tool
      </footer>
    </div>
  );
}
