import test from 'node:test';
import assert from 'node:assert/strict';
import { GameRoom, createGameState, createPlayer, drawCard, discardAndFlip, publicState, revealInitialCard, startRound, takeDiscard } from '../src/game/engine.ts';
import { getTutorialStep } from '../src/utils/tutorial.ts';

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

test('aucune bulle hors partie', () => {
  assert.equal(getTutorialStep(null, undefined, false, false), null);
  const room = newRoom();
  room.state.phase = 'round_ended';
  assert.equal(stepFor(room, 'p0'), null);
});
