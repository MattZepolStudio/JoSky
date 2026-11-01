import { createGameServer } from '../../../src/server/gameServer.ts';
import { createFivemIo } from './adapter.ts';

// FiveM globals available to a server script
declare function on(event: string, handler: (...args: any[]) => void): void;
declare function onNet(event: string, handler: (...args: any[]) => void): void;
declare function emitNet(event: string, target: number, ...args: unknown[]): void;
declare function GetCurrentResourceName(): string;
declare function LoadResourceFile(resource: string, file: string): string;
declare function GetPlayerIdentifierByType(source: string, type: string): string | null;

interface LbPhoneExports {
  GetEquippedPhoneNumber(source: number): string | null | Promise<string | null>;
  SendMessage(from: string, to: string, message: string): unknown;
  SendNotification(target: string, data: unknown): unknown;
}

const resource = GetCurrentResourceName();
const config = JSON.parse(LoadResourceFile(resource, 'config.json'));
const eventSource = () => Number((globalThis as unknown as { source: number | string }).source);

async function sendInvite(source: number, number: string, roomCode: string, senderName: string): Promise<boolean> {
  const lbPhone = (globalThis as unknown as { exports: Record<string, LbPhoneExports> }).exports['lb-phone'];
  const from = await lbPhone.GetEquippedPhoneNumber(source);
  if (!from || from === number) return false;
  // Nothing comes back when the message was refused, for example by a blocked number
  if (!(await lbPhone.SendMessage(from, number, config.inviteMessage.replace('{code}', roomCode)))) return false;

  // The message already carries the code: a failed shortcut is not a failed invitation
  try {
    await lbPhone.SendNotification(number, {
      app: config.identifier,
      title: config.name,
      content: config.inviteNotification.replace('{name}', senderName),
      customData: { buttons: [{ title: 'Rejoindre', event: 'josky:joinInvite', data: { roomCode }, remove: true }] },
    });
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
