import React from 'react';
import { SkyjoCard as SkyjoCardType } from '../types/game';
import { getCardTheme } from '../utils/skyjoDeck';

interface SkyjoCardProps {
  card: SkyjoCardType | null;
  size?: 'sm' | 'md' | 'lg' | 'mini';
  isSelectable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  showBackHint?: boolean;
  disabled?: boolean;
  customLabel?: string;
}

export const SkyjoCard: React.FC<SkyjoCardProps> = ({
  card,
  size = 'md',
  isSelectable = false,
  isSelected = false,
  onClick,
  showBackHint = false,
  disabled = false,
  customLabel,
}) => {
  // If card slot is empty (eliminated column)
  if (!card) {
    return (
      <div
        className={`rounded-lg sm:rounded-xl border border-dashed border-slate-700/60 bg-slate-900/30 flex flex-col items-center justify-center transition-all duration-300 ${
          size === 'mini' ? 'h-6 w-4.5 xs:h-7 xs:w-5 rounded-xs' :
          size === 'sm' ? 'h-[56px] w-[40px] xs:h-[62px] xs:w-[44px]' :
          size === 'lg' ? 'h-24 w-17 sm:h-32 sm:w-22' :
          'h-[66px] w-[46px] xs:h-[74px] xs:w-[52px] sm:h-[86px] sm:w-[60px]'
        }`}
      >
        <span className="text-[7px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-wider">
          {size === 'mini' ? '—' : 'Vide'}
        </span>
      </div>
    );
  }

  const { isRevealed, value } = card;
  const theme = isRevealed ? getCardTheme(value) : null;

  // Solid, well-proportioned card dimensions: compact on mobile, never stretched out
  const sizeClasses = {
    mini: 'h-6 w-4.5 xs:h-7 xs:w-5 text-[8px] rounded-xs',
    sm: 'h-[56px] w-[40px] xs:h-[62px] xs:w-[44px] text-xs rounded-lg',
    md: 'h-[66px] w-[46px] xs:h-[74px] xs:w-[52px] sm:h-[86px] sm:w-[60px] text-sm sm:text-base rounded-xl',
    lg: 'h-24 w-17 sm:h-32 sm:w-22 text-lg sm:text-xl rounded-xl sm:rounded-2xl',
  }[size];

  const cardInner = (
    <div
      className={`w-full h-full relative transition-transform duration-500 transform-style-3d shadow-md hover:shadow-xl rounded-inherit ${
        isRevealed ? '' : 'rotate-y-0'
      }`}
    >
      {isRevealed && theme ? (
        /* Face Up Card */
        <div
          className={`w-full h-full rounded-inherit bg-gradient-to-br ${theme.bgGradient} border-2 ${theme.borderColor} ${
            size === 'mini' ? 'p-0.5' : 'p-0.5 xs:p-1 sm:p-1.5'
          } flex flex-col justify-between overflow-hidden shadow-inner text-white backface-hidden`}
        >
          {/* Top-left corner value */}
          {size !== 'mini' && (
            <div className="flex items-center justify-between leading-none">
              <span className="font-extrabold text-[8px] xs:text-[9px] sm:text-xs tracking-tighter opacity-90">
                {value > 0 ? `+${value}` : value}
              </span>
              <span className="text-[7px] xs:text-[8px] opacity-70">
                {value < 0 ? '★' : value === 0 ? '◆' : '●'}
              </span>
            </div>
          )}

          {/* Center large value */}
          <div className="flex flex-col items-center justify-center my-auto leading-none">
            <span
              className={`font-black tracking-tight leading-none drop-shadow-md ${
                size === 'mini' ? 'text-[9px] xs:text-[10px]' :
                size === 'sm' ? 'text-base sm:text-lg' :
                size === 'lg' ? 'text-3xl sm:text-4xl' :
                'text-lg xs:text-xl sm:text-2xl'
              }`}
            >
              {value}
            </span>
            {customLabel && size !== 'mini' && (
              <span className="text-[8px] bg-black/40 px-1 py-0.5 rounded text-amber-200 mt-0.5 uppercase font-bold tracking-wider">
                {customLabel}
              </span>
            )}
          </div>

          {/* Bottom-right corner value (inverted) */}
          {size !== 'mini' && (
            <div className="flex items-center justify-between leading-none transform rotate-180">
              <span className="font-extrabold text-[8px] xs:text-[9px] sm:text-xs tracking-tighter opacity-90">
                {value > 0 ? `+${value}` : value}
              </span>
              <span className="text-[7px] xs:text-[8px] opacity-70">
                {value < 0 ? '★' : value === 0 ? '◆' : '●'}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Face Down Card - Authentic Skyjo style back */
        <div
          className={`w-full h-full rounded-inherit bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border ${
            size === 'mini' ? 'border-indigo-500/30 p-0.5' : 'border-2 border-indigo-500/50 p-0.5 xs:p-1'
          } flex flex-col items-center justify-center overflow-hidden relative shadow-inner backface-hidden`}
        >
          {/* Subtle background geometric pattern */}
          <div className="absolute inset-0.5 rounded-sm border border-indigo-400/20 bg-indigo-950/40 flex items-center justify-center pointer-events-none">
            <div className="w-full h-full opacity-20 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:4px_4px]"></div>
          </div>

          {/* Center JoSky Logo Mark */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <div className={`rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-sm ${
              size === 'mini' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 mb-0.5'
            }`}>
              <span className="text-[6px] xs:text-[7px] font-black tracking-tighter">JS</span>
            </div>
            {size !== 'mini' && (
              <span className="font-extrabold text-[7px] xs:text-[8px] sm:text-[10px] tracking-widest text-indigo-200 uppercase drop-shadow">
                JOSKY
              </span>
            )}
            {showBackHint && size !== 'mini' && (
              <span className="text-[6px] xs:text-[7px] text-amber-300 font-semibold mt-0.5 animate-bounce">
                Toucher
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const containerClasses = `relative select-none text-left font-display transition-all duration-200 transform perspective-1000 ${sizeClasses} ${
    isSelectable && !disabled
      ? 'cursor-pointer active:scale-95 hover:-translate-y-1 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-amber-500/20 animate-pulse'
      : 'cursor-default'
  } ${
    isSelected
      ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-105 shadow-xl shadow-cyan-500/30'
      : ''
  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;

  if (isSelectable && !disabled && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={containerClasses}
      >
        {cardInner}
      </button>
    );
  }

  return (
    <div className={containerClasses}>
      {cardInner}
    </div>
  );
};
