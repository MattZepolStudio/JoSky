import React from 'react';

// Same drawings on every phone: emojis change from one system to another.
// Avatars stay stored as emojis, which remain the fallback for unknown values.
const INK = '#2b1d14';

const Eyes: React.FC<{ y?: number; gap?: number; r?: number }> = ({ y = 23, gap = 7, r = 2.2 }) => (
  <>
    <circle cx={24 - gap} cy={y} r={r} fill={INK} />
    <circle cx={24 + gap} cy={y} r={r} fill={INK} />
  </>
);

const DRAWINGS: Record<string, React.ReactNode> = {
  '🦊': (
    <>
      <path d="M8 6 L20 18 L8 26 Z M40 6 L28 18 L40 26 Z" fill="#e8772e" />
      <path d="M6 20 Q24 8 42 20 Q38 36 24 44 Q10 36 6 20 Z" fill="#e8772e" />
      <path d="M6 20 Q16 30 24 44 Q10 36 6 20 Z M42 20 Q32 30 24 44 Q38 36 42 20 Z" fill="#fbe9d4" />
      <Eyes y={24} gap={8} />
      <circle cx="24" cy="39" r="2.6" fill={INK} />
    </>
  ),
  '🐼': (
    <>
      <circle cx="11" cy="12" r="7" fill={INK} />
      <circle cx="37" cy="12" r="7" fill={INK} />
      <circle cx="24" cy="26" r="19" fill="#f6f3ec" />
      <ellipse cx="16" cy="24" rx="5" ry="6" fill={INK} transform="rotate(20 16 24)" />
      <ellipse cx="32" cy="24" rx="5" ry="6" fill={INK} transform="rotate(-20 32 24)" />
      <circle cx="16" cy="23" r="1.7" fill="#fff" />
      <circle cx="32" cy="23" r="1.7" fill="#fff" />
      <ellipse cx="24" cy="33" rx="3" ry="2.2" fill={INK} />
    </>
  ),
  '🦁': (
    <>
      <circle cx="24" cy="24" r="22" fill="#a8551f" />
      <circle cx="24" cy="25" r="15" fill="#f2b84b" />
      <Eyes y={22} gap={6} />
      <path d="M21 29 H27 L24 32 Z" fill={INK} />
      <path d="M24 32 V35" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  '🐯': (
    <>
      <circle cx="11" cy="12" r="6" fill="#ee8f2c" />
      <circle cx="37" cy="12" r="6" fill="#ee8f2c" />
      <circle cx="24" cy="26" r="19" fill="#ee8f2c" />
      <path d="M24 7 V15 M15 9 L18 16 M33 9 L30 16 M6 26 H12 M42 26 H36" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="24" cy="34" rx="9" ry="7" fill="#fbe9d4" />
      <Eyes y={24} gap={8} />
      <ellipse cx="24" cy="31" rx="2.6" ry="1.8" fill={INK} />
    </>
  ),
  '🐨': (
    <>
      <circle cx="9" cy="17" r="9" fill="#8d9aa6" />
      <circle cx="39" cy="17" r="9" fill="#8d9aa6" />
      <circle cx="9" cy="17" r="4.5" fill="#d9dfe4" />
      <circle cx="39" cy="17" r="4.5" fill="#d9dfe4" />
      <circle cx="24" cy="26" r="17" fill="#a7b3bd" />
      <Eyes y={24} gap={8} />
      <ellipse cx="24" cy="30" rx="4" ry="6" fill={INK} />
    </>
  ),
  '🐸': (
    <>
      <circle cx="14" cy="13" r="8" fill="#5fb34a" />
      <circle cx="34" cy="13" r="8" fill="#5fb34a" />
      <ellipse cx="24" cy="29" rx="21" ry="16" fill="#5fb34a" />
      <circle cx="14" cy="12" r="4.4" fill="#fff" />
      <circle cx="34" cy="12" r="4.4" fill="#fff" />
      <circle cx="14" cy="12" r="2.2" fill={INK} />
      <circle cx="34" cy="12" r="2.2" fill={INK} />
      <path d="M12 33 Q24 41 36 33" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  ),
  '🦄': (
    <>
      <path d="M24 2 L28 15 H20 Z" fill="#f2c14e" />
      <path d="M12 10 L18 17 L10 20 Z M36 10 L30 17 L38 20 Z" fill="#f7f1ff" />
      <path d="M10 22 Q10 12 24 12 Q38 12 38 22 L33 40 Q24 46 15 40 Z" fill="#f7f1ff" />
      <path d="M12 16 Q2 26 8 40 Q14 32 15 20 Z" fill="#c084e8" />
      <Eyes y={25} gap={7} />
      <ellipse cx="24" cy="37" rx="7" ry="4.5" fill="#f3c6dd" />
    </>
  ),
  '🐙': (
    <>
      <path d="M8 36 Q6 44 12 44 M18 38 Q17 46 22 45 M30 38 Q31 46 26 45 M40 36 Q42 44 36 44" stroke="#d9567c" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="24" cy="22" rx="18" ry="19" fill="#e86a90" />
      <circle cx="16" cy="23" r="4.5" fill="#fff" />
      <circle cx="32" cy="23" r="4.5" fill="#fff" />
      <circle cx="16" cy="23" r="2.2" fill={INK} />
      <circle cx="32" cy="23" r="2.2" fill={INK} />
      <path d="M20 32 Q24 35 28 32" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  '🦉': (
    <>
      <path d="M7 6 L18 13 L8 20 Z M41 6 L30 13 L40 20 Z" fill="#7b5230" />
      <ellipse cx="24" cy="26" rx="19" ry="20" fill="#9a6b3f" />
      <circle cx="16" cy="21" r="7.5" fill="#f6e7c8" />
      <circle cx="32" cy="21" r="7.5" fill="#f6e7c8" />
      <circle cx="16" cy="21" r="3" fill={INK} />
      <circle cx="32" cy="21" r="3" fill={INK} />
      <path d="M21 27 H27 L24 33 Z" fill="#f2b84b" />
      <path d="M15 38 Q24 44 33 38" stroke="#f6e7c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
  '🐺': (
    <>
      <path d="M9 3 L20 16 L7 24 Z M39 3 L28 16 L41 24 Z" fill="#6b7785" />
      <path d="M6 20 Q24 9 42 20 Q37 37 24 45 Q11 37 6 20 Z" fill="#7e8b99" />
      <path d="M15 28 Q24 22 33 28 Q30 39 24 45 Q18 39 15 28 Z" fill="#dfe4e9" />
      <Eyes y={23} gap={8} />
      <path d="M21 35 H27 L24 39 Z" fill={INK} />
    </>
  ),
  '🤖': (
    <>
      <path d="M24 3 V11" stroke="#8d9aa6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="4" r="3" fill="#f2b84b" />
      <rect x="6" y="11" width="36" height="31" rx="9" fill="#c4ced6" />
      <rect x="11" y="18" width="26" height="12" rx="6" fill="#20313a" />
      <circle cx="18" cy="24" r="3" fill="#7fe3f2" />
      <circle cx="30" cy="24" r="3" fill="#7fe3f2" />
      <path d="M18 36 H30" stroke="#20313a" strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
};

export const Avatar: React.FC<{ value: string }> = ({ value }) => {
  const drawing = DRAWINGS[value];
  if (!drawing) return <>{value}</>;

  return (
    <svg viewBox="0 0 48 48" width="1.25em" height="1.25em" className="inline-block align-middle flex-shrink-0" aria-hidden="true">
      {drawing}
    </svg>
  );
};
