import test from 'node:test';
import assert from 'node:assert/strict';
import { BotLevel } from '../src/types/game.ts';
import {
  GameRoom,
  createGameState,
  createPlayer,
  discardAndFlip,
  drawCard,
  revealInitialCard,
  startRound,
  swapCard,
  takeDiscard,
} from '../src/game/engine.ts';
import { chooseInitialReveal, choosePlacement, chooseSource } from '../src/game/bot.ts';

const MAX_TURNS = 5000;

function countCards(room: GameRoom): number {
  const onGrids = room.state.players.reduce((sum, p) => sum + p.cards.filter(Boolean).length, 0);
  return onGrids + room.drawPile.length + room.state.discardPile.length + (room.state.currentDrawnCard ? 1 : 0);
}

function playRound(room: GameRoom, levels: BotLevel[]) {
  const { state } = room;
  startRound(room);
  state.players.forEach(p => {
    while (state.phase === 'initial_revealing' && p.initialRevealedCount < 2) {
      revealInitialCard(room, p.id, chooseInitialReveal(p));
    }
  });

  for (let turn = 0; state.phase === 'playing'; turn++) {
    assert.ok(turn < MAX_TURNS, 'la manche doit se terminer');
    assert.equal(countCards(room), 150);

    const bot = state.players[state.currentPlayerIndex];
    const level = levels[state.currentPlayerIndex];
    const first = chooseSource(state, bot, level) === 'discard' ? takeDiscard(room, bot.id) : drawCard(room, bot.id);
    assert.equal(first.ok, true);

    const move = choosePlacement(state, bot, level);
    const second = move.action === 'swap' ? swapCard(room, bot.id, move.index) : discardAndFlip(room, bot.id, move.index);
    assert.equal(second.ok, true);
  }
}

function simulate(levels: BotLevel[], rounds: number): number[] {
  const totals = levels.map(() => 0);
  for (let i = 0; i < rounds; i++) {
    const players = levels.map((_, idx) => createPlayer({ id: `b${idx}`, name: `B${idx}`, avatar: '🤖', isHost: idx === 0 }));
    const room: GameRoom = { state: createGameState('SIMU', players[0], 100000), drawPile: [] };
    room.state.players = players;
    playRound(room, levels);
    players.forEach((p, idx) => {
      totals[idx] += p.roundScore;
    });
  }
  return totals.map(total => total / rounds);
}

test('des centaines de manches de 2 à 8 bots se terminent sans perdre de carte', () => {
  const levels: BotLevel[] = ['easy', 'normal', 'hard'];
  for (let count = 2; count <= 8; count++) {
    simulate(Array.from({ length: count }, (_, i) => levels[i % 3]), 60);
  }
});

test('le niveau normal bat le niveau facile', () => {
  const [easy, normal] = simulate(['easy', 'normal'], 1500);
  console.log(`moyenne par manche: facile ${easy.toFixed(1)}, normal ${normal.toFixed(1)}`);
  assert.ok(normal < easy);
});

test('le niveau difficile bat le niveau normal', () => {
  const [normal, hard] = simulate(['normal', 'hard'], 3000);
  console.log(`moyenne par manche: normal ${normal.toFixed(1)}, difficile ${hard.toFixed(1)}`);
  assert.ok(hard < normal);
});
