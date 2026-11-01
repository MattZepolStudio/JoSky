import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState, JoskyCard } from '../src/types/game.ts';
import { GameRoom, createGameState, createPlayer, publicState, revealInitialCard, startRound } from '../src/game/engine.ts';
import { applyReveal, buildRevealSlots } from '../src/utils/endReveal.ts';

function states() {
  const host = createPlayer({ id: 'p0', name: 'P0', avatar: '🦊', isHost: true });
  const room: GameRoom = { state: createGameState('TEST', host, 100), drawPile: [] };
  room.state.players.push(createPlayer({ id: 'p1', name: 'P1', avatar: '🐼', isHost: false }));
  startRound(room);
  room.state.players.forEach(p => {
    revealInitialCard(room, p.id, 0);
    revealInitialCard(room, p.id, 1);
  });
  const prev: GameState = structuredClone(publicState(room));

  const next: GameState = structuredClone(prev);
  next.phase = 'round_ended';
  next.doubledPlayerId = 'p1';
  next.players.forEach((player, p) => {
    player.cards = player.cards.map((_, i): JoskyCard => ({ id: `c${p}-${i}`, value: 1, isRevealed: true }));
    player.roundScore = 12;
    player.totalScore = 12;
  });
  return { prev, next };
}

test('seules les cartes encore cachées sont à révéler, et seulement en fin de manche', () => {
  const { prev, next } = states();
  assert.equal(buildRevealSlots(prev, next).length, 20);
  assert.deepEqual(buildRevealSlots(null, next), []);
  assert.deepEqual(buildRevealSlots(prev, prev), []);
  assert.deepEqual(buildRevealSlots(next, next), []);
});

test('les cartes se révèlent une à une et les scores restent cachés jusqu\'au bout', () => {
  const { prev, next } = states();
  const slots = buildRevealSlots(prev, next);

  const start = applyReveal(prev, next, slots, 0);
  assert.equal(start.phase, 'playing');
  assert.equal(start.doubledPlayerId, null);
  assert.equal(start.players[0].cards.filter(c => c?.isRevealed).length, 2);
  assert.equal(start.players[0].totalScore, 0);

  const partway = applyReveal(prev, next, slots, 1);
  assert.equal(partway.players[0].cards.filter(c => c?.isRevealed).length, 3);
  assert.notEqual(partway.players[0].roundScore, 12);

  const done = applyReveal(prev, next, slots, slots.length);
  assert.equal(done.players[0].totalScore, 12);
  assert.ok(done.players.flatMap(p => p.cards).every(c => c?.isRevealed));
});

test('une colonne complétée par la révélation ne disparaît qu\'à la fin', () => {
  const { prev, next } = states();
  next.players[0].cards[2] = null;
  const slots = buildRevealSlots(prev, next);

  assert.ok(applyReveal(prev, next, slots, slots.length - 1).players[0].cards[2]);
  assert.equal(applyReveal(prev, next, slots, slots.length).players[0].cards[2], null);
});
