import { createHash, randomBytes } from 'crypto';
import type { GameIo, GameSocket } from '../../../src/server/gameServer.ts';

// Everything the adapter needs from FiveM, so that tests can run without it
export interface FivemApi {
  onClient(event: string, handler: (source: number, ...args: unknown[]) => void): void;
  onPlayerDropped(handler: (source: number) => void): void;
  send(source: number, part: string): void;
  licenseOf(source: number): string | undefined;
}

export const MAX_MESSAGE_LENGTH = 16_000;
// Large states are cut up so that a single network event stays small
export const PART_LENGTH = 6_000;

type Handler = (...args: any[]) => void;

interface PhoneSocket extends GameSocket {
  source: number;
  rooms: Set<string>;
  handlers: Map<string, Handler>;
}

function parseMessage(message: unknown): { event: string; data: unknown; ack?: number } | null {
  if (typeof message !== 'string' || message.length > MAX_MESSAGE_LENGTH) return null;
  try {
    const parsed = JSON.parse(message);
    return typeof parsed?.event === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

// Stands in for Socket.IO. Lua only relays text: JSON nulls and sparse card grids
// would not survive a round trip through Lua tables.
export function createFivemIo(api: FivemApi): GameIo {
  const bootSecret = randomBytes(32).toString('hex');
  const sockets = new Map<number, PhoneSocket>();
  let connectionHandler: ((socket: GameSocket) => void) | null = null;
  let nextSocketId = 1;
  let nextMessageId = 1;

  function deliver(source: number, payload: unknown) {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    const id = nextMessageId++;
    const total = Math.max(1, Math.ceil(encoded.length / PART_LENGTH));
    for (let index = 0; index < total; index++) {
      const part = encoded.slice(index * PART_LENGTH, (index + 1) * PART_LENGTH);
      api.send(source, `${id}:${index}:${total}:${part}`);
    }
  }

  // The player is proven by FiveM: whatever session token the phone sends is replaced
  function tokenOf(source: number): string {
    const owner = api.licenseOf(source) ?? `source:${source}`;
    return createHash('sha256').update(`${bootSecret}:${owner}`).digest('hex');
  }

  function close(source: number) {
    const socket = sockets.get(source);
    if (!socket) return;
    sockets.delete(source);
    socket.handlers.get('disconnect')?.();
  }

  function open(source: number) {
    close(source);
    const socket: PhoneSocket = {
      id: `phone-${nextSocketId++}`,
      source,
      rooms: new Set(),
      handlers: new Map(),
      on(event, handler) {
        socket.handlers.set(event, handler);
      },
      emit(event, ...args) {
        deliver(source, { type: 'event', event, args });
      },
      join(room) {
        socket.rooms.add(room);
      },
      leave(room) {
        socket.rooms.delete(room);
      },
    };
    sockets.set(source, socket);
    connectionHandler?.(socket);
    deliver(source, { type: 'connected' });
  }

  function receive(source: number, message: unknown) {
    const socket = sockets.get(source);
    const parsed = parseMessage(message);
    if (!socket || !parsed) return;

    const handler = socket.handlers.get(parsed.event);
    if (!handler || parsed.event === 'disconnect') return;

    const data: Record<string, unknown> =
      parsed.data && typeof parsed.data === 'object' ? { ...parsed.data as object } : {};
    data.sessionToken = tokenOf(source);

    const ack = parsed.ack;
    handler(data, (response: unknown) => {
      if (typeof ack === 'number') deliver(source, { type: 'ack', id: ack, response });
    });
  }

  api.onClient('josky:connect', source => open(source));
  api.onClient('josky:disconnect', source => close(source));
  api.onClient('josky:event', (source, message) => receive(source, message));
  api.onPlayerDropped(close);

  return {
    on(_event, handler) {
      connectionHandler = handler;
    },
    to(room) {
      return {
        emit(event, ...args) {
          sockets.forEach(socket => {
            if (socket.rooms.has(room)) socket.emit(event, ...args);
          });
        },
      };
    },
  };
}
