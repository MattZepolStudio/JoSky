import { JoskyCard, Player, GameState } from '../types/game.ts';
import { generateDeck, shuffleDeck, checkAndEliminateColumns, calculatePlayerScore } from '../utils/deck.ts';

// Pure game rules: no sockets and no timers, so everything here can be unit tested.
export interface GameRoom {
  state: GameState;
  drawPile: JoskyCard[];
}

export type ActionResult =
  | { ok: true; messages: string[] }
  | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

export function createPlayer(fields: Pick<Player, 'id' | 'name' | 'avatar' | 'isHost'> & Partial<Player>): Player {
  return {
    cards: [],
    revealedCount: 0,
    initialRevealedCount: 0,
    roundScore: 0,
    totalScore: 0,
    hasFinishedRound: false,
    isConnected: true,
    ...fields,
  };
}

export function createGameState(roomCode: string, host: Player, targetScore: number): GameState {
  return {
    roomCode,
    phase: 'lobby',
    players: [host],
    currentPlayerIndex: 0,
    drawPileCount: 0,
    discardPile: [],
    currentDrawnCard: null,
    turnAction: 'choose_source',
    roundNumber: 0,
    targetScore,
    finalRoundTriggeredBy: null,
    lastTurnPlayerIds: [],
    winnerId: null,
    doubledPlayerId: null,
    historyLogs: [],
    turnEndsInMs: null,
  };
}

export function startRound(room: GameRoom): ActionResult {
  const { state } = room;
  room.drawPile = generateDeck();

  // Deal 12 cards to each player
  state.players.forEach(player => {
    player.cards = room.drawPile.splice(0, 12);
    player.revealedCount = 0;
    player.initialRevealedCount = 0;
    player.roundScore = 0;
    player.hasFinishedRound = false;
  });

  // 1 card to discard pile
  const initialDiscard = room.drawPile.pop()!;
  initialDiscard.isRevealed = true;
  state.discardPile = [initialDiscard];
  state.currentDrawnCard = null;
  state.turnAction = 'choose_source';
  state.finalRoundTriggeredBy = null;
  state.lastTurnPlayerIds = [];
  state.doubledPlayerId = null;
  state.roundNumber += 1;
  state.phase = 'initial_revealing';

  return { ok: true, messages: [`🎲 Manche ${state.roundNumber} commencée ! Retournez 2 cartes chacun.`] };
}

export function resetToLobby(room: GameRoom) {
  const { state } = room;
  room.drawPile = [];
  state.players = state.players.filter(p => !p.replacedHuman);
  state.phase = 'lobby';
  state.roundNumber = 0;
  state.winnerId = null;
  state.doubledPlayerId = null;
  state.discardPile = [];
  state.currentDrawnCard = null;
  state.turnAction = 'choose_source';
  state.finalRoundTriggeredBy = null;
  state.lastTurnPlayerIds = [];
  state.players.forEach(p => {
    p.totalScore = 0;
    p.roundScore = 0;
    p.cards = [];
    p.revealedCount = 0;
    p.initialRevealedCount = 0;
    p.hasFinishedRound = false;
  });
}

export function revealInitialCard(room: GameRoom, playerId: string, cardIndex: number): ActionResult {
  const { state } = room;
  if (state.phase !== 'initial_revealing') return fail('Ce n\'est plus le moment de révéler une carte.');
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.initialRevealedCount >= 2) return fail('Vous avez déjà retourné vos 2 cartes.');

  const card = player.cards[cardIndex];
  if (!card || card.isRevealed) return fail('Choisissez une carte face cachée.');

  card.isRevealed = true;
  player.initialRevealedCount++;
  player.revealedCount++;
  player.roundScore = calculatePlayerScore(player.cards, true);
  return { ok: true, messages: startPlayIfReady(room) };
}

function startPlayIfReady(room: GameRoom): string[] {
  const { state } = room;
  if (!state.players.every(p => p.initialRevealedCount >= 2)) return [];

  // Player with highest initial sum starts
  let highestSum = -999;
  let starterIndex = 0;
  state.players.forEach((p, idx) => {
    const sum = calculatePlayerScore(p.cards, true);
    if (sum > highestSum) {
      highestSum = sum;
      starterIndex = idx;
    }
  });

  state.currentPlayerIndex = starterIndex;
  state.phase = 'playing';
  state.turnAction = 'choose_source';

  const starter = state.players[starterIndex];
  return [`🎮 Tous les joueurs sont prêts ! ${starter.name} commence la manche avec un score initial de ${highestSum} pts.`];
}

function activePlayer(room: GameRoom, playerId: string): Player | null {
  const { state } = room;
  if (state.phase !== 'playing') return null;
  const player = state.players[state.currentPlayerIndex];
  return player && player.id === playerId ? player : null;
}

export function recycleDiscardPile(room: GameRoom) {
  const { state } = room;
  if (state.discardPile.length <= 1) return;
  const top = state.discardPile.pop()!;
  room.drawPile = shuffleDeck(state.discardPile.map(c => ({ ...c, isRevealed: false })));
  state.discardPile = [top];
}

export function drawCard(room: GameRoom, playerId: string): ActionResult {
  const { state } = room;
  if (!activePlayer(room, playerId)) return fail('Ce n\'est pas votre tour.');
  if (state.turnAction !== 'choose_source') return fail('Vous avez déjà une carte en main.');

  if (room.drawPile.length === 0) recycleDiscardPile(room);
  const card = room.drawPile.pop();
  if (!card) return fail('La pioche est vide.');

  card.isRevealed = true;
  state.currentDrawnCard = card;
  state.turnAction = 'drawn_card_choice';
  return { ok: true, messages: [] };
}

export function takeDiscard(room: GameRoom, playerId: string): ActionResult {
  const { state } = room;
  if (!activePlayer(room, playerId)) return fail('Ce n\'est pas votre tour.');
  if (state.turnAction !== 'choose_source') return fail('Vous avez déjà une carte en main.');

  const top = state.discardPile.pop();
  if (!top) return fail('La défausse est vide.');

  state.currentDrawnCard = top;
  state.turnAction = 'discard_choice';
  return { ok: true, messages: [] };
}

export function swapCard(room: GameRoom, playerId: string, cardIndex: number): ActionResult {
  const { state } = room;
  const player = activePlayer(room, playerId);
  if (!player) return fail('Ce n\'est pas votre tour.');
  if (!state.currentDrawnCard) return fail('Prenez d\'abord une carte.');

  const oldCard = player.cards[cardIndex];
  if (!oldCard) return fail('Cet emplacement est vide.'); // eliminated column or invalid index

  // Put drawn card in player's grid
  player.cards[cardIndex] = { ...state.currentDrawnCard, isRevealed: true };
  // Put old card on discard pile (revealed)
  state.discardPile.push({ ...oldCard, isRevealed: true });
  state.currentDrawnCard = null;

  return { ok: true, messages: completeTurn(room, player) };
}

export function discardAndFlip(room: GameRoom, playerId: string, flipIndex: number): ActionResult {
  const { state } = room;
  const player = activePlayer(room, playerId);
  if (!player) return fail('Ce n\'est pas votre tour.');
  if (state.turnAction !== 'drawn_card_choice' || !state.currentDrawnCard) {
    return fail('Une carte prise dans la défausse doit être échangée.');
  }

  const targetCard = player.cards[flipIndex];
  if (!targetCard || targetCard.isRevealed) return fail('Choisissez une carte face cachée.');

  // Put drawn card on discard pile
  state.discardPile.push({ ...state.currentDrawnCard, isRevealed: true });
  state.currentDrawnCard = null;
  targetCard.isRevealed = true;

  return { ok: true, messages: completeTurn(room, player) };
}

function updatePlayerStats(player: Player) {
  let revCount = 0;
  let remainingCount = 0;
  player.cards.forEach(c => {
    if (c) {
      remainingCount++;
      if (c.isRevealed) revCount++;
    }
  });
  player.revealedCount = revCount;
  player.roundScore = calculatePlayerScore(player.cards, true);
  // A grid emptied by eliminations also ends the round: that player has nothing left to play
  if (revCount >= remainingCount) {
    player.hasFinishedRound = true;
  }
}

function completeTurn(room: GameRoom, player: Player): string[] {
  const { state } = room;
  const messages: string[] = [];

  // Check column elimination: the cards go to the discard pile
  const { newCards, eliminatedCards, eliminatedColumns } = checkAndEliminateColumns(player.cards);
  player.cards = newCards;
  if (eliminatedColumns.length > 0) {
    state.discardPile.push(...eliminatedCards.map(c => ({ id: c.id, value: c.value, isRevealed: true })));
    messages.push(`🎉 ${player.name} a éliminé une colonne complète !`);
  }

  updatePlayerStats(player);

  // Check if player revealed all remaining cards
  if (player.hasFinishedRound && !state.finalRoundTriggeredBy) {
    state.finalRoundTriggeredBy = player.id;
    // All other players get one final turn
    state.lastTurnPlayerIds = state.players.filter(p => p.id !== player.id).map(p => p.id);
    messages.push(`⚡ ${player.name} a retourné toutes ses cartes ! Dernier tour pour tout le monde !`);
  } else if (state.finalRoundTriggeredBy) {
    // Remove current player from lastTurnPlayerIds if they were in it
    state.lastTurnPlayerIds = state.lastTurnPlayerIds.filter(id => id !== player.id);
  }

  // Check if round is finished: no lastTurnPlayerIds left when final round triggered
  if (state.finalRoundTriggeredBy && state.lastTurnPlayerIds.length === 0) {
    messages.push(...endRound(room));
    return messages;
  }

  // Advance to next player
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.turnAction = 'choose_source';
  return messages;
}

function endRound(room: GameRoom): string[] {
  const { state } = room;
  const messages: string[] = [];

  // Reveal all remaining unrevealed cards for everyone
  state.players.forEach(p => {
    p.cards.forEach(c => {
      if (c && !c.isRevealed) {
        c.isRevealed = true;
      }
    });
    // Check column triples on final reveal
    const { newCards } = checkAndEliminateColumns(p.cards);
    p.cards = newCards;
    p.roundScore = calculatePlayerScore(p.cards, false);
  });

  // Calculate scores and check Doubling Rule
  const triggerPlayerId = state.finalRoundTriggeredBy;
  const triggerPlayer = state.players.find(p => p.id === triggerPlayerId);

  if (triggerPlayer) {
    const otherMinScore = Math.min(
      ...state.players.filter(p => p.id !== triggerPlayerId).map(p => p.roundScore)
    );

    // If trigger player does NOT have strictly lowest score: their positive score is doubled!
    if (triggerPlayer.roundScore >= otherMinScore && triggerPlayer.roundScore > 0) {
      const originalScore = triggerPlayer.roundScore;
      triggerPlayer.roundScore *= 2;
      state.doubledPlayerId = triggerPlayer.id;
      messages.push(
        `⚠️ ${triggerPlayer.name} a terminé en premier mais n'a pas le score le plus bas ! Score doublé : ${originalScore} ➔ ${triggerPlayer.roundScore} pts !`
      );
    }
  }

  // Update total scores
  state.players.forEach(p => {
    p.totalScore += p.roundScore;
  });

  // Check if any player reached target score (e.g., 100 points)
  const gameOver = state.players.some(p => p.totalScore >= state.targetScore);

  if (gameOver || state.targetScore === 1) {
    state.phase = 'game_over';
    // Winner is player with lowest total score
    const winner = state.players.reduce((best, p) => (p.totalScore < best.totalScore ? p : best));
    state.winnerId = winner.id;
    messages.push(`🏆 Victoire de ${winner.name} avec ${winner.totalScore} points au total !`);
  } else {
    state.phase = 'round_ended';
    messages.push(`🏁 Manche ${state.roundNumber} terminée ! Consultez les scores.`);
  }

  return messages;
}

// What every client may see: hidden cards lose their value AND their id,
// because ids are assigned before the shuffle and would reveal the value.
export function publicState(room: GameRoom): GameState {
  return {
    ...room.state,
    drawPileCount: room.drawPile.length,
    players: room.state.players.map(p => ({
      ...p,
      cards: p.cards.map((card, idx) =>
        card && !card.isRevealed ? { id: `hidden-${p.id}-${idx}`, value: 0, isRevealed: false } : card
      ),
    })),
  };
}

// Gives a seat back to the human who left it, cards and scores included.
export function restoreHuman(player: Player) {
  player.isBot = false;
  player.botLevel = undefined;
  player.replacedHuman = false;
}

// Seats a bot in place of a human who left, so the others can finish the game.
export function replaceWithBot(player: Player) {
  player.isBot = true;
  player.botLevel = 'normal';
  player.replacedHuman = true;
  player.isHost = false;
  player.isConnected = true;
}
