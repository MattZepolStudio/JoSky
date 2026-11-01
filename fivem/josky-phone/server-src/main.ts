import { createGameServer } from '../../../src/server/gameServer.ts';
import { createFivemIo } from './adapter.ts';

// FiveM globals available to a server script
declare function on(event: string, handler: (...args: any[]) => void): void;
declare function onNet(event: string, handler: (...args: any[]) => void): void;
declare function emitNet(event: string, target: number, ...args: unknown[]): void;
declare function GetCurrentResourceName(): string;
declare function LoadResourceFile(resource: string, file: string): string;
declare function GetPlayerIdentifierByType(source: string, type: string): string | null;
declare function getPlayers(): string[];
declare function GetPlayerPed(source: string): number;
declare function DoesEntityExist(entity: number): boolean;
declare function GetEntityCoords(entity: number): number[];
declare function GetPlayerRoutingBucket(source: string): number;

interface LbPhoneExports {
  GetEquippedPhoneNumber(source: number): string | null | Promise<string | null>;
  SendMessage(from: string, to: string, message: string): unknown;
  SendNotification(target: string | number, data: unknown): unknown;
}

const resource = GetCurrentResourceName();
const config = JSON.parse(LoadResourceFile(resource, 'config.json'));
const eventSource = () => Number((globalThis as unknown as { source: number | string }).source);

const lbPhone = () => (globalThis as unknown as { exports: Record<string, LbPhoneExports> }).exports['lb-phone'];

async function notifyInvite(target: string | number, roomCode: string, senderName: string) {
  await lbPhone().SendNotification(target, {
    app: config.identifier,
    title: config.name,
    content: config.inviteNotification.replace('{name}', senderName),
    customData: { buttons: [{ title: 'Rejoindre', event: 'josky:joinInvite', data: { roomCode }, remove: true }] },
  });
}

function coordsOf(source: string): number[] | null {
  const ped = GetPlayerPed(source);
  return ped && DoesEntityExist(ped) ? GetEntityCoords(ped) : null;
}

// Needs OneSync: without it the server does not know where players are
function playersNear(source: number): number[] {
  const self = String(source);
  const origin = coordsOf(self);
  if (!origin) return [];

  return getPlayers()
    .filter(player => player !== self && GetPlayerRoutingBucket(player) === GetPlayerRoutingBucket(self))
    .filter(player => {
      const coords = coordsOf(player);
      return coords !== null && Math.hypot(coords[0] - origin[0], coords[1] - origin[1], coords[2] - origin[2]) <= config.nearbyMeters;
    })
    .map(Number);
}

async function sendInvite(source: number, number: string, roomCode: string, senderName: string): Promise<boolean> {
  const from = await lbPhone().GetEquippedPhoneNumber(source);
  if (!from || from === number) return false;
  // Nothing comes back when the message was refused, for example by a blocked number
  if (!(await lbPhone().SendMessage(from, number, config.inviteMessage.replace('{code}', roomCode)))) return false;

  // The message already carries the code: a failed shortcut is not a failed invitation
  try {
    await notifyInvite(number, roomCode, senderName);
  } catch (err) {
    console.error('Notification JoSky non envoyée:', err);
  }
  return true;
}

const io = createFivemIo({
  onClient: (event, handler) => onNet(event, (...args: unknown[]) => handler(eventSource(), ...args)),
  onPlayerDropped: handler => on('playerDropped', () => handler(eventSource())),
  send: (source, part) => emitNet('josky:message', source, part),
  licenseOf: source => GetPlayerIdentifierByType(String(source), 'license') ?? undefined,
  sendInvite,
  playersNear,
  notifyInvite,
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
