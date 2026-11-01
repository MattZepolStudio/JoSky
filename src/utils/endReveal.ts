import { GameState } from '../types/game';
import { calculatePlayerScore } from './deck';

export interface RevealSlot {
  playerId: string;
  index: number;
}

const isRoundOver = (state: GameState) => state.phase === 'round_ended' || state.phase === 'game_over';

export { isRoundOver };

// Cards that were still hidden when the round ended, player by player
export function buildRevealSlots(prev: GameState | null, next: GameState): RevealSlot[] {
  if (!prev || prev.roomCode !== next.roomCode || prev.roundNumber !== next.roundNumber) return [];
  if (prev.phase !== 'playing' || !isRoundOver(next)) return [];

  return prev.players.flatMap(player =>
    player.cards.flatMap((card, index) => (card && !card.isRevealed ? [{ playerId: player.id, index }] : []))
  );
}

// The table as it should look once `count` cards have been turned over.
// Scores stay hidden until the last card, so the final result keeps its suspense.
export function applyReveal(prev: GameState, next: GameState, slots: RevealSlot[], count: number): GameState {
  const isDone = count >= slots.length;
  const pending = new Set(slots.slice(count).map(slot => `${slot.playerId}-${slot.index}`));

  return {
    ...next,
    phase: 'playing',
    currentPlayerIndex: -1,
    turnAction: 'choose_source',
    currentDrawnCard: null,
    finalRoundTriggeredBy: null,
    doubledPlayerId: null,
    turnEndsInMs: null,
    players: next.players.map((player) => {
      if (isDone) return player;

      const before = prev.players.find(p => p.id === player.id);
      const cards = player.cards.map((card, index) => {
        const isWaiting = pending.has(`${player.id}-${index}`);
        // A column completed by the reveal only disappears at the very end
        return isWaiting || !card ? before?.cards[index] ?? card : card;
      });

      return {
        ...player,
        cards,
        roundScore: calculatePlayerScore(cards, true),
        totalScore: before?.totalScore ?? player.totalScore,
      };
    }),
  };
}
