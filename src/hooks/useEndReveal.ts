import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  const previousRef = useRef(gameState);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  useLayoutEffect(() => {
    const prev = previousRef.current;
    previousRef.current = gameState;
    if (!gameState) {
      setReveal(null);
      return;
    }

    const slots = buildRevealSlots(prev, gameState);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prev && slots.length > 0 && !reduceMotion) {
      setReveal({ prev, slots, count: 0 });
    } else if (!isRoundOver(gameState)) {
      setReveal(null);
    }
  }, [gameState]);

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
