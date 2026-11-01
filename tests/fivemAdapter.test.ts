import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFivemIo, FivemApi, INVITE_LIMIT, MAX_MESSAGE_LENGTH, PART_LENGTH } from '../fivem/josky-phone/server-src/adapter.ts';
import type { GameSocket } from '../src/server/gameServer.ts';

function setup() {
  const clientHandlers = new Map<string, (source: number, ...args: unknown[]) => void>();
  let dropped: (source: number) => void = () => {};
  const parts: { source: number; part: string }[] = [];
  const invites: { source: number; number: string; roomCode: string }[] = [];
  const api: FivemApi = {
    onClient: (event, handler) => clientHandlers.set(event, handler),
    onPlayerDropped: handler => { dropped = handler; },
    send: (source, part) => parts.push({ source, part }),
    licenseOf: source => (source === 3 ? undefined : `license:${source === 2 ? 1 : source}`),
    sendInvite: async (source, number, roomCode) => {
      if (number === 'panne') throw new Error('export absent');
      if (number === 'bloqué') return false;
      invites.push({ source, number, roomCode });
      return true;
    },
  };
  const io = createFivemIo(api);
  const sockets: GameSocket[] = [];
  io.on('connection', socket => sockets.push(socket));

  const decoded = (source: number) => {
    const messages = new Map<string, string[]>();
    parts.filter(p => p.source === source).forEach(({ part }) => {
      const [id, , , body] = part.split(':');
      messages.set(id, [...(messages.get(id) ?? []), body]);
    });
    return [...messages.values()].map(bodies => JSON.parse(Buffer.from(bodies.join(''), 'base64').toString('utf8')));
  };

  return {
    io, sockets, parts, invites, decoded,
    connect: (source: number) => clientHandlers.get('josky:connect')!(source),
    disconnect: (source: number) => clientHandlers.get('josky:disconnect')!(source),
    send: (source: number, message: unknown) => clientHandlers.get('josky:event')!(source, message),
    drop: (source: number) => dropped(source),
  };
}

const event = (name: string, data?: unknown, ack?: number) => JSON.stringify({ event: name, data, ack });

test('connecting opens a socket and tells the phone', () => {
  const t = setup();
  t.connect(1);
  assert.equal(t.sockets.length, 1);
  assert.deepEqual(t.decoded(1), [{ type: 'connected' }]);
});

test('the session token comes from the license, never from the phone', () => {
  const t = setup();
  t.connect(1);
  t.connect(3);
  const seen: Record<string, unknown>[] = [];
  t.sockets.forEach(socket => socket.on('draw_card', data => seen.push(data)));

  t.send(1, event('draw_card', { sessionToken: 'volé' }));
  t.send(3, event('draw_card', { sessionToken: 'volé' }));

  assert.equal(seen.length, 2);
  assert.notEqual(seen[0].sessionToken, 'volé');
  assert.notEqual(seen[0].sessionToken, seen[1].sessionToken);
  assert.ok(String(seen[0].sessionToken).length <= 128);
});

test('the same license keeps its token across reconnections', () => {
  const t = setup();
  const tokens: unknown[] = [];
  t.connect(1);
  t.sockets[0].on('draw_card', data => tokens.push(data.sessionToken));
  t.send(1, event('draw_card'));

  t.drop(1);
  t.connect(2);
  t.sockets[1].on('draw_card', data => tokens.push(data.sessionToken));
  t.send(2, event('draw_card'));

  assert.equal(tokens[0], tokens[1]);
});

test('players keep the nickname they chose', () => {
  const t = setup();
  t.connect(1);
  let name: unknown;
  t.sockets[0].on('join_room', data => { name = data.playerName; });
  t.send(1, event('join_room', { playerName: 'Hibou58' }));
  assert.equal(name, 'Hibou58');
});

test('acks go back with their id', () => {
  const t = setup();
  t.connect(1);
  t.sockets[0].on('ping_alive', (_data, ack) => ack(true));
  t.send(1, event('ping_alive', {}, 7));
  assert.deepEqual(t.decoded(1).at(-1), { type: 'ack', id: 7, response: true });
});

test('malformed, oversized and unknown messages are ignored', () => {
  const t = setup();
  t.connect(1);
  let calls = 0;
  t.sockets[0].on('draw_card', () => { calls++; });
  t.sockets[0].on('disconnect', () => { calls += 100; });

  [42, null, '{', '{}', 'null', event('inconnu'), event('disconnect'), event('__proto__')].forEach(message => t.send(1, message));
  t.send(1, event('draw_card', { pad: 'x'.repeat(MAX_MESSAGE_LENGTH) }));
  t.send(2, event('draw_card'));

  assert.equal(calls, 0);
});

test('room messages reach only the sockets of that room', () => {
  const t = setup();
  t.connect(1);
  t.connect(2);
  t.sockets[0].join('ABCD');
  t.io.to('ABCD').emit('chat_message', { text: 'salut' });
  assert.equal(t.decoded(1).at(-1).event, 'chat_message');
  assert.equal(t.decoded(2).length, 1);

  t.sockets[0].leave('ABCD');
  t.io.to('ABCD').emit('chat_message', { text: 'encore' });
  assert.equal(t.decoded(1).filter(m => m.event === 'chat_message').length, 1);
});

test('large states with emojis and nulls survive being cut up', () => {
  const t = setup();
  t.connect(1);
  const state = { cards: [null, { value: -2 }, null], text: '🦊é'.repeat(5000) };
  t.sockets[0].emit('game_state_update', state);

  const stateParts = t.parts.filter(p => p.part.split(':')[3].length > 0).slice(1);
  assert.ok(stateParts.length > 1);
  assert.ok(stateParts.every(p => p.part.split(':')[3].length <= PART_LENGTH));
  assert.deepEqual(t.decoded(1).at(-1).args[0], state);
});

test('closing fires disconnect once and later events are dropped', () => {
  const t = setup();
  t.connect(1);
  let closed = 0;
  let calls = 0;
  t.sockets[0].on('disconnect', () => { closed++; });
  t.sockets[0].on('draw_card', () => { calls++; });

  t.disconnect(1);
  t.drop(1);
  t.send(1, event('draw_card'));

  assert.equal(closed, 1);
  assert.equal(calls, 0);
});

const flush = () => new Promise(resolve => setTimeout(resolve));

test('a member of the room can invite a contact', async () => {
  const t = setup();
  t.connect(1);
  t.sockets[0].join('ABCD');
  t.send(1, event('invite_contact', { roomCode: 'ABCD', number: '555' }, 1));
  await flush();
  assert.deepEqual(t.invites, [{ source: 1, number: '555', roomCode: 'ABCD' }]);
  assert.deepEqual(t.decoded(1).at(-1), { type: 'ack', id: 1, response: { success: true } });
});

test('nobody can invite to a room they are not in', async () => {
  const t = setup();
  t.connect(1);
  t.send(1, event('invite_contact', { roomCode: 'ABCD', number: '555' }, 1));
  await flush();
  assert.equal(t.invites.length, 0);
  assert.equal(t.decoded(1).at(-1).response.success, false);
});

test('invalid numbers are refused', async () => {
  const t = setup();
  t.connect(1);
  t.sockets[0].join('ABCD');
  for (const number of [undefined, '', 42, '5'.repeat(33)]) {
    t.send(1, event('invite_contact', { roomCode: 'ABCD', number }, 1));
  }
  await flush();
  assert.equal(t.invites.length, 0);
});

test('a refused or failing invitation answers with an error', async () => {
  const t = setup();
  t.connect(1);
  t.sockets[0].join('ABCD');
  t.send(1, event('invite_contact', { roomCode: 'ABCD', number: 'bloqué' }, 1));
  t.send(1, event('invite_contact', { roomCode: 'ABCD', number: 'panne' }, 2));
  await flush();
  const acks = t.decoded(1).filter(m => m.type === 'ack');
  assert.equal(acks.length, 2);
  assert.ok(acks.every(ack => ack.response.success === false && ack.response.error));
});

test('invitations are limited, even after reopening the app', async () => {
  const t = setup();
  t.connect(1);
  t.sockets[0].join('ABCD');
  for (let i = 0; i < INVITE_LIMIT; i++) t.send(1, event('invite_contact', { roomCode: 'ABCD', number: `${i}` }));
  t.connect(1);
  t.sockets[1].join('ABCD');
  t.send(1, event('invite_contact', { roomCode: 'ABCD', number: 'encore' }, 9));
  await flush();
  assert.equal(t.invites.length, INVITE_LIMIT);
  assert.equal(t.decoded(1).at(-1).response.success, false);
});

test('reopening replaces the previous socket', () => {
  const t = setup();
  t.connect(1);
  let closed = 0;
  t.sockets[0].on('disconnect', () => { closed++; });
  t.connect(1);
  assert.equal(closed, 1);
  assert.equal(t.sockets.length, 2);
});
