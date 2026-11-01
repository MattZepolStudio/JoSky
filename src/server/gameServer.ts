import { randomInt, randomUUID } from 'crypto';
import { BotLevel, JoskyCard, MAX_PLAYERS, Player, GameState, ChatMessage, REACTION_EMOJIS } from '../types/game.ts';
import {
  ActionResult,
  createGameState,
  createPlayer,
  discardAndFlip,
  drawCard,
  publicState,
  replaceWithBot,
  resetToLobby,
  restoreHuman,
  revealInitialCard,
  startRound,
  swapCard,
  takeDiscard,
} from '../game/engine.ts';
import { BotEvent, chooseBotReaction, chooseInitialReveal, choosePlacement, chooseSource } from '../game/bot.ts';
import type { RoomStore } from './roomStore.ts';

const MAX_ROOMS = 500;
const MAX_NAME_LENGTH = 15;
const MAX_CHAT_LENGTH = 200;
const MAX_EVENTS_PER_SECOND = 40;
const CHAT_LIMIT = 8;
const CHAT_WINDOW_MS = 5_000;
const REACTION_LIMIT = 6;
const REACTION_WINDOW_MS = 4_000;
const CREATE_LIMIT = 5;
const CREATE_WINDOW_MS = 60_000;
const TARGET_SCORES = [100, 60, 1];
const BOT_LEVELS: BotLevel[] = ['easy', 'normal', 'hard'];
const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐨', '🐸', '🦄', '🐙', '🦉', '🐺'];
const BOT_NAMES = ['Bot Max', 'Bot Léa', 'Bot Hugo', 'Bot Zoé', 'Bot Sam', 'Bot Nina', 'Bot Théo', 'Bot Lina'];

// What the game needs from its transport: Socket.IO on the website, FiveM events on lb-phone
export interface GameSocket {
  id: string;
  on(event: string, handler: (...args: any[]) => void): unknown;
  emit(event: string, ...args: any[]): unknown;
  join(room: string): unknown;
  leave(room: string): unknown;
}

export interface GameIo {
  on(event: 'connection', handler: (socket: GameSocket) => void): unknown;
  to(room: string): { emit(event: string, ...args: any[]): unknown };
}

export interface GameServerOptions {
  io: GameIo;
  store: RoomStore;
  env: Record<string, string | undefined>;
}

interface RoomData {
  state: GameState;
  drawPile: JoskyCard[];
  chat: ChatMessage[];
  lastActive: number;
  secrets: Record<string, string>; // playerId -> session token, never sent to clients
  timer: ReturnType<typeof setTimeout> | null;
  deadlineAt: number | null;
  sockets: Map<string, Set<string>>; // playerId -> connected socket ids
  disconnectedAt: Map<string, number>;
  lastBotReactionAt: number;
}

// Timers must not keep the process alive, where the runtime lets us say so
function background(timer: ReturnType<typeof setTimeout>) {
  (timer as { unref?: () => void }).unref?.();
}

export function createGameServer({ io, store, env }: GameServerOptions) {
  const envMs = (name: string, fallback: number) => {
    const value = Number(env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  const TURN_MS = envMs('TURN_MS', 60_000);
  const ABSENT_TURN_MS = envMs('ABSENT_TURN_MS', 8_000);
  const REVEAL_MS = envMs('REVEAL_MS', 45_000);
  const BOT_STEP_MS = envMs('BOT_STEP_MS', 900);
  const BOT_REVEAL_MS = envMs('BOT_REVEAL_MS', 500);
  const BOT_REACTION_CHANCE = Number(env.BOT_REACTION_CHANCE ?? 0.6);
  const BOT_REACTION_GAP_MS = envMs('BOT_REACTION_GAP_MS', 8_000);
  const BOT_REACTION_DELAY_MS = envMs('BOT_REACTION_DELAY_MS', 700);
  const SAVE_MS = envMs('SAVE_MS', 15_000);
  const SWEEP_MS = envMs('SWEEP_MS', 10_000);
  const HOST_GRACE_MS = envMs('HOST_GRACE_MS', 20_000);
  const EMPTY_ROOM_TTL_MS = envMs('EMPTY_ROOM_TTL_MS', 30 * 60_000);
  const IDLE_ROOM_TTL_MS = envMs('IDLE_ROOM_TTL_MS', 6 * 60 * 60_000);

  const rooms = new Map<string, RoomData>();
  let isDirty = false;

  function newRoomData(state: GameState, drawPile: JoskyCard[] = []): RoomData {
    return {
      state,
      drawPile,
      chat: [],
      lastActive: Date.now(),
      secrets: {},
      timer: null,
      deadlineAt: null,
      sockets: new Map(),
      disconnectedAt: new Map(),
      lastBotReactionAt: 0,
    };
  }

  function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(randomInt(chars.length));
      }
    } while (rooms.has(code));
    return code;
  }

  function cleanName(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const name = value.replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, MAX_NAME_LENGTH);
    return name || fallback;
  }

  function cleanAvatar(value: unknown): string {
    return typeof value === 'string' && AVATARS.includes(value)
      ? value
      : AVATARS[randomInt(AVATARS.length)];
  }

  function cleanTargetScore(value: unknown): number {
    return typeof value === 'number' && TARGET_SCORES.includes(value) ? value : 100;
  }

  function isValidToken(value: unknown): value is string {
    return typeof value === 'string' && value.length >= 16 && value.length <= 128;
  }

  function viewOf(room: RoomData): GameState {
    return {
      ...publicState(room),
      turnEndsInMs: room.deadlineAt ? Math.max(0, room.deadlineAt - Date.now()) : null,
    };
  }

  function broadcastRoom(roomCode: string) {
    const room = rooms.get(roomCode);
    if (!room) return;
    isDirty = true;
    io.to(roomCode).emit('game_state_update', viewOf(room));
  }

  function addSystemMessage(roomCode: string, text: string) {
    const room = rooms.get(roomCode);
    if (!room) return;
    const msg: ChatMessage = {
      id: `sys-${randomUUID()}`,
      senderId: 'system',
      senderName: 'Système',
      senderAvatar: '📢',
      text,
      timestamp: Date.now(),
      isSystem: true,
    };
    room.chat.push(msg);
    if (room.chat.length > 100) room.chat.shift();
    io.to(roomCode).emit('chat_message', msg);
  }

  function hasConnectedHuman(room: RoomData): boolean {
    return room.state.players.some(p => !p.isBot && p.isConnected);
  }

  function clearRoomTimer(room: RoomData) {
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
    room.deadlineAt = null;
  }

  function setRoomTimer(roomCode: string, room: RoomData, delay: number, isDeadline: boolean, run: () => void) {
    room.deadlineAt = isDeadline ? Date.now() + delay : null;
    room.timer = setTimeout(() => {
      clearRoomTimer(room);
      if (rooms.get(roomCode) === room) run();
    }, delay);
  }

  function deleteRoom(roomCode: string) {
    const room = rooms.get(roomCode);
    if (!room) return;
    clearRoomTimer(room);
    rooms.delete(roomCode);
    isDirty = true;
  }

  // One timer per room: every action replaces it, so a stale bot move or deadline cannot fire.
  // Bots and deadlines pause while no human is connected.
  function scheduleNext(roomCode: string) {
    const room = rooms.get(roomCode);
    if (!room) return;
    clearRoomTimer(room);
    if (!hasConnectedHuman(room)) return;

    const { state } = room;

    if (state.phase === 'initial_revealing') {
      const pendingBots = state.players.filter(p => p.isBot && p.initialRevealedCount < 2);
      if (pendingBots.length > 0) {
        setRoomTimer(roomCode, room, BOT_REVEAL_MS, false, () => autoReveal(roomCode, pendingBots));
      } else {
        const isOnlyAbsentsLeft = state.players.every(p => p.initialRevealedCount >= 2 || !p.isConnected);
        setRoomTimer(roomCode, room, isOnlyAbsentsLeft ? ABSENT_TURN_MS : REVEAL_MS, true, () => {
          autoReveal(roomCode, state.players.filter(p => p.initialRevealedCount < 2));
        });
      }
      return;
    }

    if (state.phase !== 'playing') return;

    const current = state.players[state.currentPlayerIndex];
    if (current.isBot) {
      setRoomTimer(roomCode, room, BOT_STEP_MS, false, () => runBotStep(roomCode, current));
    } else {
      const delay = current.isConnected ? TURN_MS : ABSENT_TURN_MS;
      setRoomTimer(roomCode, room, delay, true, () => autoPlayTurn(roomCode, current));
    }
  }

  function botEventFrom(messages: string[]): BotEvent | null {
    if (messages.some(text => text.includes('Score doublé'))) return 'doubled';
    if (messages.some(text => text.includes('éliminé une colonne'))) return 'column';
    if (messages.some(text => text.includes('Dernier tour'))) return 'lastRound';
    return null;
  }

  function maybeBotReaction(roomCode: string, room: RoomData, messages: string[]) {
    const event = botEventFrom(messages);
    if (!event || !hasConnectedHuman(room)) return;
    if (Date.now() - room.lastBotReactionAt < BOT_REACTION_GAP_MS) return;

    const bots = room.state.players.filter(p => p.isBot && !p.replacedHuman);
    const reaction = chooseBotReaction(event, bots, room.state.doubledPlayerId, BOT_REACTION_CHANCE);
    if (!reaction) return;

    room.lastBotReactionAt = Date.now();
    background(setTimeout(() => io.to(roomCode).emit('player_reaction', reaction), BOT_REACTION_DELAY_MS));
  }

  function advance(roomCode: string, messages: string[] = []) {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.lastActive = Date.now();
    messages.forEach(text => addSystemMessage(roomCode, text));
    maybeBotReaction(roomCode, room, messages);
    scheduleNext(roomCode);
    broadcastRoom(roomCode);
  }

  function autoReveal(roomCode: string, players: Player[]) {
    const room = rooms.get(roomCode);
    if (!room) return;
    const messages: string[] = [];
    players.forEach(player => {
      while (room.state.phase === 'initial_revealing' && player.initialRevealedCount < 2) {
        const result = revealInitialCard(room, player.id, chooseInitialReveal(player));
        if (result.ok) messages.push(...result.messages);
      }
    });
    advance(roomCode, messages);
  }

  function playStep(room: RoomData, player: Player, level: BotLevel): ActionResult {
    const { state } = room;
    if (state.turnAction === 'choose_source') {
      return chooseSource(state, player, level) === 'discard'
        ? takeDiscard(room, player.id)
        : drawCard(room, player.id);
    }
    const placement = choosePlacement(state, player, level);
    return placement.action === 'swap'
      ? swapCard(room, player.id, placement.index)
      : discardAndFlip(room, player.id, placement.index);
  }

  function runBotStep(roomCode: string, bot: Player) {
    const room = rooms.get(roomCode);
    if (!room) return;
    const result = playStep(room, bot, bot.botLevel ?? 'normal');
    if (!result.ok) {
      console.error(`Coup de bot refusé dans ${roomCode}: ${result.error}`);
      return;
    }
    advance(roomCode, result.messages);
  }

  function autoPlayTurn(roomCode: string, player: Player) {
    const room = rooms.get(roomCode);
    if (!room) return;
    const messages = [`⏱️ Temps écoulé : le tour de ${player.name} est joué automatiquement.`];

    const stillPlaying = () =>
      room.state.phase === 'playing' &&
      room.state.players[room.state.currentPlayerIndex]?.id === player.id;

    // The player may already hold a card, so this is one or two steps
    for (let step = 0; step < 2 && stillPlaying(); step++) {
      const roundNumber = room.state.roundNumber;
      const wasHoldingCard = room.state.currentDrawnCard !== null;
      const result = playStep(room, player, 'normal');
      if (result.ok) messages.push(...result.messages);
      if (wasHoldingCard || room.state.roundNumber !== roundNumber) break;
    }

    advance(roomCode, messages);
  }

  function transferHost(room: RoomData): Player | undefined {
    const humans = room.state.players.filter(p => !p.isBot);
    const nextHost = humans.find(p => p.isConnected) ?? humans[0];
    if (!nextHost) return undefined;
    room.state.players.forEach(p => {
      p.isHost = p.id === nextHost.id;
    });
    return nextHost;
  }

  // Seats given back to the room's history have no owner anymore
  function forgetRemovedSeats(room: RoomData) {
    const seats = room.state.players.map(p => p.id);
    room.secrets = Object.fromEntries(Object.entries(room.secrets).filter(([id]) => seats.includes(id)));
  }

  function takeSeatBack(roomCode: string, room: RoomData, player: Player) {
    restoreHuman(player);
    // Drops any move the bot had planned for this seat
    clearRoomTimer(room);
    if (!room.state.players.some(p => p.isHost)) player.isHost = true;
    room.lastActive = Date.now();
    addSystemMessage(roomCode, `🎮 ${player.name} reprend sa place !`);
  }

  function removePlayer(roomCode: string, room: RoomData, player: Player) {
    const wasHost = player.isHost;
    room.sockets.delete(player.id);
    room.disconnectedAt.delete(player.id);

    const messages: string[] = [];
    if (room.state.phase === 'lobby') {
      delete room.secrets[player.id];
      room.state.players = room.state.players.filter(p => p.id !== player.id);
      messages.push(`👋 ${player.name} a quitté le salon.`);

      if (!room.state.players.some(p => !p.isBot)) {
        deleteRoom(roomCode);
        return;
      }
    } else {
      // The secret stays: the player can come back and take the seat from the bot
      replaceWithBot(player);
      messages.push(`🤖 ${player.name} a quitté la partie, un bot prend sa place.`);
    }

    if (wasHost) {
      const nextHost = transferHost(room);
      if (nextHost) messages.push(`👑 ${nextHost.name} devient l'hôte.`);
    }

    advance(roomCode, messages);
  }

  // Socket.io handlers
  io.on('connection', (socket: GameSocket) => {
    let session: { code: string; playerId: string } | null = null;
    let eventWindowStart = 0;
    let eventCount = 0;
    const chatTimes: number[] = [];
    const reactionTimes: number[] = [];
    const createTimes: number[] = [];

    function isOverLimit(times: number[], limit: number, windowMs: number): boolean {
      const now = Date.now();
      while (times.length > 0 && now - times[0] > windowMs) times.shift();
      if (times.length >= limit) return true;
      times.push(now);
      return false;
    }

    function bind(code: string, room: RoomData, player: Player) {
      unbind();
      if (player.replacedHuman) takeSeatBack(code, room, player);
      session = { code, playerId: player.id };
      if (!room.sockets.has(player.id)) room.sockets.set(player.id, new Set());
      room.sockets.get(player.id)!.add(socket.id);
      room.disconnectedAt.delete(player.id);
      player.isConnected = true;
      socket.join(code);
    }

    function unbind() {
      if (!session) return;
      const { code, playerId } = session;
      session = null;
      socket.leave(code);

      const room = rooms.get(code);
      const sockets = room?.sockets.get(playerId);
      if (!room || !sockets) return;
      sockets.delete(socket.id);
      if (sockets.size > 0) return;

      room.sockets.delete(playerId);
      const player = room.state.players.find(p => p.id === playerId);
      if (player && !player.isBot) {
        player.isConnected = false;
        room.disconnectedAt.set(playerId, Date.now());
        // The running deadline was set while they were online: nobody should wait for it
        const isTheirTurn = room.state.phase === 'playing' && room.state.players[room.state.currentPlayerIndex]?.id === playerId;
        if (isTheirTurn || room.state.phase === 'initial_revealing' || !hasConnectedHuman(room)) scheduleNext(code);
        broadcastRoom(code);
      }
    }

    function findSeat(room: RoomData, token: unknown): Player | undefined {
      if (!isValidToken(token)) return undefined;
      const entry = Object.entries(room.secrets).find(([, secret]) => secret === token);
      return entry && room.state.players.find(p => p.id === entry[0]);
    }

    // The acting player always comes from the authenticated session. After a silent
    // reconnection the session is rebuilt from the secret token, never from a player id.
    function getContext(data: { roomCode?: unknown; sessionToken?: unknown }) {
      if (!session && typeof data.roomCode === 'string') {
        const code = data.roomCode.toUpperCase().trim();
        const room = rooms.get(code);
        const player = room && findSeat(room, data.sessionToken);
        if (room && player) {
          bind(code, room, player);
          if (!room.timer) scheduleNext(code);
        }
      }
      if (!session) return null;

      const room = rooms.get(session.code);
      const player = room?.state.players.find(p => p.id === session!.playerId);
      return room && player ? { room, player, code: session.code } : null;
    }

    function getHostContext(data: { roomCode?: unknown; sessionToken?: unknown }) {
      const context = getContext(data);
      return context?.player.isHost ? context : null;
    }

    function applyAction(code: string, result: ActionResult) {
      if (result.ok) {
        advance(code, result.messages);
      } else {
        socket.emit('action_rejected', result.error);
      }
    }

    // A malformed event must never bring the server down
    function on(event: string, handler: (data: any, ack: (response: unknown) => void) => void) {
      socket.on(event, (...args: unknown[]) => {
        const now = Date.now();
        if (now - eventWindowStart > 1000) {
          eventWindowStart = now;
          eventCount = 0;
        }
        if (++eventCount > MAX_EVENTS_PER_SECOND) return;

        const callback = args.find(arg => typeof arg === 'function') as ((response: unknown) => void) | undefined;
        const data = args[0] && typeof args[0] === 'object' ? args[0] : {};
        try {
          handler(data, callback ?? (() => {}));
        } catch (err) {
          console.error(`Erreur sur l'événement ${event}:`, err);
        }
      });
    }

    on('ping_alive', (_data, ack) => {
      ack(true);
    });

    on('create_room', (data, ack) => {
      if (!isValidToken(data.sessionToken)) {
        return ack({ success: false, error: 'Session invalide, rechargez la page.' });
      }
      if (rooms.size >= MAX_ROOMS || isOverLimit(createTimes, CREATE_LIMIT, CREATE_WINDOW_MS)) {
        return ack({ success: false, error: 'Trop de salons créés, réessayez dans un instant.' });
      }

      const code = generateRoomCode();
      const hostPlayer = createPlayer({
        id: randomUUID(),
        name: cleanName(data.playerName, 'Hôte'),
        avatar: cleanAvatar(data.avatar),
        isHost: true,
      });

      const room = newRoomData(createGameState(code, hostPlayer, cleanTargetScore(data.targetScore)));
      room.secrets[hostPlayer.id] = data.sessionToken;
      rooms.set(code, room);

      bind(code, room, hostPlayer);
      addSystemMessage(code, `✨ Salon créé ! Code : ${code}`);
      isDirty = true;

      ack({ success: true, roomCode: code, playerId: hostPlayer.id, state: viewOf(room), chat: room.chat });
    });

    on('rejoin_room', (data, ack) => {
      const code = typeof data.roomCode === 'string' ? data.roomCode.toUpperCase().trim() : '';
      const room = rooms.get(code);
      const player = room && findSeat(room, data.sessionToken);

      if (!room || !player) {
        return ack({ success: false, error: 'Salon introuvable ou expiré.' });
      }

      bind(code, room, player);
      if (!room.timer) scheduleNext(code);
      broadcastRoom(code);

      ack({ success: true, roomCode: code, playerId: player.id, state: viewOf(room), chat: room.chat });
    });

    on('check_resume', (data, ack) => {
      const code = typeof data.roomCode === 'string' ? data.roomCode.toUpperCase().trim() : '';
      const room = rooms.get(code);
      const canResume = Boolean(room && room.state.phase !== 'game_over' && findSeat(room, data.sessionToken));
      ack({ canResume });
    });

    on('join_room', (data, ack) => {
      if (!isValidToken(data.sessionToken)) {
        return ack({ success: false, error: 'Session invalide, rechargez la page.' });
      }

      const code = typeof data.roomCode === 'string' ? data.roomCode.toUpperCase().trim() : '';
      const room = rooms.get(code);

      if (!room) {
        return ack({ success: false, error: 'Salon introuvable. Vérifiez le code.' });
      }

      // If player is already in room, seamlessly re-attach them
      const existingPlayer = findSeat(room, data.sessionToken);
      if (existingPlayer) {
        bind(code, room, existingPlayer);
        if (!room.timer) scheduleNext(code);
        broadcastRoom(code);
        return ack({ success: true, roomCode: code, playerId: existingPlayer.id, state: viewOf(room), chat: room.chat });
      }

      if (room.state.phase !== 'lobby') {
        return ack({ success: false, error: 'La partie est déjà en cours dans ce salon.' });
      }

      if (room.state.players.length >= MAX_PLAYERS) {
        return ack({ success: false, error: `Le salon est complet (max ${MAX_PLAYERS} joueurs).` });
      }

      const newPlayer = createPlayer({
        id: randomUUID(),
        name: cleanName(data.playerName, `Joueur ${room.state.players.length + 1}`),
        avatar: cleanAvatar(data.avatar),
        isHost: false,
      });

      room.state.players.push(newPlayer);
      room.secrets[newPlayer.id] = data.sessionToken;
      bind(code, room, newPlayer);

      addSystemMessage(code, `👋 ${newPlayer.name} a rejoint le salon !`);
      broadcastRoom(code);

      ack({ success: true, roomCode: code, playerId: newPlayer.id, state: viewOf(room), chat: room.chat });
    });

    on('leave_room', (data) => {
      const context = getContext(data);
      if (!context) return;
      unbind();
      removePlayer(context.code, context.room, context.player);
    });

    on('add_bot', (data, ack) => {
      const context = getHostContext(data);
      if (!context) return;
      const { room, code } = context;
      if (room.state.phase !== 'lobby' || room.state.players.length >= MAX_PLAYERS) return;

      const takenNames = room.state.players.map(p => p.name);
      const botName = BOT_NAMES.find(name => !takenNames.includes(name)) ?? 'Bot';

      room.state.players.push(createPlayer({
        id: `bot-${randomUUID()}`,
        name: botName,
        avatar: '🤖',
        isHost: false,
        isBot: true,
        botLevel: BOT_LEVELS.includes(data.level) ? data.level : 'normal',
      }));

      addSystemMessage(code, `🤖 ${botName} a été ajouté à la partie !`);
      broadcastRoom(code);
      ack({ success: true });
    });

    on('remove_bot', (data) => {
      const context = getHostContext(data);
      if (!context) return;
      const { room, code } = context;
      if (room.state.phase !== 'lobby') return;

      const bot = room.state.players.find(p => p.id === data.botId && p.isBot);
      if (bot) {
        room.state.players = room.state.players.filter(p => p.id !== bot.id);
        addSystemMessage(code, `🤖 ${bot.name} a quitté le salon.`);
        broadcastRoom(code);
      }
    });

    on('update_settings', (data) => {
      const context = getHostContext(data);
      if (!context || context.room.state.phase !== 'lobby') return;
      context.room.state.targetScore = cleanTargetScore(data.targetScore);
      broadcastRoom(context.code);
    });

    on('start_game', (data) => {
      const context = getHostContext(data);
      if (!context) return;
      const { room, code } = context;
      if (room.state.phase !== 'lobby' || room.state.players.length < 2) return;
      applyAction(code, startRound(room));
    });

    on('reveal_initial_card', (data) => {
      const context = getContext(data);
      if (!context) return;
      applyAction(context.code, revealInitialCard(context.room, context.player.id, data.cardIndex));
    });

    on('draw_card', (data) => {
      const context = getContext(data);
      if (!context) return;
      applyAction(context.code, drawCard(context.room, context.player.id));
    });

    on('take_discard', (data) => {
      const context = getContext(data);
      if (!context) return;
      applyAction(context.code, takeDiscard(context.room, context.player.id));
    });

    on('swap_card', (data) => {
      const context = getContext(data);
      if (!context) return;
      applyAction(context.code, swapCard(context.room, context.player.id, data.cardIndex));
    });

    on('discard_and_flip', (data) => {
      const context = getContext(data);
      if (!context) return;
      applyAction(context.code, discardAndFlip(context.room, context.player.id, data.flipIndex));
    });

    on('next_round', (data) => {
      const context = getHostContext(data);
      if (!context || context.room.state.phase !== 'round_ended') return;
      applyAction(context.code, startRound(context.room));
    });

    on('restart_game', (data) => {
      const context = getHostContext(data);
      if (!context || context.room.state.phase !== 'game_over') return;
      resetToLobby(context.room);
      forgetRemovedSeats(context.room);
      advance(context.code, [`🔄 La partie a été réinitialisée par l'hôte.`]);
    });

    // Any human can start it, so an absent host never blocks a rematch
    on('rematch', (data) => {
      const context = getContext(data);
      if (!context || context.player.isBot || context.room.state.phase !== 'game_over') return;
      const { room, code, player } = context;

      resetToLobby(room);
      forgetRemovedSeats(room);
      if (room.state.players.length < 2) {
        advance(code, [`🔄 Il n'y a plus assez de joueurs pour une revanche.`]);
        return;
      }

      const result = startRound(room);
      advance(code, [`🔁 Revanche lancée par ${player.name} !`, ...(result.ok ? result.messages : [])]);
    });

    on('send_reaction', (data) => {
      const context = getContext(data);
      if (!context || !REACTION_EMOJIS.includes(data.emoji)) return;
      if (isOverLimit(reactionTimes, REACTION_LIMIT, REACTION_WINDOW_MS)) return;
      io.to(context.code).emit('player_reaction', { playerId: context.player.id, emoji: data.emoji });
    });

    on('send_chat', (data) => {
      const context = getContext(data);
      if (!context) return;
      const { room, player, code } = context;

      const trimmed = typeof data.text === 'string' ? data.text.trim().slice(0, MAX_CHAT_LENGTH) : '';
      if (!trimmed) return;
      if (isOverLimit(chatTimes, CHAT_LIMIT, CHAT_WINDOW_MS)) {
        socket.emit('action_rejected', 'Doucement sur le chat !');
        return;
      }

      const msg: ChatMessage = {
        id: `chat-${randomUUID()}`,
        senderId: player.id,
        senderName: player.name,
        senderAvatar: player.avatar,
        text: trimmed,
        timestamp: Date.now(),
      };

      room.chat.push(msg);
      if (room.chat.length > 100) room.chat.shift();
      io.to(code).emit('chat_message', msg);
    });

    socket.on('disconnect', unbind);
  });

  function sweepRooms() {
    const now = Date.now();
    rooms.forEach((room, code) => {
      const ttl = hasConnectedHuman(room) ? IDLE_ROOM_TTL_MS : EMPTY_ROOM_TTL_MS;
      if (now - room.lastActive > ttl) {
        deleteRoom(code);
        return;
      }

      // An absent host must not lock the room for the others
      const host = room.state.players.find(p => p.isHost);
      const absentSince = host && room.disconnectedAt.get(host.id);
      if (absentSince && now - absentSince > HOST_GRACE_MS && hasConnectedHuman(room)) {
        const nextHost = transferHost(room);
        if (nextHost) {
          addSystemMessage(code, `👑 ${nextHost.name} devient l'hôte.`);
          broadcastRoom(code);
        }
      }
    });
  }

  function createSnapshot(): string {
    return JSON.stringify(
      [...rooms.values()].map(({ state, drawPile, chat, lastActive, secrets }) => ({
        state,
        drawPile,
        chat,
        lastActive,
        secrets,
      }))
    );
  }

  async function restoreRooms() {
    try {
      const snapshot = await store.load();
      if (!snapshot) return;

      for (const saved of JSON.parse(snapshot)) {
        const state: GameState = saved.state;
        state.turnEndsInMs = null;
        state.players.forEach(p => {
          if (!p.isBot) p.isConnected = false;
        });

        const room = newRoomData(state, saved.drawPile);
        room.chat = saved.chat;
        room.lastActive = saved.lastActive;
        room.secrets = saved.secrets;
        rooms.set(state.roomCode, room);
      }
      console.log(`💾 ${rooms.size} salon(s) restauré(s)`);
    } catch (err) {
      console.error('Impossible de restaurer les salons:', err);
    }
  }

  async function saveRooms() {
    if (!isDirty) return;
    isDirty = false;
    try {
      await store.save(createSnapshot());
    } catch (err) {
      isDirty = true;
      console.error('Impossible de sauvegarder les salons:', err);
    }
  }

  return {
    roomCount: () => rooms.size,
    async start() {
      await restoreRooms();
      background(setInterval(sweepRooms, SWEEP_MS));
      background(setInterval(saveRooms, SAVE_MS));
    },
    async saveNow() {
      isDirty = true;
      await saveRooms();
    },
  };
}
