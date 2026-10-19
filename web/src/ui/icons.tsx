type P = { size?: number };
const s = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const Pause = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 6.5v11M15 6.5v11" /></svg>;
export const Back = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>;
export const Next = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>;
export const Restart = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4.5v3.5h3.5" /></svg>;
export const Gear = ({ size }: P) => (
  <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></svg>
);
export const Moon = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z" /></svg>;
/** A paper lantern. */
export const Lantern = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M12 2.5v2.5" /><path d="M8.5 5h7M8.5 19h7" /><path d="M8.5 5c-3 3-3 11 0 14M15.5 5c3 3 3 11 0 14" /><path d="M12 5c-1 3-1 11 0 14" opacity=".6" /><path d="M12 19v2.5" /></svg>;
/** Stars are fireflies, lit. */
export const Glow = ({ size = 22, on = true }: P & { on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    {on && <circle cx="12" cy="12" r="10.5" fill="url(#fg)" />}
    <defs><radialGradient id="fg"><stop offset="0" stopColor="#fffbe0" stopOpacity="1" /><stop offset=".3" stopColor="#d8ff7a" stopOpacity=".55" /><stop offset="1" stopColor="#d8ff7a" stopOpacity="0" /></radialGradient></defs>
    <circle cx="12" cy="12" r={on ? 3.4 : 3} fill={on ? '#fffde8' : 'none'} stroke={on ? '#e4ff9a' : 'rgba(255,255,255,.45)'} strokeWidth="1.2" />
  </svg>
);
