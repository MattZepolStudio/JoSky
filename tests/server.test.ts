import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { ChildProcess, spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { io, Socket } from 'socket.io-client';
import { GameState } from '../src/types/game.ts';

// Real server with short timers, driven by real socket clients
const PORT = 3461;
const URL = `http://127.0.0.1:${PORT}`;
const TURN_MS = 700;

interface Client {
  socket: Socket;
  token: string;
  id: string;
  last: GameState;
  rejected: string[];
}

let server: ChildProcess;
let dataDir: string;
const clients: Socket[] = [];

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const newToken = () => randomBytes(24).toString('hex');
const ask = (socket: Socket, event: string, data?: unknown) =>
  new Promise<any>(resolve => socket.emit(event, data, resolve));

async function waitFor(check: () => boolean, label: string, timeoutMs = 3000) {
  const start = Date.now();
  while (!check()) {
    assert.ok(Date.now() - start < timeoutMs, `délai dépassé: ${label}`);
    await wait(20);
  }
}

async function startServer() {
  server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      DATA_FILE: path.join(dataDir, 'rooms.json'),
      TURN_MS: String(TURN_MS),
      ABSENT_TURN_MS: String(TURN_MS),
      REVEAL_MS: String(TURN_MS),
      BOT_STEP_MS: '40',
      BOT_REVEAL_MS: '40',
      SAVE_MS: '100',
      SWEEP_MS: '100',
      HOST_GRACE_MS: '200',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 300; i++) {
    try {
      if ((await fetch(`${URL}/healthz`)).ok) return;
    } catch {}
    await wait(50);
  }
  throw new Error('le serveur ne démarre pas');
}

async function stopServer() {
  const exited = new Promise(resolve => server.once('exit', resolve));
  server.kill('SIGTERM');
  await exited;
}

async function connect(): Promise<Socket> {
  const socket = io(URL, { transports: ['websocket'], reconnection: false, forceNew: true });
  clients.push(socket);
  await new Promise<void>(resolve => socket.once('connect', () => resolve()));
  return socket;
}

async function connectClient(event: string, payload: object): Promise<Client> {
  const socket = await connect();
  const token = newToken();
  const client = { socket, token, id: '', last: null as unknown as GameState, rejected: [] as string[] };
  socket.on('game_state_update', (state: GameState) => {
    client.last = state;
  });
  socket.on('action_rejected', (message: string) => client.rejected.push(message));

  const res = await ask(socket, event, { ...payload, sessionToken: token });
  assert.equal(res.success, true, res.error);
  client.id = res.playerId;
  client.last = res.state;
  return client;
}

async function twoPlayerGame(targetScore = 100) {
  const host = await connectClient('create_room', { playerName: 'Alice', targetScore });
  const guest = await connectClient('join_room', { playerName: 'Bob', roomCode: host.last.roomCode });
  host.socket.emit('start_game');
  await waitFor(() => guest.last.phase === 'initial_revealing', 'début de manche');

  for (const client of [host, guest]) {
    for (const cardIndex of [0, 1]) client.socket.emit('reveal_initial_card', { cardIndex });
  }
  await waitFor(() => guest.last.phase === 'playing', 'début du jeu');

  const activeId = guest.last.players[guest.last.currentPlayerIndex].id;
  const [active, idle] = activeId === host.id ? [host, guest] : [guest, host];
  return { host, guest, active, idle, code: host.last.roomCode };
}

before(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'josky-server-'));
  await startServer();
});

after(async () => {
  clients.forEach(socket => socket.close());
  await stopServer();
  await fs.rm(dataDir, { recursive: true, force: true });
});

test('aucun client ne reçoit de carte cachée ni de jeton', async () => {
  const { guest, host } = await twoPlayerGame();
  const payload = JSON.stringify(guest.last);
  const hidden = guest.last.players.flatMap(p => p.cards).filter(c => c && !c.isRevealed);

  assert.equal(hidden.length, 20);
  assert.ok(hidden.every(c => c!.value === 0 && c!.id.startsWith('hidden-')));
  assert.equal(payload.includes(host.token), false);
  assert.equal(payload.includes(guest.token), false);
  assert.equal(payload.includes('sessionToken'), false);
  assert.notEqual(host.id, host.token);
});

test('un joueur ne peut pas agir à la place d\'un autre', async () => {
  const { idle, active, code } = await twoPlayerGame();
  // Everything public about the victim is sent along with the action
  idle.socket.emit('draw_card', { roomCode: code, playerId: active.id, sessionToken: active.id });
  await waitFor(() => idle.rejected.length > 0, 'refus');
  assert.equal(idle.last.turnAction, 'choose_source');
});

test('un inconnu avec le code ne prend pas la place du joueur seul', async () => {
  const host = await connectClient('create_room', { playerName: 'Alice' });
  const intruder = await connect();
  const res = await ask(intruder, 'rejoin_room', { roomCode: host.last.roomCode, sessionToken: newToken() });
  assert.equal(res.success, false);
  intruder.emit('add_bot', { roomCode: host.last.roomCode, sessionToken: host.id });
  await wait(80);
  assert.equal(host.last.players.length, 1);
});

test('seul l\'hôte contrôle le salon', async () => {
  const host = await connectClient('create_room', { playerName: 'Alice' });
  const guest = await connectClient('join_room', { playerName: 'Bob', roomCode: host.last.roomCode });

  guest.socket.emit('add_bot');
  guest.socket.emit('update_settings', { targetScore: 60 });
  guest.socket.emit('start_game');
  await wait(100);
  assert.equal(host.last.players.length, 2);
  assert.equal(host.last.targetScore, 100);
  assert.equal(host.last.phase, 'lobby');
});

test('une partie en cours ne peut pas être réinitialisée', async () => {
  const { host, guest } = await twoPlayerGame();
  guest.socket.emit('restart_game');
  host.socket.emit('restart_game');
  await wait(100);
  assert.equal(host.last.phase, 'playing');
});

test('les entrées invalides sont nettoyées', async () => {
  const client = await connectClient('create_room', { playerName: 'N'.repeat(5000), targetScore: -5, avatar: '<b>' });
  const me = client.last.players[0];
  assert.equal(me.name.length, 15);
  assert.equal(client.last.targetScore, 100);
  assert.notEqual(me.avatar, '<b>');
});

test('des événements malformés ne font pas tomber le serveur', async () => {
  const socket = await connect();
  for (const event of ['create_room', 'join_room', 'rejoin_room', 'swap_card', 'send_chat', 'leave_room', 'add_bot']) {
    socket.emit(event);
    socket.emit(event, null);
    socket.emit(event, 42, 'pas une fonction');
  }
  await wait(100);
  assert.equal((await fetch(`${URL}/healthz`)).ok, true);
});

test('un joueur inactif ne bloque pas la partie', async () => {
  const { idle, active } = await twoPlayerGame();
  assert.ok(idle.last.turnEndsInMs! > 0);
  await waitFor(
    () => idle.last.players[idle.last.currentPlayerIndex].id === idle.id,
    'tour joué automatiquement',
    TURN_MS * 3
  );
  assert.ok(active.last.players.find(p => p.id === active.id)!.revealedCount >= 2);
});

test('un joueur déconnecté voit son tour joué puis récupère sa place', async () => {
  const { idle, active, code } = await twoPlayerGame();
  active.socket.close();
  await waitFor(() => idle.last.players.find(p => p.id === active.id)!.isConnected === false, 'déconnexion');
  await waitFor(
    () => idle.last.players[idle.last.currentPlayerIndex].id === idle.id,
    'tour de l\'absent joué',
    TURN_MS * 3
  );

  const socket = await connect();
  const res = await ask(socket, 'rejoin_room', { roomCode: code, sessionToken: active.token });
  assert.equal(res.success, true);
  assert.equal(res.playerId, active.id);
  await waitFor(() => idle.last.players.find(p => p.id === active.id)!.isConnected, 'reconnexion');
});

test('quitter en pleine partie laisse un bot et transmet le rôle d\'hôte', async () => {
  const { host, guest } = await twoPlayerGame();
  host.socket.emit('leave_room');
  await waitFor(() => guest.last.players.find(p => p.id === host.id)!.isBot === true, 'bot de remplacement');
  assert.equal(guest.last.players.find(p => p.id === guest.id)!.isHost, true);

  assert.equal((await ask(host.socket, 'check_resume', { roomCode: guest.last.roomCode, sessionToken: host.token })).canResume, true);
  assert.equal((await ask(host.socket, 'check_resume', { roomCode: guest.last.roomCode, sessionToken: newToken() })).canResume, false);
});

test('un joueur parti reprend sa place, ses cartes et son score au bot', async () => {
  const { host, guest } = await twoPlayerGame();
  const code = guest.last.roomCode;
  const cards = JSON.stringify(guest.last.players.find(p => p.id === host.id)!.cards.filter(c => c?.isRevealed));
  host.socket.emit('leave_room');
  await waitFor(() => guest.last.players.find(p => p.id === host.id)!.isBot === true, 'bot en place');

  const res = await ask(host.socket, 'rejoin_room', { roomCode: code, sessionToken: host.token });
  assert.equal(res.success, true);
  assert.equal(res.playerId, host.id);

  await waitFor(() => !guest.last.players.find(p => p.id === host.id)!.isBot, 'place reprise');
  const seat = guest.last.players.find(p => p.id === host.id)!;
  assert.equal(seat.replacedHuman, false);
  assert.equal(seat.botLevel, undefined);
  assert.equal(seat.isConnected, true);
  assert.equal(seat.isHost, false, 'le nouvel hôte le reste');
  assert.ok(JSON.stringify(seat.cards).length > 0 && cards.length > 0);
});

test('reprendre sa place empêche le bot de jouer le coup prévu', async () => {
  const host = await connectClient('create_room', { playerName: 'Alice' });
  host.socket.emit('add_bot');
  await waitFor(() => host.last.players.length === 2, 'bot ajouté');
  host.socket.emit('start_game');
  await waitFor(() => host.last.phase === 'initial_revealing', 'début');
  host.socket.emit('reveal_initial_card', { cardIndex: 0 });
  host.socket.emit('reveal_initial_card', { cardIndex: 1 });
  await waitFor(() => host.last.phase === 'playing', 'jeu');

  // Alone against a bot: leaving pauses the game instead of deleting it
  const code = host.last.roomCode;
  const before = JSON.stringify(host.last.players.map(p => p.revealedCount));
  host.socket.emit('leave_room');
  await wait(300);
  const res = await ask(host.socket, 'rejoin_room', { roomCode: code, sessionToken: host.token });
  assert.equal(res.success, true);
  assert.equal(JSON.stringify(res.state.players.map((p: { revealedCount: number }) => p.revealedCount)), before, 'partie en pause');
  assert.equal(res.state.players.find((p: { id: string }) => p.id === host.id).isHost, true);
  assert.equal(res.state.players.find((p: { id: string }) => p.id === host.id).isBot, false);
});

test('un hôte absent perd son rôle au profit d\'un joueur connecté', async () => {
  const { host, guest } = await twoPlayerGame();
  host.socket.close();
  await waitFor(() => guest.last.players.find(p => p.id === guest.id)!.isHost, 'nouvel hôte');
});

test('un salon accepte 7 joueurs au maximum', async () => {
  const host = await connectClient('create_room', { playerName: 'Alice' });
  for (let i = 0; i < 8; i++) host.socket.emit('add_bot');
  await waitFor(() => host.last.players.length === 7, 'salon rempli');
  await wait(80);
  assert.equal(host.last.players.length, 7);

  const late = await connect();
  const res = await ask(late, 'join_room', { roomCode: host.last.roomCode, sessionToken: newToken() });
  assert.equal(res.success, false);
  assert.match(res.error, /max 7/);
});

test('le chat limite les rafales de messages', async () => {
  const host = await connectClient('create_room', { playerName: 'Alice' });
  const received: string[] = [];
  host.socket.on('chat_message', (msg: { text: string }) => received.push(msg.text));

  for (let i = 0; i < 12; i++) host.socket.emit('send_chat', { text: `message ${i}` });
  await waitFor(() => host.rejected.length > 0, 'refus du chat');
  await wait(50);
  assert.equal(received.length, 8);
});

test('les réactions sont filtrées, limitées et diffusées à tout le salon', async () => {
  const { host, guest } = await twoPlayerGame();
  const received: { playerId: string; emoji: string }[] = [];
  guest.socket.on('player_reaction', (reaction: { playerId: string; emoji: string }) => received.push(reaction));

  host.socket.emit('send_reaction', { emoji: '<script>' });
  host.socket.emit('send_reaction', { emoji: '👏' });
  await waitFor(() => received.length === 1, 'réaction reçue');
  assert.deepEqual(received[0], { playerId: host.id, emoji: '👏' });

  for (let i = 0; i < 10; i++) host.socket.emit('send_reaction', { emoji: '🔥' });
  await wait(100);
  assert.equal(received.length, 6);
  assert.equal(host.last.phase, 'playing');
});

async function finishGame(host: Client) {
  await waitFor(() => {
    const { last } = host;
    const me = last.players.find(p => p.id === host.id)!;
    if (last.phase === 'initial_revealing') {
      host.socket.emit('reveal_initial_card', { cardIndex: me.initialRevealedCount });
    } else if (last.phase === 'playing' && last.players[last.currentPlayerIndex].id === host.id) {
      if (last.turnAction === 'choose_source') host.socket.emit('draw_card');
      else host.socket.emit('discard_and_flip', { flipIndex: me.cards.findIndex(c => c && !c.isRevealed) });
    }
    return last.phase === 'game_over';
  }, 'fin de partie', 10000);
}

test('la revanche relance tout de suite avec les mêmes joueurs', async () => {
  const host = await connectClient('create_room', { playerName: 'Alice', targetScore: 1 });
  host.socket.emit('add_bot', { level: 'easy' });
  await waitFor(() => host.last.players.length === 2, 'bot ajouté');
  const players = host.last.players.map(p => p.id);
  host.socket.emit('start_game');
  await waitFor(() => host.last.phase === 'initial_revealing', 'début');
  await finishGame(host);

  host.socket.emit('rematch');
  await waitFor(() => host.last.phase === 'initial_revealing', 'revanche');
  assert.deepEqual(host.last.players.map(p => p.id), players);
  assert.equal(host.last.roundNumber, 1);
  assert.equal(host.last.targetScore, 1);
  assert.ok(host.last.players.every(p => p.totalScore === 0));
  assert.equal(host.last.winnerId, null);
});

test('la revanche est refusée pendant une partie', async () => {
  const { host, guest } = await twoPlayerGame(1);
  guest.socket.emit('rematch');
  await wait(80);
  assert.equal(guest.last.phase, 'playing');
  assert.equal(host.last.roundNumber, 1);
});

test('le dernier humain qui quitte ferme le salon', async () => {
  const host = await connectClient('create_room', { playerName: 'Alice' });
  const code = host.last.roomCode;
  host.socket.emit('add_bot', { level: 'hard' });
  await waitFor(() => host.last.players.length === 2, 'bot ajouté');
  assert.equal(host.last.players[1].botLevel, 'hard');

  host.socket.emit('leave_room');
  await wait(80);
  const socket = await connect();
  const res = await ask(socket, 'join_room', { roomCode: code, sessionToken: newToken() });
  assert.equal(res.success, false);
});

test('une partie complète contre un bot se termine jusqu\'au game over', async () => {
  const host = await connectClient('create_room', { playerName: 'Alice', targetScore: 1 });
  host.socket.emit('add_bot', { level: 'hard' });
  await waitFor(() => host.last.players.length === 2, 'bot ajouté');
  host.socket.emit('start_game');
  await waitFor(() => host.last.phase === 'initial_revealing', 'début');
  assert.equal(host.last.roundNumber, 1);

  // The human never plays: their turns time out, so shorten the wait by acting
  await waitFor(() => {
    const { last } = host;
    if (last.phase === 'initial_revealing') {
      host.socket.emit('reveal_initial_card', { cardIndex: last.players[0].initialRevealedCount });
    } else if (last.phase === 'playing' && last.players[last.currentPlayerIndex].id === host.id) {
      if (last.turnAction === 'choose_source') {
        host.socket.emit('draw_card');
      } else {
        const index = last.players[0].cards.findIndex(c => c && !c.isRevealed);
        host.socket.emit('discard_and_flip', { flipIndex: index });
      }
    }
    return last.phase === 'game_over';
  }, 'fin de partie', 10000);

  assert.ok(host.last.winnerId);
  assert.ok(host.last.players.flatMap(p => p.cards).every(c => !c || c.isRevealed));
});

test('une partie survit à un redémarrage du serveur', async () => {
  const { guest, host, code } = await twoPlayerGame();
  const scores = guest.last.players.map(p => p.revealedCount);

  // Windows kills the process without SIGTERM, so rely on the periodic save
  await wait(300);
  await stopServer();
  await startServer();

  const socket = await connect();
  const res = await ask(socket, 'rejoin_room', { roomCode: code, sessionToken: host.token });
  assert.equal(res.success, true);
  assert.equal(res.playerId, host.id);
  assert.equal(res.state.phase, 'playing');
  assert.deepEqual(res.state.players.map((p: { revealedCount: number }) => p.revealedCount), scores);
  assert.equal(res.state.players.find((p: { id: string }) => p.id === guest.id).isConnected, false);
});
