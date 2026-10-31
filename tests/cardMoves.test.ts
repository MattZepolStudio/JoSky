import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState, JoskyCard } from '../src/types/game.ts';
import { GameRoom, createGameState, createPlayer, drawCard, discardAndFlip, publicState, revealInitialCard, startRound, swapCard, takeDiscard } from '../src/game/engine.ts';
import { deriveCardMoves, deriveEliminatedColumns, deriveLastRoundTrigger, gridAnchor } from '../src/utils/cardMoves.ts';

function playingRoom() {
  const host = createPlayer({ id: 'p0', name: 'P0', avatar: '🦊', isHost: true });
  const room: GameRoom = { state: createGameState('TEST', host, 100), drawPile: [] };
  room.state.players.push(createPlayer({ id: 'p1', name: 'P1', avatar: '🐼', isHost: false }));
  startRound(room);
  room.state.players.forEach(p => {
    revealInitialCard(room, p.id, 0);
    revealInitialCard(room, p.id, 1);
  });
  return { room, active: room.state.players[room.state.currentPlayerIndex] };
}

// Same data as a client receives: a copy with hidden cards masked
const snapshot = (room: GameRoom): GameState => structuredClone(publicState(room));

test('piocher fait voler la carte de la pioche vers la main', () => {
  const { room, active } = playingRoom();
  const before = snapshot(room);
  drawCard(room, active.id);
  const moves = deriveCardMoves(before, snapshot(room));
  assert.deepEqual(moves.map(m => [m.from, m.to]), [['draw', 'hand']]);
  assert.equal(moves[0].card.id, room.state.currentDrawnCard!.id);
});

test('prendre la défausse fait voler la carte vers la main', () => {
  const { room, active } = playingRoom();
  const before = snapshot(room);
  takeDiscard(room, active.id);
  assert.deepEqual(deriveCardMoves(before, snapshot(room)).map(m => [m.from, m.to]), [['discard', 'hand']]);
});

test('un échange pose la carte puis envoie l\'ancienne à la défausse', () => {
  const { room, active } = playingRoom();
  drawCard(room, active.id);
  const before = snapshot(room);
  const held = room.state.currentDrawnCard!;
  const hiddenValue = active.cards[7]!.value;
  swapCard(room, active.id, 7);

  const moves = deriveCardMoves(before, snapshot(room));
  const slot = gridAnchor(active.id, 7);
  assert.deepEqual(moves.map(m => [m.from, m.to]), [['hand', slot], [slot, 'discard']]);
  assert.equal(moves[0].card.id, held.id);
  assert.equal(moves[1].card.value, hiddenValue, 'la carte révélée vole avec sa vraie valeur');
  assert.ok(moves[1].delayMs > 0);
});

test('un coup normal n\'annonce aucune colonne éliminée', () => {
  const { room, active } = playingRoom();
  drawCard(room, active.id);
  const before = snapshot(room);
  swapCard(room, active.id, 7);
  assert.deepEqual(deriveEliminatedColumns(before, snapshot(room)), []);
  assert.deepEqual(deriveEliminatedColumns(null, snapshot(room)), []);
});

test('jeter fait voler la carte vers la défausse', () => {
  const { room, active } = playingRoom();
  drawCard(room, active.id);
  const before = snapshot(room);
  discardAndFlip(room, active.id, 5);
  assert.deepEqual(deriveCardMoves(before, snapshot(room)).map(m => [m.from, m.to]), [['hand', 'discard']]);
});

test('un échange qui élimine une colonne reste animé vers la bonne case', () => {
  const { room, active } = playingRoom();
  const card = (id: string, value: number): JoskyCard => ({ id, value, isRevealed: true });
  active.cards[2] = card('c2', 7);
  active.cards[6] = card('c6', 7);
  room.state.discardPile.push(card('c9', 7));
  takeDiscard(room, active.id);
  const before = snapshot(room);
  swapCard(room, active.id, 10);

  assert.equal(room.state.players.find(p => p.id === active.id)!.cards[10], null);
  assert.deepEqual(deriveCardMoves(before, snapshot(room))[0].to, gridAnchor(active.id, 10));
  assert.deepEqual(deriveEliminatedColumns(before, snapshot(room)), [active.id]);
});

test('le dernier tour est annoncé une seule fois', () => {
  const { room, active } = playingRoom();
  const before = snapshot(room);
  const started = { ...snapshot(room), finalRoundTriggeredBy: active.id };
  assert.equal(deriveLastRoundTrigger(before, started), active.id);
  assert.equal(deriveLastRoundTrigger(started, started), null);
  assert.equal(deriveLastRoundTrigger(before, before), null);
});

test('aucun vol entre deux manches ou sans état précédent', () => {
  const { room, active } = playingRoom();
  const before = snapshot(room);
  assert.deepEqual(deriveCardMoves(null, before), []);

  drawCard(room, active.id);
  assert.deepEqual(deriveCardMoves({ ...before, roundNumber: 9 }, snapshot(room)), []);
});
