import test from 'node:test';
import assert from 'node:assert/strict';
import { GameRoom, createGameState, createPlayer, drawCard, discardAndFlip, publicState, revealInitialCard, startRound, takeDiscard } from '../src/game/engine.ts';
import { getTutorialStep, hasNegativeOffer, isDoublingRisk } from '../src/utils/tutorial.ts';

function newRoom() {
  const host = createPlayer({ id: 'p0', name: 'P0', avatar: '🦊', isHost: true });
  const room: GameRoom = { state: createGameState('TEST', host, 100), drawPile: [] };
  room.state.players.push(createPlayer({ id: 'p1', name: 'P1', avatar: '🐼', isHost: false }));
  startRound(room);
  return room;
}

const stepFor = (room: GameRoom, id: string, isFlipping = false) => {
  const state = publicState(room);
  const me = state.players.find(p => p.id === id);
  const isMyTurn = state.players[state.currentPlayerIndex]?.id === id;
  return getTutorialStep(state, me, isMyTurn, isFlipping);
};

function startPlaying(room: GameRoom) {
  room.state.players.forEach(p => {
    revealInitialCard(room, p.id, 0);
    revealInitialCard(room, p.id, 1);
  });
  const active = room.state.players[room.state.currentPlayerIndex];
  return { active, other: room.state.players.find(p => p.id !== active.id)! };
}

test('le tutoriel suit le début de la manche', () => {
  const room = newRoom();
  assert.equal(stepFor(room, 'p0'), 'reveal');
  revealInitialCard(room, 'p0', 0);
  assert.equal(stepFor(room, 'p0'), 'reveal');
  revealInitialCard(room, 'p0', 1);
  assert.equal(stepFor(room, 'p0'), null);
});

test('le tutoriel suit le geste de la pioche', () => {
  const room = newRoom();
  const { active, other } = startPlaying(room);
  assert.equal(stepFor(room, active.id), 'choose');
  assert.equal(stepFor(room, other.id), null);

  drawCard(room, active.id);
  assert.equal(stepFor(room, active.id), 'drawn');
  assert.equal(stepFor(room, active.id, true), 'flip');

  discardAndFlip(room, active.id, 5);
  assert.equal(stepFor(room, active.id), 'goal');
});

test('le tutoriel explique qu\'une carte de la défausse se garde', () => {
  const room = newRoom();
  const { active } = startPlaying(room);
  takeDiscard(room, active.id);
  assert.equal(stepFor(room, active.id), 'taken');
});

test('les cartes négatives sont signalées seulement si le joueur peut les prendre', () => {
  const room = newRoom();
  const { active } = startPlaying(room);
  room.state.discardPile.push({ id: 'n', value: -2, isRevealed: true });
  assert.equal(hasNegativeOffer(room.state, true), true);
  assert.equal(hasNegativeOffer(room.state, false), false);

  room.state.discardPile.push({ id: 'p', value: 5, isRevealed: true });
  assert.equal(hasNegativeOffer(room.state, true), false);
  room.state.currentDrawnCard = { id: 'd', value: -1, isRevealed: true };
  assert.equal(hasNegativeOffer(room.state, true), true);
  assert.equal(active.id.length > 0, true);
});

test('le risque de doublement ne vise que la dernière carte cachée d\'un joueur qui ne mène pas', () => {
  const room = newRoom();
  const { active, other } = startPlaying(room);
  const fill = (value: number, hidden: number) => Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, value, isRevealed: i >= hidden }));

  active.cards = fill(2, 1);
  other.cards = fill(1, 6);
  assert.equal(isDoublingRisk(room.state, active, true), true);
  assert.equal(isDoublingRisk(room.state, active, false), false);

  // Clearly ahead, no warning
  other.cards = fill(5, 1);
  assert.equal(isDoublingRisk(room.state, active, true), false);

  // Several cards left, no warning
  other.cards = fill(1, 6);
  active.cards = fill(2, 2);
  assert.equal(isDoublingRisk(room.state, active, true), false);

  // The last round already started
  active.cards = fill(2, 1);
  room.state.finalRoundTriggeredBy = other.id;
  assert.equal(isDoublingRisk(room.state, active, true), false);
});

test('aucune bulle hors partie', () => {
  assert.equal(getTutorialStep(null, undefined, false, false), null);
  const room = newRoom();
  room.state.phase = 'round_ended';
  assert.equal(stepFor(room, 'p0'), null);
});
