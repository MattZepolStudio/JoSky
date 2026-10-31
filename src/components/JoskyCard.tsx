import React, { useEffect, useRef, useState } from 'react';
import { JoskyCard as JoskyCardType } from '../types/game';
import { getCardTheme } from '../utils/deck';

interface JoskyCardProps {
  card: JoskyCardType | null;
  size?: 'sm' | 'md' | 'lg' | 'mini' | 'compact' | 'table' | 'full';
  isSelectable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  showBackHint?: boolean;
  disabled?: boolean;
  customLabel?: string;
}

export const JoskyCard: React.FC<JoskyCardProps> = ({
  card,
  size = 'md',
  isSelectable = false,
  isSelected = false,
  onClick,
  showBackHint = false,
  disabled = false,
  customLabel,
}) => {
  const previousCard = useRef(card);
  const [animation, setAnimation] = useState('');

  // Plays once when a card turns face up or when its column gets eliminated
  useEffect(() => {
    const previous = previousCard.current;
    previousCard.current = card;
    if (previous && !card) setAnimation('animate-column-gone');
    else if (previous && card && !previous.isRevealed && card.isRevealed) setAnimation('animate-card-flip');
  }, [card]);

  const clearAnimation = () => setAnimation('');

  // If card slot is empty (eliminated column)
  if (!card) {
    return (
      <div
        onAnimationEnd={clearAnimation}
        className={`${animation} rounded-xl sm:rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 flex flex-col items-center justify-center transition-all duration-300 ${
          size === 'mini' ? 'h-6 w-4.5 xs:h-7 xs:w-5 rounded-xs' :
          size === 'compact' ? 'w-full aspect-[5/7]' :
          size === 'sm' ? 'h-[52px] w-[38px] xs:h-[58px] xs:w-[42px]' :
          size === 'table' ? 'h-[68px] w-[48px] xs:h-[76px] xs:w-[54px] sm:h-[88px] sm:w-[62px]' :
          size === 'full' ? 'w-full aspect-[5/7]' :
          size === 'lg' ? 'h-24 w-17 sm:h-32 sm:w-22' :
          'h-[62px] w-[44px] xs:h-[70px] xs:w-[50px] sm:h-[80px] sm:w-[56px]'
        }`}
        style={size === 'full' || size === 'compact' ? { aspectRatio: '5 / 7' } : undefined}
      >
        <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          {size === 'mini' ? '—' : 'Vide'}
        </span>
      </div>
    );
  }

  const { isRevealed, value } = card;
  const theme = isRevealed ? getCardTheme(value) : null;

  // Harmonious, screen-adapted card dimensions with strict 5/7 aspect ratio and dvh caps for zero-scroll fit
  const sizeClasses = {
    mini: 'h-6 w-4.5 xs:h-7 xs:w-5 text-[8px] rounded-xs',
    compact: 'w-full aspect-[5/7] max-h-[9.5dvh] text-xs rounded-lg sm:rounded-xl',
    sm: 'h-[46px] w-[33px] xs:h-[50px] xs:w-[36px] text-xs rounded-lg',
    table: 'h-[52px] w-[37px] xs:h-[58px] xs:w-[41px] sm:h-[68px] sm:w-[48px] text-xs xs:text-sm rounded-xl',
    md: 'h-[54px] w-[38px] xs:h-[60px] xs:w-[42px] sm:h-[70px] sm:w-[50px] text-xs sm:text-sm rounded-xl',
    full: 'w-full aspect-[5/7] max-h-[12.5dvh] text-sm xs:text-base sm:text-lg rounded-xl',
    lg: 'h-20 w-14 sm:h-28 sm:w-20 text-base sm:text-lg rounded-xl sm:rounded-2xl',
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
                size === 'sm' ? 'text-sm sm:text-base' :
                size === 'full' ? 'text-lg xs:text-xl sm:text-2xl' :
                size === 'table' ? 'text-lg sm:text-xl' :
                size === 'lg' ? 'text-2xl sm:text-3xl' :
                'text-base xs:text-lg sm:text-xl'
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
              <span className={`font-extrabold tracking-tighter opacity-90 ${
                size === 'full' ? 'text-xs xs:text-sm' : 'text-[8px] xs:text-[9px] sm:text-xs'
              }`}>
                {value > 0 ? `+${value}` : value}
              </span>
              <span className={`${size === 'full' ? 'text-xs' : 'text-[7px] xs:text-[8px]'} opacity-70`}>
                {value < 0 ? '★' : value === 0 ? '◆' : '●'}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Face Down Card - JoSky style back */
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
              size === 'mini' ? 'w-2.5 h-2.5' :
              size === 'full' ? 'w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 mb-1 shadow-md' :
              'w-3.5 h-3.5 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 mb-0.5'
            }`}>
              <span className={`${size === 'full' ? 'text-[10px] xs:text-xs' : 'text-[6px] xs:text-[7px]'} font-black tracking-tighter`}>JS</span>
            </div>
            {size !== 'mini' && (
              <span className={`font-black tracking-widest text-indigo-200 uppercase drop-shadow ${
                size === 'full' ? 'text-[10px] xs:text-xs sm:text-sm tracking-wider' : 'text-[7px] xs:text-[8px] sm:text-[10px]'
              }`}>
                JOSKY
              </span>
            )}
            {showBackHint && size !== 'mini' && (
              <span className={`text-amber-300 font-bold mt-1 animate-bounce bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40 ${
                size === 'full' ? 'text-[9px] xs:text-[11px]' : 'text-[6px] xs:text-[7px]'
              }`}>
                Toucher
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const isGridCard = size === 'full' || size === 'compact';

  const containerClasses = `${animation} relative select-none text-left font-display transition-all duration-200 transform perspective-1000 block p-0 border-0 bg-transparent ${
    isGridCard ? 'w-full h-full' : ''
  } ${sizeClasses} ${
    isSelectable && !disabled
      ? 'cursor-pointer active:scale-95 hover:-translate-y-0.5 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-amber-500/20 animate-pulse'
      : onClick && !disabled
      ? 'cursor-pointer active:scale-98'
      : 'cursor-default'
  } ${
    isSelected
      ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-105 shadow-xl shadow-cyan-500/30'
      : ''
  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;

  if (onClick && !disabled) {
    return (
      <button
        type="button"
        onClick={onClick}
        onAnimationEnd={clearAnimation}
        className={containerClasses}
        style={isGridCard ? { aspectRatio: '5 / 7' } : undefined}
      >
        {cardInner}
      </button>
    );
  }

  return (
    <div
      onAnimationEnd={clearAnimation}
      className={containerClasses}
      style={isGridCard ? { aspectRatio: '5 / 7' } : undefined}
    >
      {cardInner}
    </div>
  );
};

