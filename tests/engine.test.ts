import test from 'node:test';
import assert from 'node:assert/strict';
import { JoskyCard } from '../src/types/game.ts';
import {
  GameRoom,
  createGameState,
  createPlayer,
  discardAndFlip,
  drawCard,
  publicState,
  recycleDiscardPile,
  replaceWithBot,
  resetToLobby,
  revealInitialCard,
  startRound,
  swapCard,
  takeDiscard,
} from '../src/game/engine.ts';
import { generateDeck } from '../src/utils/deck.ts';

function newRoom(playerCount = 2, targetScore = 100): GameRoom {
  const host = createPlayer({ id: 'p0', name: 'P0', avatar: '🦊', isHost: true });
  const room: GameRoom = { state: createGameState('TEST', host, targetScore), drawPile: [] };
  for (let i = 1; i < playerCount; i++) {
    room.state.players.push(createPlayer({ id: `p${i}`, name: `P${i}`, avatar: '🐼', isHost: false }));
  }
  startRound(room);
  return room;
}

function startPlaying(room: GameRoom) {
  room.state.players.forEach(p => {
    revealInitialCard(room, p.id, 0);
    revealInitialCard(room, p.id, 1);
  });
  return room.state.players[room.state.currentPlayerIndex];
}

const card = (id: string, value: number, isRevealed = true): JoskyCard => ({ id, value, isRevealed });

const grid = (prefix: string, value: (i: number) => number, isRevealed: (i: number) => boolean) =>
  Array.from({ length: 12 }, (_, i) => card(`${prefix}${i}`, value(i), isRevealed(i)));

function countCards(room: GameRoom): number {
  const onGrids = room.state.players.reduce((sum, p) => sum + p.cards.filter(Boolean).length, 0);
  return onGrids + room.drawPile.length + room.state.discardPile.length + (room.state.currentDrawnCard ? 1 : 0);
}

test('le paquet contient 150 cartes de valeur totale 760', () => {
  const deck = generateDeck();
  assert.equal(deck.length, 150);
  assert.equal(deck.reduce((sum, c) => sum + c.value, 0), 760);
});

test('la première manche porte le numéro 1', () => {
  assert.equal(newRoom().state.roundNumber, 1);
});

test('le joueur qui a la plus grosse somme révélée commence', () => {
  const room = newRoom();
  room.state.players[0].cards[0] = card('a', 1, false);
  room.state.players[0].cards[1] = card('b', 1, false);
  room.state.players[1].cards[0] = card('c', 12, false);
  room.state.players[1].cards[1] = card('d', 12, false);
  assert.equal(startPlaying(room).id, 'p1');
});

test('on ne peut pas révéler plus de 2 cartes ni une carte déjà visible', () => {
  const room = newRoom();
  assert.equal(revealInitialCard(room, 'p0', 0).ok, true);
  assert.equal(revealInitialCard(room, 'p0', 0).ok, false);
  assert.equal(revealInitialCard(room, 'p0', 1).ok, true);
  assert.equal(revealInitialCard(room, 'p0', 2).ok, false);
  assert.equal(revealInitialCard(room, 'p1', 99).ok, false);
});

test('un joueur ne peut pas jouer hors de son tour', () => {
  const room = newRoom();
  const active = startPlaying(room);
  const other = room.state.players.find(p => p.id !== active.id)!;
  assert.equal(drawCard(room, other.id).ok, false);
  assert.equal(takeDiscard(room, other.id).ok, false);
  assert.equal(room.state.turnAction, 'choose_source');
});

test('une carte prise dans la défausse doit être échangée', () => {
  const room = newRoom();
  const active = startPlaying(room);
  takeDiscard(room, active.id);
  assert.equal(discardAndFlip(room, active.id, 5).ok, false);
  assert.ok(room.state.currentDrawnCard);
  assert.equal(swapCard(room, active.id, 5).ok, true);
});

test('un index invalide ou une carte visible ne fait pas passer le tour', () => {
  const room = newRoom();
  const active = startPlaying(room);
  drawCard(room, active.id);
  const turn = room.state.currentPlayerIndex;
  for (const index of [99, -1, 0, 1.5, undefined as unknown as number]) {
    assert.equal(discardAndFlip(room, active.id, index).ok, false);
  }
  assert.equal(room.state.currentPlayerIndex, turn);
  assert.ok(room.state.currentDrawnCard);
});

test('une colonne identique est éliminée et ses cartes vont à la défausse', () => {
  const room = newRoom();
  const active = startPlaying(room);
  // Replace the 3 grid slots in place so the deck stays at 150 cards
  const [a, b] = [room.drawPile.pop()!, room.drawPile.pop()!];
  room.state.discardPile.unshift({ ...active.cards[2]!, isRevealed: true }, { ...active.cards[6]!, isRevealed: true });
  active.cards[2] = { ...a, value: 7, isRevealed: true };
  active.cards[6] = { ...b, value: 7, isRevealed: true };
  room.state.discardPile.push({ ...room.drawPile.pop()!, value: 7, isRevealed: true });
  const total = countCards(room);

  takeDiscard(room, active.id);
  const result = swapCard(room, active.id, 10);

  assert.equal(result.ok, true);
  assert.deepEqual([active.cards[2], active.cards[6], active.cards[10]], [null, null, null]);
  assert.deepEqual(room.state.discardPile.slice(-3).map(c => c.value), [7, 7, 7]);
  assert.equal(countCards(room), total);
  assert.equal(total, 150);
});

test('remélanger la défausse garde exactement les mêmes cartes', () => {
  const room = newRoom();
  room.state.discardPile.unshift(...room.drawPile.splice(0, room.drawPile.length).map(c => ({ ...c, isRevealed: true })));
  const expectedIds = room.state.discardPile.slice(0, -1).map(c => c.id).sort();
  const top = room.state.discardPile[room.state.discardPile.length - 1];

  recycleDiscardPile(room);

  assert.deepEqual(room.drawPile.map(c => c.id).sort(), expectedIds);
  assert.ok(room.drawPile.every(c => !c.isRevealed));
  assert.deepEqual(room.state.discardPile, [top]);
  assert.equal(countCards(room), 150);
});

test('une grille vidée par les éliminations termine la manche sans bloquer', () => {
  const room = newRoom();
  const active = startPlaying(room);
  active.cards = active.cards.map(() => null);
  active.cards[0] = card('z0', 4);
  active.cards[4] = card('z4', 4);
  active.cards[8] = card('z8', 9);
  room.state.discardPile.push(card('z9', 4));

  takeDiscard(room, active.id);
  swapCard(room, active.id, 8);

  assert.ok(active.cards.every(c => c === null));
  assert.equal(room.state.finalRoundTriggeredBy, active.id);
});

function playLastTurns(room: GameRoom, triggerId: string, otherId: string) {
  room.state.discardPile.push(card('d', 0));
  takeDiscard(room, triggerId);
  swapCard(room, triggerId, 0);
  drawCard(room, otherId);
  room.state.currentDrawnCard = card('draw', 0);
  swapCard(room, otherId, 0);
}

test('le déclencheur sans le score le plus bas voit son score positif doublé', () => {
  const room = newRoom();
  const trigger = startPlaying(room);
  const other = room.state.players.find(p => p.id !== trigger.id)!;
  // Values follow a staircase so that no column is eliminated
  trigger.cards = grid('t', i => (i === 0 ? 9 : i === 1 ? 4 : i % 4 === 0 ? 0 : i === 2 ? 1 : i === 3 ? -1 : i), i => i !== 0);
  other.cards = grid('o', i => (i === 1 ? -2 : i === 2 ? -2 : -1 * (i % 4)), () => false);

  const expected = trigger.cards.slice(1).reduce((sum, c) => sum + c!.value, 0);
  playLastTurns(room, trigger.id, other.id);

  assert.ok(['round_ended', 'game_over'].includes(room.state.phase));
  assert.ok(expected > 0);
  assert.equal(trigger.roundScore, expected * 2);
  assert.equal(room.state.doubledPlayerId, trigger.id);

  startRound(room);
  assert.equal(room.state.doubledPlayerId, null);
});

test('le déclencheur avec le score strictement le plus bas garde son score', () => {
  const room = newRoom();
  const trigger = startPlaying(room);
  const other = room.state.players.find(p => p.id !== trigger.id)!;
  trigger.cards = grid('t', i => (i === 1 ? 2 : i === 2 ? 1 : i === 3 ? -1 : i === 7 ? 3 : 0), i => i !== 0);
  other.cards = grid('o', i => 3 + (i % 4), () => false);

  playLastTurns(room, trigger.id, other.id);

  assert.ok(['round_ended', 'game_over'].includes(room.state.phase));
  assert.equal(trigger.roundScore, 5);
  assert.equal(room.state.doubledPlayerId, null);
});

test('publicState cache la valeur et l\'identifiant des cartes cachées', () => {
  const room = newRoom();
  const view = publicState(room);
  const hidden = view.players.flatMap(p => p.cards).filter(c => c && !c.isRevealed);
  assert.equal(hidden.length, 24);
  assert.ok(hidden.every(c => c!.value === 0 && c!.id.startsWith('hidden-')));
  assert.ok(room.state.players[0].cards.some(c => c && c.value !== 0), 'le vrai état reste intact');
});

test('un retour au salon retire les bots de remplacement et remet tout à zéro', () => {
  const room = newRoom(3);
  replaceWithBot(room.state.players[1]);
  room.state.players[0].totalScore = 50;
  resetToLobby(room);
  assert.deepEqual(room.state.players.map(p => p.id), ['p0', 'p2']);
  assert.equal(room.state.phase, 'lobby');
  assert.equal(room.state.roundNumber, 0);
  assert.equal(room.state.players[0].totalScore, 0);
});
