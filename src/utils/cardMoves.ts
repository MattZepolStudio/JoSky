import { GameState, JoskyCard } from '../types/game';

export interface CardMove {
  card: JoskyCard;
  from: string;
  to: string;
  delayMs: number;
  isBurst?: boolean;
}

const SWAP_DISCARD_DELAY_MS = 120;
const BURST_DELAY_MS = 380;
const BURST_STAGGER_MS = 110;

export const gridAnchor = (playerId: string, index: number) => `grid-${playerId}-${index}`;

// The three cards of a completed column leave the grid together
function columnBursts(before: (JoskyCard | null)[], after: (JoskyCard | null)[], playerId: string, eliminated: JoskyCard[]): CardMove[] {
  const slots = before.flatMap((card, index) => (card && !after[index] ? [index] : []));
  return slots.flatMap((index, order) => {
    const card = eliminated[order];
    if (!card) return [];
    return [{
      card,
      from: gridAnchor(playerId, index),
      to: 'discard',
      delayMs: BURST_DELAY_MS + order * BURST_STAGGER_MS,
      isBurst: true,
    }];
  });
}

// Works out which cards travelled between two states of the same round
export function deriveCardMoves(prev: GameState | null, next: GameState): CardMove[] {
  if (!prev || prev.roomCode !== next.roomCode || prev.roundNumber !== next.roundNumber) return [];
  if (prev.phase !== 'playing') return [];

  const heldBefore = prev.currentDrawnCard;
  const heldAfter = next.currentDrawnCard;

  if (!heldBefore && heldAfter) {
    const from = next.turnAction === 'discard_choice' ? 'discard' : 'draw';
    return [{ card: heldAfter, from, to: 'hand', delayMs: 0 }];
  }

  if (!heldBefore || heldAfter) return [];

  const knownDiscards = new Set(prev.discardPile.map(c => c.id));
  const added = next.discardPile.filter(c => !knownDiscards.has(c.id));
  const firstDiscarded = added[0];

  const player = prev.players[prev.currentPlayerIndex];
  const updated = next.players.find(p => p.id === player?.id);
  const bursts = player && updated ? columnBursts(player.cards, updated.cards, player.id, added.slice(1)) : [];

  if (firstDiscarded?.id === heldBefore.id) {
    return [{ card: heldBefore, from: 'hand', to: 'discard', delayMs: 0 }, ...bursts];
  }

  if (!player || !updated) return [];

  const index = findSwappedIndex(player.cards, updated.cards, heldBefore, firstDiscarded);
  if (index === -1) return [];

  const slot = gridAnchor(player.id, index);
  const moves: CardMove[] = [{ card: heldBefore, from: 'hand', to: slot, delayMs: 0 }];
  if (firstDiscarded) {
    moves.push({ card: firstDiscarded, from: slot, to: 'discard', delayMs: SWAP_DISCARD_DELAY_MS });
  }
  return [...moves, ...bursts];
}

export interface PresenceChanges {
  left: string[];
  disconnected: string[];
  returned: string[];
  retaken: string[];
}

// Other humans who changed status during a game
export function derivePresenceChanges(prev: GameState | null, next: GameState, myId: string): PresenceChanges {
  const changes: PresenceChanges = { left: [], disconnected: [], returned: [], retaken: [] };
  if (!prev || prev.roomCode !== next.roomCode || prev.phase === 'lobby' || next.phase === 'lobby') return changes;

  next.players.forEach((player) => {
    const before = prev.players.find(p => p.id === player.id);
    if (!before || player.id === myId) return;

    if (before.isBot) {
      if (before.replacedHuman && !player.isBot) changes.retaken.push(player.id);
      return;
    }

    if (player.isBot) changes.left.push(player.id);
    else if (before.isConnected && !player.isConnected) changes.disconnected.push(player.id);
    else if (!before.isConnected && player.isConnected) changes.returned.push(player.id);
  });
  return changes;
}

// The player who just started the last round, if any
export function deriveLastRoundTrigger(prev: GameState | null, next: GameState): string | null {
  if (!prev || prev.roomCode !== next.roomCode || prev.roundNumber !== next.roundNumber) return null;
  if (next.phase !== 'playing' || prev.finalRoundTriggeredBy) return null;
  return next.finalRoundTriggeredBy;
}

// Players who lost a column between two states of the same round
export function deriveEliminatedColumns(prev: GameState | null, next: GameState): string[] {
  if (!prev || prev.roomCode !== next.roomCode || prev.roundNumber !== next.roundNumber) return [];
  if (prev.phase !== 'playing') return [];

  return next.players
    .filter((player) => {
      const before = prev.players.find(p => p.id === player.id);
      return before?.cards.some((card, index) => card && !player.cards[index]);
    })
    .map(player => player.id);
}

function findSwappedIndex(
  before: (JoskyCard | null)[],
  after: (JoskyCard | null)[],
  held: JoskyCard,
  replaced: JoskyCard | undefined
): number {
  const index = after.findIndex(c => c?.id === held.id);
  if (index !== -1) return index;

  // The swap completed a column, so the card is already gone from the grid
  return before.findIndex((card, i) =>
    card && !after[i] && (card.id === replaced?.id || !card.isRevealed)
  );
}
