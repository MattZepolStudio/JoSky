import { sound } from './audio';

export const HAPTICS = {
  yourTurn: 100,
  lastRound: [60, 40, 60],
  column: [40, 30, 90],
  doubled: [120, 60, 120, 60, 200],
};

// The sound button also turns vibrations off. Unsupported on iPhones.
export function vibrate(pattern: number | number[]) {
  if (sound.getMuted() || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore if vibrate is restricted
  }
}
