// src/server/gameServer.ts
var import_crypto = require("crypto");

// src/types/game.ts
var REACTION_EMOJIS = ["\u{1F44F}", "\u{1F602}", "\u{1F631}", "\u{1F525}", "\u{1F62D}", "\u{1F92B}"];
var MAX_PLAYERS = 7;

// src/utils/deck.ts
function generateDeck() {
  const deck = [];
  let idCounter = 1;
  for (let i = 0; i < 5; i++) {
    deck.push({ id: `card-${idCounter++}`, value: -2, isRevealed: false });
  }
  for (let i = 0; i < 10; i++) {
    deck.push({ id: `card-${idCounter++}`, value: -1, isRevealed: false });
  }
  for (let i = 0; i < 15; i++) {
    deck.push({ id: `card-${idCounter++}`, value: 0, isRevealed: false });
  }
  for (let val = 1; val <= 12; val++) {
    for (let i = 0; i < 10; i++) {
      deck.push({ id: `card-${idCounter++}`, value: val, isRevealed: false });
    }
  }
  return shuffleDeck(deck);
}
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function checkAndEliminateColumns(cards) {
  const newCards = [...cards];
  const eliminatedCards = [];
  const eliminatedColumns = [];
  for (let col = 0; col < 4; col++) {
    const idx0 = col;
    const idx1 = col + 4;
    const idx2 = col + 8;
    const c0 = newCards[idx0];
    const c1 = newCards[idx1];
    const c2 = newCards[idx2];
    if (c0 && c1 && c2 && c0.isRevealed && c1.isRevealed && c2.isRevealed && c0.value === c1.value && c1.value === c2.value) {
      eliminatedCards.push({ ...c0, isEliminated: true }, { ...c1, isEliminated: true }, { ...c2, isEliminated: true });
      newCards[idx0] = null;
      newCards[idx1] = null;
      newCards[idx2] = null;
      eliminatedColumns.push(col);
    }
  }
  return { newCards, eliminatedCards, eliminatedColumns };
}
function calculatePlayerScore(cards, onlyRevealed = false) {
  return cards.reduce((sum, card) => {
    if (!card) return sum;
    if (onlyRevealed && !card.isRevealed) return sum;
    return sum + card.value;
  }, 0);
}

// src/game/engine.ts
var fail = (error) => ({ ok: false, error });
function createPlayer(fields) {
  return {
    cards: [],
    revealedCount: 0,
    initialRevealedCount: 0,
    roundScore: 0,
    totalScore: 0,
    hasFinishedRound: false,
    isConnected: true,
    ...fields
  };
}
function createGameState(roomCode, host, targetScore) {
  return {
    roomCode,
    phase: "lobby",
    players: [host],
    currentPlayerIndex: 0,
    drawPileCount: 0,
    discardPile: [],
    currentDrawnCard: null,
    turnAction: "choose_source",
    roundNumber: 0,
    targetScore,
    finalRoundTriggeredBy: null,
    lastTurnPlayerIds: [],
    winnerId: null,
    doubledPlayerId: null,
    historyLogs: [],
    turnEndsInMs: null
  };
}
function startRound(room) {
  const { state } = room;
  room.drawPile = generateDeck();
  state.players.forEach((player) => {
    player.cards = room.drawPile.splice(0, 12);
    player.revealedCount = 0;
    player.initialRevealedCount = 0;
    player.roundScore = 0;
    player.hasFinishedRound = false;
  });
  const initialDiscard = room.drawPile.pop();
  initialDiscard.isRevealed = true;
  state.discardPile = [initialDiscard];
  state.currentDrawnCard = null;
  state.turnAction = "choose_source";
  state.finalRoundTriggeredBy = null;
  state.lastTurnPlayerIds = [];
  state.doubledPlayerId = null;
  state.roundNumber += 1;
  state.phase = "initial_revealing";
  return { ok: true, messages: [`\u{1F3B2} Manche ${state.roundNumber} commenc\xE9e ! Retournez 2 cartes chacun.`] };
}
function resetToLobby(room) {
  const { state } = room;
  room.drawPile = [];
  state.players = state.players.filter((p) => !p.replacedHuman);
  state.phase = "lobby";
  state.roundNumber = 0;
  state.winnerId = null;
  state.doubledPlayerId = null;
  state.discardPile = [];
  state.currentDrawnCard = null;
  state.turnAction = "choose_source";
  state.finalRoundTriggeredBy = null;
  state.lastTurnPlayerIds = [];
  state.players.forEach((p) => {
    p.totalScore = 0;
    p.roundScore = 0;
    p.cards = [];
    p.revealedCount = 0;
    p.initialRevealedCount = 0;
    p.hasFinishedRound = false;
  });
}
function revealInitialCard(room, playerId, cardIndex) {
  const { state } = room;
  if (state.phase !== "initial_revealing") return fail("Ce n'est plus le moment de r\xE9v\xE9ler une carte.");
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.initialRevealedCount >= 2) return fail("Vous avez d\xE9j\xE0 retourn\xE9 vos 2 cartes.");
  const card = player.cards[cardIndex];
  if (!card || card.isRevealed) return fail("Choisissez une carte face cach\xE9e.");
  card.isRevealed = true;
  player.initialRevealedCount++;
  player.revealedCount++;
  player.roundScore = calculatePlayerScore(player.cards, true);
  return { ok: true, messages: startPlayIfReady(room) };
}
function startPlayIfReady(room) {
  const { state } = room;
  if (!state.players.every((p) => p.initialRevealedCount >= 2)) return [];
  let highestSum = -999;
  let starterIndex = 0;
  state.players.forEach((p, idx) => {
    const sum = calculatePlayerScore(p.cards, true);
    if (sum > highestSum) {
      highestSum = sum;
      starterIndex = idx;
    }
  });
  state.currentPlayerIndex = starterIndex;
  state.phase = "playing";
  state.turnAction = "choose_source";
  const starter = state.players[starterIndex];
  return [`\u{1F3AE} Tous les joueurs sont pr\xEAts ! ${starter.name} commence la manche avec un score initial de ${highestSum} pts.`];
}
function activePlayer(room, playerId) {
  const { state } = room;
  if (state.phase !== "playing") return null;
  const player = state.players[state.currentPlayerIndex];
  return player && player.id === playerId ? player : null;
}
function recycleDiscardPile(room) {
  const { state } = room;
  if (state.discardPile.length <= 1) return;
  const top = state.discardPile.pop();
  room.drawPile = shuffleDeck(state.discardPile.map((c) => ({ ...c, isRevealed: false })));
  state.discardPile = [top];
}
function drawCard(room, playerId) {
  const { state } = room;
  if (!activePlayer(room, playerId)) return fail("Ce n'est pas votre tour.");
  if (state.turnAction !== "choose_source") return fail("Vous avez d\xE9j\xE0 une carte en main.");
  if (room.drawPile.length === 0) recycleDiscardPile(room);
  const card = room.drawPile.pop();
  if (!card) return fail("La pioche est vide.");
  card.isRevealed = true;
  state.currentDrawnCard = card;
  state.turnAction = "drawn_card_choice";
  return { ok: true, messages: [] };
}
function takeDiscard(room, playerId) {
  const { state } = room;
  if (!activePlayer(room, playerId)) return fail("Ce n'est pas votre tour.");
  if (state.turnAction !== "choose_source") return fail("Vous avez d\xE9j\xE0 une carte en main.");
  const top = state.discardPile.pop();
  if (!top) return fail("La d\xE9fausse est vide.");
  state.currentDrawnCard = top;
  state.turnAction = "discard_choice";
  return { ok: true, messages: [] };
}
function swapCard(room, playerId, cardIndex) {
  const { state } = room;
  const player = activePlayer(room, playerId);
  if (!player) return fail("Ce n'est pas votre tour.");
  if (!state.currentDrawnCard) return fail("Prenez d'abord une carte.");
  const oldCard = player.cards[cardIndex];
  if (!oldCard) return fail("Cet emplacement est vide.");
  player.cards[cardIndex] = { ...state.currentDrawnCard, isRevealed: true };
  state.discardPile.push({ ...oldCard, isRevealed: true });
  state.currentDrawnCard = null;
  return { ok: true, messages: completeTurn(room, player) };
}
function discardAndFlip(room, playerId, flipIndex) {
  const { state } = room;
  const player = activePlayer(room, playerId);
  if (!player) return fail("Ce n'est pas votre tour.");
  if (state.turnAction !== "drawn_card_choice" || !state.currentDrawnCard) {
    return fail("Une carte prise dans la d\xE9fausse doit \xEAtre \xE9chang\xE9e.");
  }
  const targetCard = player.cards[flipIndex];
  if (!targetCard || targetCard.isRevealed) return fail("Choisissez une carte face cach\xE9e.");
  state.discardPile.push({ ...state.currentDrawnCard, isRevealed: true });
  state.currentDrawnCard = null;
  targetCard.isRevealed = true;
  return { ok: true, messages: completeTurn(room, player) };
}
function updatePlayerStats(player) {
  let revCount = 0;
  let remainingCount = 0;
  player.cards.forEach((c) => {
    if (c) {
      remainingCount++;
      if (c.isRevealed) revCount++;
    }
  });
  player.revealedCount = revCount;
  player.roundScore = calculatePlayerScore(player.cards, true);
  if (revCount >= remainingCount) {
    player.hasFinishedRound = true;
  }
}
function completeTurn(room, player) {
  const { state } = room;
  const messages = [];
  const { newCards, eliminatedCards, eliminatedColumns } = checkAndEliminateColumns(player.cards);
  player.cards = newCards;
  if (eliminatedColumns.length > 0) {
    state.discardPile.push(...eliminatedCards.map((c) => ({ id: c.id, value: c.value, isRevealed: true })));
    messages.push(`\u{1F389} ${player.name} a \xE9limin\xE9 une colonne compl\xE8te !`);
  }
  updatePlayerStats(player);
  if (player.hasFinishedRound && !state.finalRoundTriggeredBy) {
    state.finalRoundTriggeredBy = player.id;
    state.lastTurnPlayerIds = state.players.filter((p) => p.id !== player.id).map((p) => p.id);
    messages.push(`\u26A1 ${player.name} a retourn\xE9 toutes ses cartes ! Dernier tour pour tout le monde !`);
  } else if (state.finalRoundTriggeredBy) {
    state.lastTurnPlayerIds = state.lastTurnPlayerIds.filter((id) => id !== player.id);
  }
  if (state.finalRoundTriggeredBy && state.lastTurnPlayerIds.length === 0) {
    messages.push(...endRound(room));
    return messages;
  }
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.turnAction = "choose_source";
  return messages;
}
function endRound(room) {
  const { state } = room;
  const messages = [];
  state.players.forEach((p) => {
    p.cards.forEach((c) => {
      if (c && !c.isRevealed) {
        c.isRevealed = true;
      }
    });
    const { newCards } = checkAndEliminateColumns(p.cards);
    p.cards = newCards;
    p.roundScore = calculatePlayerScore(p.cards, false);
  });
  const triggerPlayerId = state.finalRoundTriggeredBy;
  const triggerPlayer = state.players.find((p) => p.id === triggerPlayerId);
  if (triggerPlayer) {
    const otherMinScore = Math.min(
      ...state.players.filter((p) => p.id !== triggerPlayerId).map((p) => p.roundScore)
    );
    if (triggerPlayer.roundScore >= otherMinScore && triggerPlayer.roundScore > 0) {
      const originalScore = triggerPlayer.roundScore;
      triggerPlayer.roundScore *= 2;
      state.doubledPlayerId = triggerPlayer.id;
      messages.push(
        `\u26A0\uFE0F ${triggerPlayer.name} a termin\xE9 en premier mais n'a pas le score le plus bas ! Score doubl\xE9 : ${originalScore} \u2794 ${triggerPlayer.roundScore} pts !`
      );
    }
  }
  state.players.forEach((p) => {
    p.totalScore += p.roundScore;
  });
  const gameOver = state.players.some((p) => p.totalScore >= state.targetScore);
  if (gameOver || state.targetScore === 1) {
    state.phase = "game_over";
    const winner = state.players.reduce((best, p) => p.totalScore < best.totalScore ? p : best);
    const winners = state.players.filter((p) => p.totalScore === winner.totalScore);
    state.winnerId = winner.id;
    messages.push(
      winners.length > 1 ? `\u{1F91D} \xC9galit\xE9 entre ${winners.map((p) => p.name).join(" et ")} avec ${winner.totalScore} points !` : `\u{1F3C6} Victoire de ${winner.name} avec ${winner.totalScore} points au total !`
    );
  } else {
    state.phase = "round_ended";
    messages.push(`\u{1F3C1} Manche ${state.roundNumber} termin\xE9e ! Consultez les scores.`);
  }
  return messages;
}
function publicState(room) {
  return {
    ...room.state,
    drawPileCount: room.drawPile.length,
    players: room.state.players.map((p) => ({
      ...p,
      cards: p.cards.map(
        (card, idx) => card && !card.isRevealed ? { id: `hidden-${p.id}-${idx}`, value: 0, isRevealed: false } : card
      )
    }))
  };
}
function restoreHuman(player) {
  player.isBot = false;
  player.botLevel = void 0;
  player.replacedHuman = false;
}
function replaceWithBot(player) {
  player.isBot = true;
  player.botLevel = "normal";
  player.replacedHuman = true;
  player.isHost = false;
  player.isConnected = true;
}

// src/game/bot.ts
var DECK_SUM = 760;
var DECK_SIZE = 150;
var DOUBLING_MARGIN = 5;
function visibleCards(state) {
  const cards = [...state.discardPile];
  if (state.currentDrawnCard) cards.push(state.currentDrawnCard);
  state.players.forEach((p) => p.cards.forEach((c) => {
    if (c && c.isRevealed) cards.push(c);
  }));
  return cards;
}
function expectedHiddenValue(state, level) {
  if (level !== "hard") return DECK_SUM / DECK_SIZE;
  const seen = visibleCards(state);
  const unseen = DECK_SIZE - seen.length;
  if (unseen <= 0) return DECK_SUM / DECK_SIZE;
  return (DECK_SUM - seen.reduce((sum, c) => sum + c.value, 0)) / unseen;
}
function hiddenIndices(bot) {
  return bot.cards.flatMap((c, idx) => c && !c.isRevealed ? [idx] : []);
}
function estimatedScore(player, expected) {
  return player.cards.reduce((sum, c) => {
    if (!c) return sum;
    return sum + (c.isRevealed ? c.value : expected);
  }, 0);
}
function columnMates(bot, index) {
  const col = index % 4;
  return [col, col + 4, col + 8].filter((i) => i !== index).map((i) => bot.cards[i]);
}
function finishRisk(state, bot, finalScore, expected) {
  const opponents = state.players.filter((p) => p.id !== bot.id);
  const bestOpponent = Math.min(...opponents.map((p) => estimatedScore(p, expected)));
  if (finalScore > 0 && finalScore >= bestOpponent) return finalScore + DOUBLING_MARGIN;
  return -DOUBLING_MARGIN;
}
function swapGain(state, bot, index, value, level, expected) {
  const old = bot.cards[index];
  const oldValue = old.isRevealed ? old.value : expected;
  let gain = oldValue - value;
  if (level !== "easy") {
    const [a, b] = columnMates(bot, index);
    const revealedMates = [a, b].filter((c) => Boolean(c && c.isRevealed));
    if (revealedMates.length === 2 && revealedMates.every((c) => c.value === value)) {
      gain += 3 * value;
    } else if (value > 0 && a && b && revealedMates.some((c) => c.value === value)) {
      gain += value * 0.4;
    }
    if (old.isRevealed && old.value > 0 && revealedMates.some((c) => c.value === old.value)) {
      gain -= old.value * 0.4;
    }
  }
  if (level === "hard") {
    const hidden = hiddenIndices(bot);
    if (hidden.length === 1 && hidden[0] === index) {
      gain -= finishRisk(state, bot, estimatedScore(bot, expected) - oldValue + value, expected);
    }
  }
  return gain;
}
function bestSwap(state, bot, value, level, rand) {
  const expected = expectedHiddenValue(state, level);
  let best = { index: -1, gain: -Infinity };
  bot.cards.forEach((card, index) => {
    if (!card) return;
    const noise = level === "easy" ? (rand() - 0.5) * 8 : 0;
    const gain = swapGain(state, bot, index, value, level, expected) + noise;
    if (gain > best.gain) best = { index, gain };
  });
  return best;
}
function chooseSource(state, bot, level, rand = Math.random) {
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) return "draw";
  if (level === "easy") return top.value <= 4 ? "discard" : "draw";
  return bestSwap(state, bot, top.value, level, rand).gain >= 3 ? "discard" : "draw";
}
function choosePlacement(state, bot, level, rand = Math.random) {
  const card = state.currentDrawnCard;
  const swap = bestSwap(state, bot, card.value, level, rand);
  const hidden = hiddenIndices(bot);
  if (state.turnAction === "discard_choice" || hidden.length === 0) {
    return { action: "swap", index: swap.index };
  }
  const expected = expectedHiddenValue(state, level);
  const flipIndex = hidden[Math.floor(rand() * hidden.length)];
  let flipGain = 1;
  if (level === "hard" && hidden.length === 1) {
    flipGain -= finishRisk(state, bot, estimatedScore(bot, expected), expected);
  }
  return swap.gain >= flipGain ? { action: "swap", index: swap.index } : { action: "flip", index: flipIndex };
}
var BOT_REACTIONS = {
  column: ["\u{1F44F}", "\u{1F631}", "\u{1F525}"],
  lastRound: ["\u{1F631}", "\u{1F92B}"],
  doubled: ["\u{1F602}", "\u{1F602}", "\u{1F44F}"]
};
function chooseBotReaction(event, bots, doubledPlayerId, chance, rand = Math.random) {
  if (bots.length === 0 || rand() >= chance) return null;
  const doubledBot = event === "doubled" ? bots.find((bot2) => bot2.id === doubledPlayerId) : void 0;
  if (doubledBot) return { playerId: doubledBot.id, emoji: "\u{1F62D}" };
  const bot = bots[Math.floor(rand() * bots.length)];
  const emojis = BOT_REACTIONS[event];
  return { playerId: bot.id, emoji: emojis[Math.floor(rand() * emojis.length)] };
}
function chooseInitialReveal(bot, rand = Math.random) {
  const hidden = hiddenIndices(bot);
  return hidden[Math.floor(rand() * hidden.length)];
}

// src/server/gameServer.ts
var MAX_ROOMS = 500;
var MAX_NAME_LENGTH = 15;
var MAX_CHAT_LENGTH = 200;
var MAX_EVENTS_PER_SECOND = 40;
var CHAT_LIMIT = 8;
var CHAT_WINDOW_MS = 5e3;
var REACTION_LIMIT = 6;
var REACTION_WINDOW_MS = 4e3;
var CREATE_LIMIT = 5;
var CREATE_WINDOW_MS = 6e4;
var TARGET_SCORES = [100, 60, 1];
var BOT_LEVELS = ["easy", "normal", "hard"];
var AVATARS = ["\u{1F98A}", "\u{1F43C}", "\u{1F981}", "\u{1F42F}", "\u{1F428}", "\u{1F438}", "\u{1F984}", "\u{1F419}", "\u{1F989}", "\u{1F43A}"];
var BOT_NAMES = ["Bot Max", "Bot L\xE9a", "Bot Hugo", "Bot Zo\xE9", "Bot Sam", "Bot Nina", "Bot Th\xE9o", "Bot Lina"];
function background(timer) {
  var _a;
  (_a = timer.unref) == null ? void 0 : _a.call(timer);
}
function createGameServer({ io: io2, store, env }) {
  const envMs = (name, fallback) => {
    const value = Number(env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  const TURN_MS = envMs("TURN_MS", 6e4);
  const ABSENT_TURN_MS = envMs("ABSENT_TURN_MS", 8e3);
  const REVEAL_MS = envMs("REVEAL_MS", 45e3);
  const BOT_STEP_MS = envMs("BOT_STEP_MS", 900);
  const BOT_REVEAL_MS = envMs("BOT_REVEAL_MS", 500);
  const BOT_REACTION_CHANCE = Number(env.BOT_REACTION_CHANCE ?? 0.6);
  const BOT_REACTION_GAP_MS = envMs("BOT_REACTION_GAP_MS", 8e3);
  const BOT_REACTION_DELAY_MS = envMs("BOT_REACTION_DELAY_MS", 700);
  const SAVE_MS = envMs("SAVE_MS", 15e3);
  const SWEEP_MS = envMs("SWEEP_MS", 1e4);
  const HOST_GRACE_MS = envMs("HOST_GRACE_MS", 2e4);
  const EMPTY_ROOM_TTL_MS = envMs("EMPTY_ROOM_TTL_MS", 30 * 6e4);
  const IDLE_ROOM_TTL_MS = envMs("IDLE_ROOM_TTL_MS", 6 * 60 * 6e4);
  const rooms = /* @__PURE__ */ new Map();
  let isDirty = false;
  function newRoomData(state, drawPile = []) {
    return {
      state,
      drawPile,
      chat: [],
      lastActive: Date.now(),
      secrets: {},
      timer: null,
      deadlineAt: null,
      sockets: /* @__PURE__ */ new Map(),
      disconnectedAt: /* @__PURE__ */ new Map(),
      lastBotReactionAt: 0
    };
  }
  function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    do {
      code = "";
      for (let i = 0; i < 4; i++) {
        code += chars.charAt((0, import_crypto.randomInt)(chars.length));
      }
    } while (rooms.has(code));
    return code;
  }
  function cleanName(value, fallback) {
    if (typeof value !== "string") return fallback;
    const name = value.replace(/[\p{Cc}\p{Cf}]/gu, "").trim().slice(0, MAX_NAME_LENGTH);
    return name || fallback;
  }
  function cleanAvatar(value) {
    return typeof value === "string" && AVATARS.includes(value) ? value : AVATARS[(0, import_crypto.randomInt)(AVATARS.length)];
  }
  function cleanTargetScore(value) {
    return typeof value === "number" && TARGET_SCORES.includes(value) ? value : 100;
  }
  function isValidToken(value) {
    return typeof value === "string" && value.length >= 16 && value.length <= 128;
  }
  function viewOf(room) {
    return {
      ...publicState(room),
      turnEndsInMs: room.deadlineAt ? Math.max(0, room.deadlineAt - Date.now()) : null
    };
  }
  function broadcastRoom(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;
    isDirty = true;
    io2.to(roomCode).emit("game_state_update", viewOf(room));
  }
  function addSystemMessage(roomCode, text) {
    const room = rooms.get(roomCode);
    if (!room) return;
    const msg = {
      id: `sys-${(0, import_crypto.randomUUID)()}`,
      senderId: "system",
      senderName: "Syst\xE8me",
      senderAvatar: "\u{1F4E2}",
      text,
      timestamp: Date.now(),
      isSystem: true
    };
    room.chat.push(msg);
    if (room.chat.length > 100) room.chat.shift();
    io2.to(roomCode).emit("chat_message", msg);
  }
  function hasConnectedHuman(room) {
    return room.state.players.some((p) => !p.isBot && p.isConnected);
  }
  function clearRoomTimer(room) {
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
    room.deadlineAt = null;
  }
  function setRoomTimer(roomCode, room, delay, isDeadline, run) {
    room.deadlineAt = isDeadline ? Date.now() + delay : null;
    room.timer = setTimeout(() => {
      clearRoomTimer(room);
      if (rooms.get(roomCode) === room) run();
    }, delay);
  }
  function deleteRoom(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;
    clearRoomTimer(room);
    rooms.delete(roomCode);
    isDirty = true;
  }
  function scheduleNext(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;
    clearRoomTimer(room);
    if (!hasConnectedHuman(room)) return;
    const { state } = room;
    if (state.phase === "initial_revealing") {
      const pendingBots = state.players.filter((p) => p.isBot && p.initialRevealedCount < 2);
      if (pendingBots.length > 0) {
        setRoomTimer(roomCode, room, BOT_REVEAL_MS, false, () => autoReveal(roomCode, pendingBots));
      } else {
        const isOnlyAbsentsLeft = state.players.every((p) => p.initialRevealedCount >= 2 || !p.isConnected);
        setRoomTimer(roomCode, room, isOnlyAbsentsLeft ? ABSENT_TURN_MS : REVEAL_MS, true, () => {
          autoReveal(roomCode, state.players.filter((p) => p.initialRevealedCount < 2));
        });
      }
      return;
    }
    if (state.phase !== "playing") return;
    const current = state.players[state.currentPlayerIndex];
    if (current.isBot) {
      setRoomTimer(roomCode, room, BOT_STEP_MS, false, () => runBotStep(roomCode, current));
    } else {
      const delay = current.isConnected ? TURN_MS : ABSENT_TURN_MS;
      setRoomTimer(roomCode, room, delay, true, () => autoPlayTurn(roomCode, current));
    }
  }
  function botEventFrom(messages) {
    if (messages.some((text) => text.includes("Score doubl\xE9"))) return "doubled";
    if (messages.some((text) => text.includes("\xE9limin\xE9 une colonne"))) return "column";
    if (messages.some((text) => text.includes("Dernier tour"))) return "lastRound";
    return null;
  }
  function maybeBotReaction(roomCode, room, messages) {
    const event = botEventFrom(messages);
    if (!event || !hasConnectedHuman(room)) return;
    if (Date.now() - room.lastBotReactionAt < BOT_REACTION_GAP_MS) return;
    const bots = room.state.players.filter((p) => p.isBot && !p.replacedHuman);
    const reaction = chooseBotReaction(event, bots, room.state.doubledPlayerId, BOT_REACTION_CHANCE);
    if (!reaction) return;
    room.lastBotReactionAt = Date.now();
    background(setTimeout(() => io2.to(roomCode).emit("player_reaction", reaction), BOT_REACTION_DELAY_MS));
  }
  function advance(roomCode, messages = []) {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.lastActive = Date.now();
    messages.forEach((text) => addSystemMessage(roomCode, text));
    maybeBotReaction(roomCode, room, messages);
    scheduleNext(roomCode);
    broadcastRoom(roomCode);
  }
  function autoReveal(roomCode, players) {
    const room = rooms.get(roomCode);
    if (!room) return;
    const messages = [];
    players.forEach((player) => {
      while (room.state.phase === "initial_revealing" && player.initialRevealedCount < 2) {
        const result = revealInitialCard(room, player.id, chooseInitialReveal(player));
        if (result.ok) messages.push(...result.messages);
      }
    });
    advance(roomCode, messages);
  }
  function playStep(room, player, level) {
    const { state } = room;
    if (state.turnAction === "choose_source") {
      return chooseSource(state, player, level) === "discard" ? takeDiscard(room, player.id) : drawCard(room, player.id);
    }
    const placement = choosePlacement(state, player, level);
    return placement.action === "swap" ? swapCard(room, player.id, placement.index) : discardAndFlip(room, player.id, placement.index);
  }
  function runBotStep(roomCode, bot) {
    const room = rooms.get(roomCode);
    if (!room) return;
    const result = playStep(room, bot, bot.botLevel ?? "normal");
    if (!result.ok) {
      console.error(`Coup de bot refus\xE9 dans ${roomCode}: ${result.error}`);
      return;
    }
    advance(roomCode, result.messages);
  }
  function autoPlayTurn(roomCode, player) {
    const room = rooms.get(roomCode);
    if (!room) return;
    const messages = [`\u23F1\uFE0F Temps \xE9coul\xE9 : le tour de ${player.name} est jou\xE9 automatiquement.`];
    const stillPlaying = () => {
      var _a;
      return room.state.phase === "playing" && ((_a = room.state.players[room.state.currentPlayerIndex]) == null ? void 0 : _a.id) === player.id;
    };
    for (let step = 0; step < 2 && stillPlaying(); step++) {
      const roundNumber = room.state.roundNumber;
      const wasHoldingCard = room.state.currentDrawnCard !== null;
      const result = playStep(room, player, "normal");
      if (result.ok) messages.push(...result.messages);
      if (wasHoldingCard || room.state.roundNumber !== roundNumber) break;
    }
    advance(roomCode, messages);
  }
  function transferHost(room) {
    const humans = room.state.players.filter((p) => !p.isBot);
    const nextHost = humans.find((p) => p.isConnected) ?? humans[0];
    if (!nextHost) return void 0;
    room.state.players.forEach((p) => {
      p.isHost = p.id === nextHost.id;
    });
    return nextHost;
  }
  function forgetRemovedSeats(room) {
    const seats = room.state.players.map((p) => p.id);
    room.secrets = Object.fromEntries(Object.entries(room.secrets).filter(([id]) => seats.includes(id)));
  }
  function takeSeatBack(roomCode, room, player) {
    restoreHuman(player);
    clearRoomTimer(room);
    if (!room.state.players.some((p) => p.isHost)) player.isHost = true;
    room.lastActive = Date.now();
    addSystemMessage(roomCode, `\u{1F3AE} ${player.name} reprend sa place !`);
  }
  function removePlayer(roomCode, room, player) {
    const wasHost = player.isHost;
    room.sockets.delete(player.id);
    room.disconnectedAt.delete(player.id);
    const messages = [];
    if (room.state.phase === "lobby") {
      delete room.secrets[player.id];
      room.state.players = room.state.players.filter((p) => p.id !== player.id);
      messages.push(`\u{1F44B} ${player.name} a quitt\xE9 le salon.`);
      if (!room.state.players.some((p) => !p.isBot)) {
        deleteRoom(roomCode);
        return;
      }
    } else {
      replaceWithBot(player);
      messages.push(`\u{1F916} ${player.name} a quitt\xE9 la partie, un bot prend sa place.`);
    }
    if (wasHost) {
      const nextHost = transferHost(room);
      if (nextHost) messages.push(`\u{1F451} ${nextHost.name} devient l'h\xF4te.`);
    }
    advance(roomCode, messages);
  }
  io2.on("connection", (socket) => {
    let session = null;
    let eventWindowStart = 0;
    let eventCount = 0;
    const chatTimes = [];
    const reactionTimes = [];
    const createTimes = [];
    function isOverLimit(times, limit, windowMs) {
      const now = Date.now();
      while (times.length > 0 && now - times[0] > windowMs) times.shift();
      if (times.length >= limit) return true;
      times.push(now);
      return false;
    }
    function bind(code, room, player) {
      unbind();
      if (player.replacedHuman) takeSeatBack(code, room, player);
      session = { code, playerId: player.id };
      if (!room.sockets.has(player.id)) room.sockets.set(player.id, /* @__PURE__ */ new Set());
      room.sockets.get(player.id).add(socket.id);
      room.disconnectedAt.delete(player.id);
      player.isConnected = true;
      socket.join(code);
    }
    function unbind() {
      var _a;
      if (!session) return;
      const { code, playerId } = session;
      session = null;
      socket.leave(code);
      const room = rooms.get(code);
      const sockets = room == null ? void 0 : room.sockets.get(playerId);
      if (!room || !sockets) return;
      sockets.delete(socket.id);
      if (sockets.size > 0) return;
      room.sockets.delete(playerId);
      const player = room.state.players.find((p) => p.id === playerId);
      if (player && !player.isBot) {
        player.isConnected = false;
        room.disconnectedAt.set(playerId, Date.now());
        const isTheirTurn = room.state.phase === "playing" && ((_a = room.state.players[room.state.currentPlayerIndex]) == null ? void 0 : _a.id) === playerId;
        if (isTheirTurn || room.state.phase === "initial_revealing" || !hasConnectedHuman(room)) scheduleNext(code);
        broadcastRoom(code);
      }
    }
    function findSeat(room, token) {
      if (!isValidToken(token)) return void 0;
      const entry = Object.entries(room.secrets).find(([, secret]) => secret === token);
      return entry && room.state.players.find((p) => p.id === entry[0]);
    }
    function getContext(data) {
      if (!session && typeof data.roomCode === "string") {
        const code = data.roomCode.toUpperCase().trim();
        const room2 = rooms.get(code);
        const player2 = room2 && findSeat(room2, data.sessionToken);
        if (room2 && player2) {
          bind(code, room2, player2);
          if (!room2.timer) scheduleNext(code);
        }
      }
      if (!session) return null;
      const room = rooms.get(session.code);
      const player = room == null ? void 0 : room.state.players.find((p) => p.id === session.playerId);
      return room && player ? { room, player, code: session.code } : null;
    }
    function getHostContext(data) {
      const context = getContext(data);
      return (context == null ? void 0 : context.player.isHost) ? context : null;
    }
    function applyAction(code, result) {
      if (result.ok) {
        advance(code, result.messages);
      } else {
        socket.emit("action_rejected", result.error);
      }
    }
    function on2(event, handler) {
      socket.on(event, (...args) => {
        const now = Date.now();
        if (now - eventWindowStart > 1e3) {
          eventWindowStart = now;
          eventCount = 0;
        }
        if (++eventCount > MAX_EVENTS_PER_SECOND) return;
        const callback = args.find((arg) => typeof arg === "function");
        const data = args[0] && typeof args[0] === "object" ? args[0] : {};
        try {
          handler(data, callback ?? (() => {
          }));
        } catch (err) {
          console.error(`Erreur sur l'\xE9v\xE9nement ${event}:`, err);
        }
      });
    }
    on2("ping_alive", (_data, ack) => {
      ack(true);
    });
    on2("create_room", (data, ack) => {
      if (!isValidToken(data.sessionToken)) {
        return ack({ success: false, error: "Session invalide, rechargez la page." });
      }
      if (rooms.size >= MAX_ROOMS || isOverLimit(createTimes, CREATE_LIMIT, CREATE_WINDOW_MS)) {
        return ack({ success: false, error: "Trop de salons cr\xE9\xE9s, r\xE9essayez dans un instant." });
      }
      const code = generateRoomCode();
      const hostPlayer = createPlayer({
        id: (0, import_crypto.randomUUID)(),
        name: cleanName(data.playerName, "H\xF4te"),
        avatar: cleanAvatar(data.avatar),
        isHost: true
      });
      const room = newRoomData(createGameState(code, hostPlayer, cleanTargetScore(data.targetScore)));
      room.secrets[hostPlayer.id] = data.sessionToken;
      rooms.set(code, room);
      bind(code, room, hostPlayer);
      addSystemMessage(code, `\u2728 Salon cr\xE9\xE9 ! Code : ${code}`);
      isDirty = true;
      ack({ success: true, roomCode: code, playerId: hostPlayer.id, state: viewOf(room), chat: room.chat });
    });
    on2("rejoin_room", (data, ack) => {
      const code = typeof data.roomCode === "string" ? data.roomCode.toUpperCase().trim() : "";
      const room = rooms.get(code);
      const player = room && findSeat(room, data.sessionToken);
      if (!room || !player) {
        return ack({ success: false, error: "Salon introuvable ou expir\xE9." });
      }
      bind(code, room, player);
      if (!room.timer) scheduleNext(code);
      broadcastRoom(code);
      ack({ success: true, roomCode: code, playerId: player.id, state: viewOf(room), chat: room.chat });
    });
    on2("check_resume", (data, ack) => {
      const code = typeof data.roomCode === "string" ? data.roomCode.toUpperCase().trim() : "";
      const room = rooms.get(code);
      const canResume = Boolean(room && room.state.phase !== "game_over" && findSeat(room, data.sessionToken));
      ack({ canResume });
    });
    on2("join_room", (data, ack) => {
      if (!isValidToken(data.sessionToken)) {
        return ack({ success: false, error: "Session invalide, rechargez la page." });
      }
      const code = typeof data.roomCode === "string" ? data.roomCode.toUpperCase().trim() : "";
      const room = rooms.get(code);
      if (!room) {
        return ack({ success: false, error: "Salon introuvable. V\xE9rifiez le code." });
      }
      const existingPlayer = findSeat(room, data.sessionToken);
      if (existingPlayer) {
        bind(code, room, existingPlayer);
        if (!room.timer) scheduleNext(code);
        broadcastRoom(code);
        return ack({ success: true, roomCode: code, playerId: existingPlayer.id, state: viewOf(room), chat: room.chat });
      }
      if (room.state.phase !== "lobby") {
        return ack({ success: false, error: "La partie est d\xE9j\xE0 en cours dans ce salon." });
      }
      if (room.state.players.length >= MAX_PLAYERS) {
        return ack({ success: false, error: `Le salon est complet (max ${MAX_PLAYERS} joueurs).` });
      }
      const newPlayer = createPlayer({
        id: (0, import_crypto.randomUUID)(),
        name: cleanName(data.playerName, `Joueur ${room.state.players.length + 1}`),
        avatar: cleanAvatar(data.avatar),
        isHost: false
      });
      room.state.players.push(newPlayer);
      room.secrets[newPlayer.id] = data.sessionToken;
      bind(code, room, newPlayer);
      addSystemMessage(code, `\u{1F44B} ${newPlayer.name} a rejoint le salon !`);
      broadcastRoom(code);
      ack({ success: true, roomCode: code, playerId: newPlayer.id, state: viewOf(room), chat: room.chat });
    });
    on2("leave_room", (data) => {
      const context = getContext(data);
      if (!context) return;
      unbind();
      removePlayer(context.code, context.room, context.player);
    });
    on2("add_bot", (data, ack) => {
      const context = getHostContext(data);
      if (!context) return;
      const { room, code } = context;
      if (room.state.phase !== "lobby" || room.state.players.length >= MAX_PLAYERS) return;
      const takenNames = room.state.players.map((p) => p.name);
      const botName = BOT_NAMES.find((name) => !takenNames.includes(name)) ?? "Bot";
      room.state.players.push(createPlayer({
        id: `bot-${(0, import_crypto.randomUUID)()}`,
        name: botName,
        avatar: "\u{1F916}",
        isHost: false,
        isBot: true,
        botLevel: BOT_LEVELS.includes(data.level) ? data.level : "normal"
      }));
      addSystemMessage(code, `\u{1F916} ${botName} a \xE9t\xE9 ajout\xE9 \xE0 la partie !`);
      broadcastRoom(code);
      ack({ success: true });
    });
    on2("remove_bot", (data) => {
      const context = getHostContext(data);
      if (!context) return;
      const { room, code } = context;
      if (room.state.phase !== "lobby") return;
      const bot = room.state.players.find((p) => p.id === data.botId && p.isBot);
      if (bot) {
        room.state.players = room.state.players.filter((p) => p.id !== bot.id);
        addSystemMessage(code, `\u{1F916} ${bot.name} a quitt\xE9 le salon.`);
        broadcastRoom(code);
      }
    });
    on2("update_settings", (data) => {
      const context = getHostContext(data);
      if (!context || context.room.state.phase !== "lobby") return;
      context.room.state.targetScore = cleanTargetScore(data.targetScore);
      broadcastRoom(context.code);
    });
    on2("start_game", (data) => {
      const context = getHostContext(data);
      if (!context) return;
      const { room, code } = context;
      if (room.state.phase !== "lobby" || room.state.players.length < 2) return;
      applyAction(code, startRound(room));
    });
    on2("reveal_initial_card", (data) => {
      const context = getContext(data);
      if (!context) return;
      applyAction(context.code, revealInitialCard(context.room, context.player.id, data.cardIndex));
    });
    on2("draw_card", (data) => {
      const context = getContext(data);
      if (!context) return;
      applyAction(context.code, drawCard(context.room, context.player.id));
    });
    on2("take_discard", (data) => {
      const context = getContext(data);
      if (!context) return;
      applyAction(context.code, takeDiscard(context.room, context.player.id));
    });
    on2("swap_card", (data) => {
      const context = getContext(data);
      if (!context) return;
      applyAction(context.code, swapCard(context.room, context.player.id, data.cardIndex));
    });
    on2("discard_and_flip", (data) => {
      const context = getContext(data);
      if (!context) return;
      applyAction(context.code, discardAndFlip(context.room, context.player.id, data.flipIndex));
    });
    on2("next_round", (data) => {
      const context = getHostContext(data);
      if (!context || context.room.state.phase !== "round_ended") return;
      applyAction(context.code, startRound(context.room));
    });
    on2("restart_game", (data) => {
      const context = getHostContext(data);
      if (!context || context.room.state.phase !== "game_over") return;
      resetToLobby(context.room);
      forgetRemovedSeats(context.room);
      advance(context.code, [`\u{1F504} La partie a \xE9t\xE9 r\xE9initialis\xE9e par l'h\xF4te.`]);
    });
    on2("rematch", (data) => {
      const context = getContext(data);
      if (!context || context.player.isBot || context.room.state.phase !== "game_over") return;
      const { room, code, player } = context;
      resetToLobby(room);
      forgetRemovedSeats(room);
      if (room.state.players.length < 2) {
        advance(code, [`\u{1F504} Il n'y a plus assez de joueurs pour une revanche.`]);
        return;
      }
      const result = startRound(room);
      advance(code, [`\u{1F501} Revanche lanc\xE9e par ${player.name} !`, ...result.ok ? result.messages : []]);
    });
    on2("send_reaction", (data) => {
      const context = getContext(data);
      if (!context || !REACTION_EMOJIS.includes(data.emoji)) return;
      if (isOverLimit(reactionTimes, REACTION_LIMIT, REACTION_WINDOW_MS)) return;
      io2.to(context.code).emit("player_reaction", { playerId: context.player.id, emoji: data.emoji });
    });
    on2("send_chat", (data) => {
      const context = getContext(data);
      if (!context) return;
      const { room, player, code } = context;
      const trimmed = typeof data.text === "string" ? data.text.trim().slice(0, MAX_CHAT_LENGTH) : "";
      if (!trimmed) return;
      if (isOverLimit(chatTimes, CHAT_LIMIT, CHAT_WINDOW_MS)) {
        socket.emit("action_rejected", "Doucement sur le chat !");
        return;
      }
      const msg = {
        id: `chat-${(0, import_crypto.randomUUID)()}`,
        senderId: player.id,
        senderName: player.name,
        senderAvatar: player.avatar,
        text: trimmed,
        timestamp: Date.now()
      };
      room.chat.push(msg);
      if (room.chat.length > 100) room.chat.shift();
      io2.to(code).emit("chat_message", msg);
    });
    socket.on("disconnect", unbind);
  });
  function sweepRooms() {
    const now = Date.now();
    rooms.forEach((room, code) => {
      const ttl = hasConnectedHuman(room) ? IDLE_ROOM_TTL_MS : EMPTY_ROOM_TTL_MS;
      if (now - room.lastActive > ttl) {
        deleteRoom(code);
        return;
      }
      const host = room.state.players.find((p) => p.isHost);
      const absentSince = host && room.disconnectedAt.get(host.id);
      if (absentSince && now - absentSince > HOST_GRACE_MS && hasConnectedHuman(room)) {
        const nextHost = transferHost(room);
        if (nextHost) {
          addSystemMessage(code, `\u{1F451} ${nextHost.name} devient l'h\xF4te.`);
          broadcastRoom(code);
        }
      }
    });
  }
  function createSnapshot() {
    return JSON.stringify(
      [...rooms.values()].map(({ state, drawPile, chat, lastActive, secrets }) => ({
        state,
        drawPile,
        chat,
        lastActive,
        secrets
      }))
    );
  }
  async function restoreRooms() {
    try {
      const snapshot = await store.load();
      if (!snapshot) return;
      for (const saved of JSON.parse(snapshot)) {
        const state = saved.state;
        state.turnEndsInMs = null;
        state.players.forEach((p) => {
          if (!p.isBot) p.isConnected = false;
        });
        const room = newRoomData(state, saved.drawPile);
        room.chat = saved.chat;
        room.lastActive = saved.lastActive;
        room.secrets = saved.secrets;
        rooms.set(state.roomCode, room);
      }
      console.log(`\u{1F4BE} ${rooms.size} salon(s) restaur\xE9(s)`);
    } catch (err) {
      console.error("Impossible de restaurer les salons:", err);
    }
  }
  async function saveRooms() {
    if (!isDirty) return;
    isDirty = false;
    try {
      await store.save(createSnapshot());
    } catch (err) {
      isDirty = true;
      console.error("Impossible de sauvegarder les salons:", err);
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
    }
  };
}

// fivem/josky-phone/server-src/adapter.ts
var import_crypto2 = require("crypto");
var MAX_MESSAGE_LENGTH = 16e3;
var PART_LENGTH = 6e3;
var INVITE_LIMIT = 5;
var INVITE_WINDOW_MS = 6e4;
var MAX_NUMBER_LENGTH = 32;
function parseMessage(message) {
  if (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) return null;
  try {
    const parsed = JSON.parse(message);
    return typeof (parsed == null ? void 0 : parsed.event) === "string" ? parsed : null;
  } catch {
    return null;
  }
}
function createFivemIo(api) {
  const bootSecret = (0, import_crypto2.randomBytes)(32).toString("hex");
  const sockets = /* @__PURE__ */ new Map();
  let connectionHandler = null;
  let nextSocketId = 1;
  let nextMessageId = 1;
  const inviteTimes = /* @__PURE__ */ new Map();
  function deliver(source, payload) {
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    const id = nextMessageId++;
    const total = Math.max(1, Math.ceil(encoded.length / PART_LENGTH));
    for (let index = 0; index < total; index++) {
      const part = encoded.slice(index * PART_LENGTH, (index + 1) * PART_LENGTH);
      api.send(source, `${id}:${index}:${total}:${part}`);
    }
  }
  function tokenOf(source) {
    const owner = api.licenseOf(source) ?? `source:${source}`;
    return (0, import_crypto2.createHash)("sha256").update(`${bootSecret}:${owner}`).digest("hex");
  }
  function close(source) {
    var _a;
    const socket = sockets.get(source);
    if (!socket) return;
    sockets.delete(source);
    (_a = socket.handlers.get("disconnect")) == null ? void 0 : _a();
  }
  function open(source) {
    close(source);
    const socket = {
      id: `phone-${nextSocketId++}`,
      source,
      rooms: /* @__PURE__ */ new Set(),
      handlers: /* @__PURE__ */ new Map(),
      on(event, handler) {
        socket.handlers.set(event, handler);
      },
      emit(event, ...args) {
        deliver(source, { type: "event", event, args });
      },
      join(room) {
        socket.rooms.add(room);
      },
      leave(room) {
        socket.rooms.delete(room);
      }
    };
    sockets.set(source, socket);
    connectionHandler == null ? void 0 : connectionHandler(socket);
    deliver(source, { type: "connected" });
  }
  async function inviteContact(socket, data) {
    const { roomCode, number } = data;
    if (typeof roomCode !== "string" || !socket.rooms.has(roomCode)) {
      return { success: false, error: "Salon introuvable." };
    }
    if (typeof number !== "string" || !number || number.length > MAX_NUMBER_LENGTH) {
      return { success: false, error: "Num\xE9ro invalide." };
    }
    const now = Date.now();
    const recent = (inviteTimes.get(socket.source) ?? []).filter((time) => now - time < INVITE_WINDOW_MS);
    if (recent.length >= INVITE_LIMIT) {
      return { success: false, error: "Trop d'invitations, r\xE9essayez dans un instant." };
    }
    inviteTimes.set(socket.source, [...recent, now]);
    const sent = await api.sendInvite(socket.source, number, roomCode).catch(() => false);
    return sent ? { success: true } : { success: false, error: "Message non envoy\xE9. Donnez-lui le code autrement." };
  }
  function receive(source, message) {
    const socket = sockets.get(source);
    const parsed = parseMessage(message);
    if (!socket || !parsed) return;
    const data = parsed.data && typeof parsed.data === "object" ? { ...parsed.data } : {};
    if (parsed.event === "invite_contact") {
      void inviteContact(socket, data).then((response) => {
        if (typeof parsed.ack === "number") deliver(source, { type: "ack", id: parsed.ack, response });
      });
      return;
    }
    const handler = socket.handlers.get(parsed.event);
    if (!handler || parsed.event === "disconnect") return;
    data.sessionToken = tokenOf(source);
    const ack = parsed.ack;
    handler(data, (response) => {
      if (typeof ack === "number") deliver(source, { type: "ack", id: ack, response });
    });
  }
  api.onClient("josky:connect", (source) => open(source));
  api.onClient("josky:disconnect", (source) => close(source));
  api.onClient("josky:event", (source, message) => receive(source, message));
  api.onPlayerDropped((droppedSource) => {
    close(droppedSource);
    inviteTimes.delete(droppedSource);
  });
  return {
    on(_event, handler) {
      connectionHandler = handler;
    },
    to(room) {
      return {
        emit(event, ...args) {
          sockets.forEach((socket) => {
            if (socket.rooms.has(room)) socket.emit(event, ...args);
          });
        }
      };
    }
  };
}

// fivem/josky-phone/server-src/main.ts
var resource = GetCurrentResourceName();
var config = JSON.parse(LoadResourceFile(resource, "config.json"));
var eventSource = () => Number(globalThis.source);
async function sendInvite(source, number, roomCode) {
  const lbPhone = globalThis.exports["lb-phone"];
  const from = await lbPhone.GetEquippedPhoneNumber(source);
  if (!from || from === number) return false;
  return Boolean(await lbPhone.SendMessage(from, number, config.inviteMessage.replace("{code}", roomCode)));
}
var io = createFivemIo({
  onClient: (event, handler) => onNet(event, (...args) => handler(eventSource(), ...args)),
  onPlayerDropped: (handler) => on("playerDropped", () => handler(eventSource())),
  send: (source, part) => emitNet("josky:message", source, part),
  licenseOf: (source) => GetPlayerIdentifierByType(String(source), "license") ?? void 0,
  sendInvite
});
var game = createGameServer({
  io,
  store: { load: async () => null, save: async () => {
  } },
  env: {
    TURN_MS: String(config.turnSeconds * 1e3),
    ABSENT_TURN_MS: String(config.absentTurnSeconds * 1e3),
    BOT_STEP_MS: String(config.botStepMs)
  }
});
game.start();
