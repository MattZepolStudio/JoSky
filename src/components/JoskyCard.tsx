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
    // Without motion no animationend ever fires, so the effect would never clear
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (previous && !card) setAnimation('animate-column-gone');
    else if (previous && card && !previous.isRevealed && card.isRevealed) setAnimation('animate-card-flip');
  }, [card]);

  const isFlipping = animation === 'animate-card-flip';
  // After turning over, a great card shines and a terrible one hits hard
  const mood = !isFlipping || !card ? '' : card.value < 0 ? 'card-mood-good' : card.value >= 10 ? 'card-mood-bad' : '';

  const clearAnimation = (e: React.AnimationEvent) => {
    if (mood && e.animationName === 'card-flip') return;
    setAnimation('');
  };

  // If card slot is empty (eliminated column)
  if (!card) {
    return (
      <div
        onAnimationEnd={clearAnimation}
        className={`${animation} rounded-xl sm:rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 flex flex-col items-center justify-center transition-all duration-300 ${
          size === 'tile' ? 'card-tile rounded-xs' :
          size === 'mini' ? 'h-6 w-4.5 rounded-xs' :
          size === 'compact' ? 'w-full aspect-[5/7]' :
          size === 'sm' ? 'h-[52px] w-[38px]' :
          size === 'table' ? 'card-table' :
          size === 'full' ? 'w-full aspect-[5/7]' :
          size === 'lg' ? 'h-24 w-17 sm:h-32 sm:w-22' :
          'h-[62px] w-[44px] sm:h-[80px] sm:w-[56px]'
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
    mini: 'h-6 w-4.5 text-[8px] rounded-xs',
    tile: 'card-tile rounded-sm',
    compact: 'w-full aspect-[5/7] text-xs rounded-lg sm:rounded-xl',
    sm: 'h-[46px] w-[33px] text-xs rounded-lg',
    table: 'card-table rounded-xl',
    md: 'h-[54px] w-[38px] sm:h-[70px] sm:w-[50px] text-xs sm:text-sm rounded-xl',
    full: 'w-full aspect-[5/7] max-h-[12.5dvh] text-sm sm:text-lg rounded-xl',
    lg: 'h-20 w-14 sm:h-28 sm:w-20 text-base sm:text-lg rounded-xl sm:rounded-2xl',
  }[size];



  const backFace = (
    /* Face Down Card - JoSky style back */
    <div
      className={`card-back w-full h-full rounded-inherit bg-gradient-to-br from-[#225f4a] via-[#1a5240] to-[#144434] border ${
        isTiny ? 'border-brass-300/30 p-0.5' : 'border-2 border-brass-300/40 p-0.5'
      } flex flex-col items-center justify-center overflow-hidden relative shadow-inner backface-hidden`}
    >
      {/* Subtle background geometric pattern */}
      <div className="absolute inset-0.5 rounded-sm border border-brass-300/15 flex items-center justify-center pointer-events-none">
        <div className="w-full h-full opacity-10 bg-[radial-gradient(#e9c46f_1px,transparent_1px)] [background-size:4px_4px]"></div>
      </div>

      {/* Center JoSky wordmark */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <img
          src="/wordmark.svg"
          alt=""
          draggable={false}
          className="card-back-word"
        />
      </div>

      {/* Overlaid so the wordmark stays centered with or without the hint */}
      {backHint && !isTiny && (
        <div className="absolute inset-x-0 bottom-[7%] z-10 flex justify-center pointer-events-none">
          <span className="card-hint text-amber-300 font-bold bg-amber-500/20 rounded-full border border-amber-400/40 whitespace-nowrap">
            {backHint}
          </span>
        </div>
      )}
    </div>
  );

  const cardInner = (
    <div
      className={`w-full h-full relative transform-style-3d shadow-md rounded-inherit ${isFlipping ? 'card-flip-3d' : ''}`}
    >
      {isFlipping && <div className="card-flip-reverse absolute inset-0 rounded-inherit">{backFace}</div>}
      {isRevealed && theme ? (
        /* Face Up Card */
        <div
          className={`card-face w-full h-full rounded-inherit bg-gradient-to-br ${theme.bgGradient} ${size === 'tile' ? 'border relative' : 'border-2 p-0.5'} ${theme.borderColor} flex flex-col justify-between overflow-hidden shadow-inner text-white backface-hidden`}
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

          {size === 'tile' && (
            <span className="card-tile-symbol" aria-hidden="true">
              {value < 0 ? '★' : value === 0 ? '◆' : '●'}
            </span>
          )}

          {/* Center large value */}
          <div className="flex flex-col items-center justify-center my-auto leading-none">
            <span
              className={`font-black tracking-tight leading-none drop-shadow-md ${
                size === 'tile' ? 'card-tile-value' :
                size === 'mini' ? 'text-[9px]' :
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
      ) : backFace}
    </div>
  );

  const isGridCard = size === 'full' || size === 'compact';

  const containerClasses = `${isFlipping ? mood : animation} relative select-none text-left font-display transition-all duration-200 transform perspective-1000 block p-0 border-0 bg-transparent ${
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

