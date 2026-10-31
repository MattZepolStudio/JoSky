import React, { useLayoutEffect, useRef } from 'react';

export interface FloatingEffect {
  id: number;
  playerId: string;
  text: string;
  kind: 'reaction' | 'banner' | 'announce';
}

const EFFECT_MS = { reaction: 1600, banner: 1600, announce: 2600 };

const Effect: React.FC<{ effect: FloatingEffect; onDone: (id: number) => void }> = ({ effect, onDone }) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;
    const timer = setTimeout(() => onDone(effect.id), EFFECT_MS[effect.kind]);
    if (element && effect.kind === 'announce') {
      element.style.left = '50%';
      element.style.top = '42%';
      return () => clearTimeout(timer);
    }

    const anchor = document.querySelector(`[data-player-anchor="${effect.playerId}"]`);
    const rect = anchor?.getBoundingClientRect();
    if (!element || !rect) {
      clearTimeout(timer);
      onDone(effect.id);
      return;
    }

    // A small random offset keeps quick reactions from stacking exactly on top of each other
    const spread = effect.kind === 'reaction' ? (Math.random() - 0.5) * rect.width * 0.5 : 0;
    element.style.left = `${rect.left + rect.width / 2 + spread}px`;
    element.style.top = `${rect.top + rect.height * 0.45}px`;

    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={elementRef} className="fixed left-0 top-0 w-0 h-0 flex items-center justify-center">
      {effect.kind === 'announce' ? (
        <span className="animate-announce whitespace-nowrap px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white text-center text-base min-[380px]:text-lg font-black shadow-2xl">
          {effect.text}
        </span>
      ) : effect.kind === 'reaction' ? (
        <span className="animate-reaction text-4xl">{effect.text}</span>
      ) : (
        <span className="animate-banner whitespace-nowrap px-3 py-1.5 rounded-full btn-primary text-sm font-black">
          {effect.text}
        </span>
      )}
    </div>
  );
};

export const ReactionLayer: React.FC<{ effects: FloatingEffect[]; onDone: (id: number) => void }> = ({ effects, onDone }) => (
  <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden" aria-hidden="true">
    {effects.map((effect) => (
      <Effect key={effect.id} effect={effect} onDone={onDone} />
    ))}
  </div>
);
