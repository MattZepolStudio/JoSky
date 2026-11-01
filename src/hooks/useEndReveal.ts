import { useEffect, useMemo, useState } from 'react';
import { GameState } from '../types/game';
import { RevealSlot, applyReveal, buildRevealSlots, isRoundOver } from '../utils/endReveal';
import { sound } from '../utils/audio';

const MAX_CARD_MS = 170;
const MAX_REVEAL_MS = 2600;
const RESULT_HOLD_MS = 900;

interface Reveal {
  prev: GameState;
  slots: RevealSlot[];
  count: number;
}

// Turns the last hidden cards over one by one before the end screen appears
export function useEndReveal(gameState: GameState | null) {
  const [trackedState, setTrackedState] = useState(gameState);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  // Decided while rendering: the end screen must not exist for even one frame,
  // or its confetti and fanfare would start before the cards are turned over
  if (gameState !== trackedState) {
    setTrackedState(gameState);

    const slots = gameState ? buildRevealSlots(trackedState, gameState) : [];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (trackedState && slots.length > 0 && !reduceMotion) {
      setReveal({ prev: trackedState, slots, count: 0 });
    } else if (!gameState || !isRoundOver(gameState)) {
      setReveal(null);
    }
  }

  useEffect(() => {
    if (!reveal) return;
    const { slots, count } = reveal;

    if (count >= slots.length) {
      const timer = setTimeout(() => setReveal(null), RESULT_HOLD_MS);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      sound.cardFlip();
      setReveal({ ...reveal, count: count + 1 });
    }, Math.min(MAX_CARD_MS, MAX_REVEAL_MS / slots.length));
    return () => clearTimeout(timer);
  }, [reveal]);

  const displayState = useMemo(
    () => (reveal && gameState ? applyReveal(reveal.prev, gameState, reveal.slots, reveal.count) : gameState),
    [reveal, gameState]
  );

  return {
    displayState,
    isRevealing: reveal !== null,
    skipReveal: () => setReveal(null),
  };
}
