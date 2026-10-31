import React, { useLayoutEffect, useRef } from 'react';

export interface FloatingEffect {
  id: number;
  playerId: string;
  text: string;
  kind: 'reaction' | 'banner';
}

const EFFECT_MS = 1600;

const Effect: React.FC<{ effect: FloatingEffect; onDone: (id: number) => void }> = ({ effect, onDone }) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;
    const anchor = document.querySelector(`[data-player-anchor="${effect.playerId}"]`);
    const rect = anchor?.getBoundingClientRect();
    if (!element || !rect) {
      onDone(effect.id);
      return;
    }

    // A small random offset keeps quick reactions from stacking exactly on top of each other
    const spread = effect.kind === 'reaction' ? (Math.random() - 0.5) * rect.width * 0.5 : 0;
    element.style.left = `${rect.left + rect.width / 2 + spread}px`;
    element.style.top = `${rect.top + rect.height * 0.45}px`;

    const timer = setTimeout(() => onDone(effect.id), EFFECT_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={elementRef} className="fixed left-0 top-0 w-0 h-0 flex items-center justify-center">
      {effect.kind === 'reaction' ? (
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
