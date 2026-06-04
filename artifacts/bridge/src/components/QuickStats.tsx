import React, { useState, useEffect } from 'react';
import { Users, Activity, Heart } from 'lucide-react';
import { STAT_BASES, MANUAL_DONATIONS } from '../constants';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export function QuickStats() {
  const [visitors, setVisitors]   = useState(STAT_BASES.visitors);
  const [uses,     setUses]       = useState(STAT_BASES.uses);
  const [donated,  setDonated]    = useState(MANUAL_DONATIONS);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/stats`);
        if (res.ok && alive) {
          const d = await res.json();
          setVisitors(d.visitors ?? STAT_BASES.visitors);
          setUses(d.uses ?? STAT_BASES.uses);
          setDonated(d.donations ?? MANUAL_DONATIONS);
        }
      } catch { /* keep defaults */ }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="w-full max-w-2xl mt-12 mb-8 border border-zinc-200/50 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 rounded-2xl p-4 sm:p-8 shadow-sm">
      <div className="flex items-center justify-center gap-6 sm:gap-16 flex-wrap">
        <Stat icon={<Users size={16} className="text-yellow-500 dark:text-yellow-400" />} label="Visitors" value={visitors} />
        <div className="w-12 h-px sm:w-px sm:h-12 bg-zinc-200 dark:bg-zinc-800" />
        <Stat icon={<Activity size={16} className="text-green-500 dark:text-green-400" />} label="Uses" value={uses} />
        <div className="w-12 h-px sm:w-px sm:h-12 bg-zinc-200 dark:bg-zinc-800" />
        <Stat icon={<Heart size={16} className="text-rose-500 dark:text-rose-400" />} label="Support" value={donated} />
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-bold">
        {icon} {label}
      </div>
      <div className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white tracking-tight">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
