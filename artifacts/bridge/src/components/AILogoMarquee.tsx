import React from 'react';

const aiModels = [
  { name: 'ChatGPT',    imgUrl: 'https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778425627/chatgpt-icon_dnsvgw.webp' },
  { name: 'Gemini',     imgUrl: 'https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778425667/Google_Gemini_icon_2025.svg_rsefbe.webp' },
  { name: 'Claude',     imgUrl: 'https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778425650/claude-ai-icon_kp64b4.webp' },
  { name: 'Perplexity', imgUrl: 'https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778425477/perplexity-ai-icon_tdawdq.webp' },
  { name: 'DeepSeek',   imgUrl: 'https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778425429/deepseek-logo-icon_hpuvjw.webp' },
  { name: 'Grok',       imgUrl: 'https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778426015/Grok-icon.svg_y9wwzw.png' },
];

/* Duplicate twice so the CSS loop is seamless (-50% lands back at the start) */
const items = [...aiModels, ...aiModels];

export function AILogoMarquee() {
  return (
    <div className="w-full max-w-5xl mx-auto overflow-hidden relative mb-2 mt-0 opacity-80 pointer-events-none">
      <div className="absolute inset-y-0 left-0 w-24 md:w-48 bg-gradient-to-r from-zinc-50 dark:from-[#0a0a0a] to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-24 md:w-48 bg-gradient-to-l from-zinc-50 dark:from-[#0a0a0a] to-transparent z-10" />
      <div className="marquee-track flex gap-16 whitespace-nowrap items-center w-max">
        {items.map((m, i) => (
          <div key={i} className="flex items-center gap-4 shrink-0">
            <img src={m.imgUrl} alt={m.name} className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
            <span className="font-bold tracking-[0.2em] uppercase text-xs md:text-sm text-zinc-500/80 dark:text-zinc-400/80">
              {m.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
