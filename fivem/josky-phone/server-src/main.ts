import { createGameServer } from '../../../src/server/gameServer.ts';
import { createFivemIo } from './adapter.ts';

// FiveM globals available to a server script
declare function on(event: string, handler: (...args: any[]) => void): void;
declare function onNet(event: string, handler: (...args: any[]) => void): void;
declare function emitNet(event: string, target: number, ...args: unknown[]): void;
declare function GetCurrentResourceName(): string;
declare function LoadResourceFile(resource: string, file: string): string;
declare function GetPlayerName(source: string): string;
declare function GetPlayerIdentifierByType(source: string, type: string): string | null;

const resource = GetCurrentResourceName();
const resourceExports = (globalThis as unknown as { exports: Record<string, { getPlayerName(source: number): string }> }).exports;
const config = JSON.parse(LoadResourceFile(resource, 'config.json'));
const eventSource = () => Number((globalThis as unknown as { source: number | string }).source);

function nameOf(source: number): string {
  try {
    return resourceExports[resource].getPlayerName(source) || GetPlayerName(String(source));
  } catch {
    return GetPlayerName(String(source));
  }
}

const io = createFivemIo({
  onClient: (event, handler) => onNet(event, (...args: unknown[]) => handler(eventSource(), ...args)),
  onPlayerDropped: handler => on('playerDropped', () => handler(eventSource())),
  send: (source, part) => emitNet('josky:message', source, part),
  licenseOf: source => GetPlayerIdentifierByType(String(source), 'license') ?? undefined,
  nameOf,
});

// No saving here: games live in memory and end with the server
const game = createGameServer({
  io,
  store: { load: async () => null, save: async () => {} },
  env: {
    TURN_MS: String(config.turnSeconds * 1000),
    ABSENT_TURN_MS: String(config.absentTurnSeconds * 1000),
    BOT_STEP_MS: String(config.botStepMs),
  },
});

game.start();
