import React, { useEffect, useRef, useState } from 'react';
import { JoskyCard as JoskyCardType } from '../types/game';
import { getCardTheme } from '../utils/deck';

interface JoskyCardProps {
  card: JoskyCardType | null;
  size?: 'sm' | 'md' | 'lg' | 'mini' | 'tile' | 'compact' | 'table' | 'full';
  isSelectable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  backHint?: string;
  disabled?: boolean;
  customLabel?: string;
}

export const JoskyCard: React.FC<JoskyCardProps> = ({
  card,
  size = 'md',
  isSelectable = false,
  isSelected = false,
  onClick,
  backHint,
  disabled = false,
  customLabel,
}) => {
  // Opponent tile cards scale with the screen height but keep the same simplified look
  const isTiny = size === 'mini' || size === 'tile';
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
          size === 'tile' ? 'card-tile rounded-xs' :
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
          {isTiny ? '—' : 'Vide'}
        </span>
      </div>
    );
  }

  const { isRevealed, value } = card;
  const theme = isRevealed ? getCardTheme(value) : null;

  // Harmonious, screen-adapted card dimensions with strict 5/7 aspect ratio and dvh caps for zero-scroll fit
  const sizeClasses = {
    mini: 'h-6 w-4.5 xs:h-7 xs:w-5 text-[8px] rounded-xs',
    tile: 'card-tile rounded-sm',
    compact: 'w-full aspect-[5/7] text-xs rounded-lg sm:rounded-xl',
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
          className={`card-face w-full h-full rounded-inherit bg-gradient-to-br ${theme.bgGradient} border-2 ${theme.borderColor} p-0.5 flex flex-col justify-between overflow-hidden shadow-inner text-white backface-hidden`}
        >
          {/* Top-left corner value */}
          {!isTiny && (
            <div className="flex items-center justify-between leading-none">
              <span className="card-corner font-extrabold tracking-tighter opacity-90">
                {value > 0 ? `+${value}` : value}
              </span>
              <span className="card-corner-symbol opacity-70">
                {value < 0 ? '★' : value === 0 ? '◆' : '●'}
              </span>
            </div>
          )}

          {/* Center large value */}
          <div className="flex flex-col items-center justify-center my-auto leading-none">
            <span
              className={`font-black tracking-tight leading-none drop-shadow-md ${
                size === 'tile' ? 'card-tile-value' :
                size === 'mini' ? 'text-[9px] xs:text-[10px]' :
                'card-value'
              }`}
            >
              {value}
            </span>
            {customLabel && !isTiny && (
              <span className="text-[8px] bg-black/40 px-1 py-0.5 rounded text-amber-200 mt-0.5 uppercase font-bold tracking-wider">
                {customLabel}
              </span>
            )}
          </div>

          {/* Bottom-right corner value (inverted) */}
          {!isTiny && (
            <div className="flex items-center justify-between leading-none transform rotate-180">
              <span className="card-corner font-extrabold tracking-tighter opacity-90">
                {value > 0 ? `+${value}` : value}
              </span>
              <span className="card-corner-symbol opacity-70">
                {value < 0 ? '★' : value === 0 ? '◆' : '●'}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Face Down Card - JoSky style back */
        <div
          className={`w-full h-full rounded-inherit bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border ${
            isTiny ? 'border-indigo-500/30 p-0.5' : 'border-2 border-indigo-500/50 p-0.5 xs:p-1'
          } flex flex-col items-center justify-center overflow-hidden relative shadow-inner backface-hidden`}
        >
          {/* Subtle background geometric pattern */}
          <div className="absolute inset-0.5 rounded-sm border border-indigo-400/20 bg-indigo-950/40 flex items-center justify-center pointer-events-none">
            <div className="w-full h-full opacity-20 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:4px_4px]"></div>
          </div>

          {/* Center JoSky Logo Mark */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <img
              src="/icon-192.png"
              alt=""
              draggable={false}
              className={
                size === 'tile' ? 'card-tile-logo' :
                isTiny ? 'w-3 h-3' :
                size === 'full' ? 'w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 mb-1' :
                'w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 mb-0.5'
              }
            />
            {!isTiny && (
              <span className={`font-black tracking-widest text-indigo-200 uppercase drop-shadow ${
                size === 'full' ? 'text-[10px] xs:text-xs sm:text-sm tracking-wider' : 'text-[7px] xs:text-[8px] sm:text-[10px]'
              }`}>
                JOSKY
              </span>
            )}
            {backHint && !isTiny && (
              <span className={`text-amber-300 font-bold mt-1 animate-bounce bg-amber-500/20 px-0.5 min-[380px]:px-1.5 py-0.5 rounded-full border border-amber-400/40 whitespace-nowrap ${
                size === 'full' ? 'text-[8px] min-[380px]:text-[11px]' : 'text-[6px] xs:text-[7px]'
              }`}>
                {backHint}
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
      ? `cursor-pointer active:scale-95 active:-translate-y-0.5 card-selectable ${size === 'table' ? 'card-selectable-strong' : ''}`
      : onClick && !disabled
      ? 'cursor-pointer active:scale-98'
      : 'cursor-default'
  } ${
    isSelected
      ? 'card-held scale-105'
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

