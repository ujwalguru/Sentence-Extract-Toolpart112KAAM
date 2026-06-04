import React, { useEffect, useRef, useState } from 'react';
import { Activity, Users, Heart } from 'lucide-react';
import RotatingEarth from './RotatingEarth';
import { MANUAL_DONATIONS } from '../constants';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

interface LiveStats {
  visitors: number;
  uses: number;
  donations: number;
}

interface PlatformStat {
  platform: string;
  count: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  ChatGPT:    '#10a37f',
  Claude:     '#D4825A',
  Gemini:     '#4285F4',
  DeepSeek:   '#4D6BFE',
  Grok:       '#a78bfa',
  Perplexity: '#20B2AA',
  'HTML File':'#f59e0b',
  Other:      '#6b7280',
};

function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    const diff = value - prev.current;
    const steps = Math.min(Math.abs(diff), 40);
    const stepSize = diff / steps;
    let step = 0;
    const id = setInterval(() => {
      step++;
      setDisplayed(Math.round(prev.current + stepSize * step));
      if (step >= steps) {
        clearInterval(id);
        setDisplayed(value);
        prev.current = value;
      }
    }, 30);
    return () => clearInterval(id);
  }, [value]);

  return <>{displayed.toLocaleString()}</>;
}

function PlatformBar({ platform, count, max }: { platform: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 4;
  const color = PLATFORM_COLORS[platform] ?? PLATFORM_COLORS.Other;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 w-20 shrink-0 text-right">{platform}</span>
      <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 w-10 text-right shrink-0">
        {count.toLocaleString()}
      </span>
    </div>
  );
}

export function LiveGlobeSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const [stats, setStats] = useState<LiveStats>({ visitors: 15420, uses: 8940, donations: MANUAL_DONATIONS });
  const [platforms, setPlatforms] = useState<PlatformStat[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        const [sRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/api/stats`),
          fetch(`${API_BASE}/api/stats/platforms`),
        ]);
        if (sRes.ok && !cancelled) setStats(await sRes.json());
        if (pRes.ok && !cancelled) setPlatforms(await pRes.json());
      } catch {
        // silently keep last known values
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetWidth,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxPlatformCount = platforms.length > 0 ? platforms[0].count : 1;

  return (
    <div className="w-full max-w-6xl mx-auto mt-12 mb-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-blue-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Live Network
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">
          Global Impact
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          View realtime interactions and live statistics around the world.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-center bg-white dark:bg-[#0a0a0a] rounded-[2rem] sm:rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-xl p-4 sm:p-8 overflow-hidden">

        <div className="lg:col-span-2 relative aspect-square max-h-[500px] flex justify-center items-center overflow-hidden rounded-full" ref={containerRef}>
          {width > 0 && (
            <div className="absolute inset-0 flex items-center justify-center cursor-move w-full h-full">
              <RotatingEarth width={width} height={height} className="w-full h-full" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="p-4 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Users size={18} className="text-yellow-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Visitors</span>
            </div>
            <div className="text-3xl font-mono font-bold text-zinc-900 dark:text-white">
              <AnimatedNumber value={stats.visitors} />
            </div>
            <p className="text-sm text-zinc-400 mt-2">All time platform pageviews</p>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Activity size={18} className="text-green-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total USES</span>
            </div>
            <div className="text-3xl font-mono font-bold text-zinc-900 dark:text-white">
              <AnimatedNumber value={stats.uses} />
            </div>
            <p className="text-sm text-zinc-400 mt-2">Successful bridge interactions</p>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10">
            <div className="flex items-center gap-3 text-zinc-500 mb-4">
              <Heart size={18} className="text-pink-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">Donations</span>
            </div>
            <div className="text-3xl font-mono font-bold text-zinc-900 dark:text-white">
              <AnimatedNumber value={stats.donations} />
            </div>
            <p className="text-sm text-zinc-400 mt-2">Generous donations received</p>
          </div>
        </div>

      </div>

      {platforms.length > 0 && (
        <div className="mt-6 bg-white dark:bg-[#0a0a0a] rounded-[2rem] border border-zinc-200 dark:border-white/10 shadow-xl p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-5">Extractions by Platform</p>
          <div className="flex flex-col gap-3">
            {platforms.map((p) => (
              <PlatformBar key={p.platform} platform={p.platform} count={p.count} max={maxPlatformCount} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
