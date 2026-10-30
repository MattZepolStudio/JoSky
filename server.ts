import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SkyjoCard, Player, GameState, RoomSettings, ChatMessage } from './src/types/game.ts';
import { generateSkyjoDeck, checkAndEliminateColumns, calculatePlayerScore } from './src/utils/skyjoDeck.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Instant healthcheck routes for Render and cloud uptime monitors
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'healthy', uptime: Math.floor(process.uptime()), timestamp: Date.now() });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', rooms: rooms.size });
});

interface RoomData {
  state: GameState;
  drawPile: SkyjoCard[];
  chat: ChatMessage[];
  lastActive: number;
}

const rooms = new Map<string, RoomData>();

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐨', '🐸', '🦄', '🐙', '🦉', '🐺'];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastRoom(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;
  // Send state with hidden draw pile count
  const publicState: GameState = {
    ...room.state,
    drawPileCount: room.drawPile.length,
  };
  io.to(roomCode).emit('game_state_update', publicState);
}

function addSystemMessage(roomCode: string, text: string) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const msg: ChatMessage = {
    id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

// Bot AI Turn Logic
function triggerBotTurnIfNeeded(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || room.state.phase !== 'playing') return;

  const currentPlayer = room.state.players[room.state.currentPlayerIndex];
  if (!currentPlayer || !currentPlayer.isBot) return;

  setTimeout(() => {
    executeBotTurn(roomCode, currentPlayer.id);
  }, 900);
}

function executeBotTurn(roomCode: string, botId: string) {
  const room = rooms.get(roomCode);
  if (!room || room.state.phase !== 'playing') return;

  const playerIndex = room.state.currentPlayerIndex;
  const bot = room.state.players[playerIndex];
  if (!bot || bot.id !== botId) return;

  const topDiscard = room.state.discardPile[room.state.discardPile.length - 1];

  // Helper: find column matches or worst cards
  // Check if top discard matches any column with 1 or 2 matching cards
  let wantsDiscard = false;
  let targetSwapIndex = -1;

  if (topDiscard && topDiscard.value <= 4) {
    // Favorable low card, let's take it
    wantsDiscard = true;
  }

  // Find bot's highest revealed card or unrevealed cards
  let highestRevealedVal = -99;
  let highestRevealedIdx = -1;
  const unrevealedIndices: number[] = [];

  bot.cards.forEach((card, idx) => {
    if (!card) return;
    if (card.isRevealed) {
      if (card.value > highestRevealedVal) {
        highestRevealedVal = card.value;
        highestRevealedIdx = idx;
      }
    } else {
      unrevealedIndices.push(idx);
    }
  });

  if (wantsDiscard && topDiscard) {
    // Take from discard and swap
    // Replace highest revealed card if discard is lower, else replace random unrevealed
    if (highestRevealedIdx !== -1 && topDiscard.value < highestRevealedVal) {
      targetSwapIndex = highestRevealedIdx;
    } else if (unrevealedIndices.length > 0) {
      targetSwapIndex = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
    } else {
      targetSwapIndex = highestRevealedIdx !== -1 ? highestRevealedIdx : 0;
    }

    // Execute discard take
    const drawn = room.state.discardPile.pop()!;
    room.state.currentDrawnCard = drawn;
    room.state.turnAction = 'discard_choice';
    broadcastRoom(roomCode);

    setTimeout(() => {
      handleSwap(roomCode, botId, targetSwapIndex);
    }, 700);
  } else {
    // Draw from draw pile
    if (room.drawPile.length === 0) {
      recycleDiscardPile(room);
    }
    const drawn = room.drawPile.pop();
    if (!drawn) return;
    drawn.isRevealed = true;
    room.state.currentDrawnCard = drawn;
    room.state.turnAction = 'drawn_card_choice';
    broadcastRoom(roomCode);

    setTimeout(() => {
      // Evaluate drawn card
      if (drawn.value <= 5 || (highestRevealedIdx !== -1 && drawn.value < highestRevealedVal)) {
        // Exchange with highest revealed or unrevealed
        let swapIdx = highestRevealedIdx !== -1 && drawn.value < highestRevealedVal
          ? highestRevealedIdx
          : (unrevealedIndices.length > 0 ? unrevealedIndices[0] : (highestRevealedIdx !== -1 ? highestRevealedIdx : 0));
        handleSwap(roomCode, botId, swapIdx);
      } else {
        // Discard drawn card and flip an unrevealed card
        if (unrevealedIndices.length > 0) {
          const flipIdx = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
          handleDiscardAndFlip(roomCode, botId, flipIdx);
        } else {
          // If all revealed, swap with highest
          handleSwap(roomCode, botId, highestRevealedIdx !== -1 ? highestRevealedIdx : 0);
        }
      }
    }, 900);
  }
}

function recycleDiscardPile(room: RoomData) {
  if (room.state.discardPile.length <= 1) return;
  const top = room.state.discardPile.pop()!;
  const toReshuffle = room.state.discardPile.map(c => ({ ...c, isRevealed: false }));
  room.drawPile = generateSkyjoDeck().slice(0, toReshuffle.length); // Fresh shuffled
  room.state.discardPile = [top];
}

function handleSwap(roomCode: string, playerId: string, cardIndex: number) {
  const room = rooms.get(roomCode);
  if (!room || room.state.phase !== 'playing') return;
  const player = room.state.players[room.state.currentPlayerIndex];
  if (!player || player.id !== playerId || !room.state.currentDrawnCard) return;

  const oldCard = player.cards[cardIndex];
  if (!oldCard) return; // slot is empty (eliminated column)

  // Put drawn card in player's grid
  player.cards[cardIndex] = {
    ...room.state.currentDrawnCard,
    isRevealed: true,
  };

  // Put old card on discard pile (revealed)
  room.state.discardPile.push({
    ...oldCard,
    isRevealed: true,
  });

  room.state.currentDrawnCard = null;

  // Check column elimination
  const { newCards, eliminatedColumns } = checkAndEliminateColumns(player.cards);
  player.cards = newCards;
  if (eliminatedColumns.length > 0) {
    addSystemMessage(roomCode, `🎉 ${player.name} a éliminé une colonne complète !`);
  }

  // Update revealed count and score
  updatePlayerStats(player);

  finishTurn(roomCode, player);
}

function handleDiscardAndFlip(roomCode: string, playerId: string, flipIndex: number) {
  const room = rooms.get(roomCode);
  if (!room || room.state.phase !== 'playing') return;
  const player = room.state.players[room.state.currentPlayerIndex];
  if (!player || player.id !== playerId || !room.state.currentDrawnCard) return;

  // Put drawn card on discard pile
  room.state.discardPile.push({
    ...room.state.currentDrawnCard,
    isRevealed: true,
  });
  room.state.currentDrawnCard = null;

  // Flip the chosen card
  const targetCard = player.cards[flipIndex];
  if (targetCard && !targetCard.isRevealed) {
    targetCard.isRevealed = true;
  }

  // Check column elimination
  const { newCards, eliminatedColumns } = checkAndEliminateColumns(player.cards);
  player.cards = newCards;
  if (eliminatedColumns.length > 0) {
    addSystemMessage(roomCode, `🎉 ${player.name} a éliminé une colonne complète !`);
  }

  updatePlayerStats(player);
  finishTurn(roomCode, player);
}

function updatePlayerStats(player: Player) {
  let revCount = 0;
  let remainingCount = 0;
  player.cards.forEach(c => {
    if (c) {
      remainingCount++;
      if (c.isRevealed) revCount++;
    }
  });
  player.revealedCount = revCount;
  player.roundScore = calculatePlayerScore(player.cards, true);
  if (remainingCount > 0 && revCount >= remainingCount) {
    player.hasFinishedRound = true;
  }
}

function finishTurn(roomCode: string, player: Player) {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Check if player revealed all remaining cards
  if (player.hasFinishedRound && !room.state.finalRoundTriggeredBy) {
    room.state.finalRoundTriggeredBy = player.id;
    // All other players get one final turn
    room.state.lastTurnPlayerIds = room.state.players
      .filter(p => p.id !== player.id)
      .map(p => p.id);
    addSystemMessage(roomCode, `⚡ ${player.name} a retourné toutes ses cartes ! Dernier tour pour tout le monde !`);
  } else if (room.state.finalRoundTriggeredBy) {
    // Remove current player from lastTurnPlayerIds if they were in it
    room.state.lastTurnPlayerIds = room.state.lastTurnPlayerIds.filter(id => id !== player.id);
  }

  // Check if round is finished: either no lastTurnPlayerIds left when final round triggered
  if (room.state.finalRoundTriggeredBy && room.state.lastTurnPlayerIds.length === 0) {
    endRound(roomCode);
    return;
  }

  // Advance to next player
  room.state.currentPlayerIndex = (room.state.currentPlayerIndex + 1) % room.state.players.length;
  room.state.turnAction = 'choose_source';

  broadcastRoom(roomCode);
  triggerBotTurnIfNeeded(roomCode);
}

function endRound(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Reveal all remaining unrevealed cards for everyone
  room.state.players.forEach(p => {
    p.cards.forEach(c => {
      if (c && !c.isRevealed) {
        c.isRevealed = true;
      }
    });
    // Check column triples on final reveal
    const { newCards } = checkAndEliminateColumns(p.cards);
    p.cards = newCards;
    p.roundScore = calculatePlayerScore(p.cards, false);
  });

  // Calculate scores and check Skyjo Doubling Rule
  const triggerPlayerId = room.state.finalRoundTriggeredBy;
  const triggerPlayer = room.state.players.find(p => p.id === triggerPlayerId);

  if (triggerPlayer) {
    const otherMinScore = Math.min(
      ...room.state.players.filter(p => p.id !== triggerPlayerId).map(p => p.roundScore)
    );

    // If trigger player does NOT have strictly lowest score: their positive score is doubled!
    if (triggerPlayer.roundScore >= otherMinScore) {
      if (triggerPlayer.roundScore > 0) {
        const originalScore = triggerPlayer.roundScore;
        triggerPlayer.roundScore *= 2;
        addSystemMessage(
          roomCode,
          `⚠️ ${triggerPlayer.name} a terminé en premier mais n'a pas le score le plus bas ! Score doublé : ${originalScore} ➔ ${triggerPlayer.roundScore} pts !`
        );
      }
    }
  }

  // Update total scores
  room.state.players.forEach(p => {
    p.totalScore += p.roundScore;
  });

  // Check if any player reached target score (e.g., 100 points)
  const gameOver = room.state.players.some(p => p.totalScore >= room.state.targetScore);

  if (gameOver || room.state.targetScore === 1) {
    room.state.phase = 'game_over';
    // Winner is player with lowest total score
    let minScore = Infinity;
    let winnerId = room.state.players[0].id;
    room.state.players.forEach(p => {
      if (p.totalScore < minScore) {
        minScore = p.totalScore;
        winnerId = p.id;
      }
    });
    room.state.winnerId = winnerId;
    const winner = room.state.players.find(p => p.id === winnerId);
    addSystemMessage(roomCode, `🏆 Victoire de ${winner?.name || 'Joueur'} avec ${winner?.totalScore} points au total !`);
  } else {
    room.state.phase = 'round_ended';
    addSystemMessage(roomCode, `🏁 Manche ${room.state.roundNumber} terminée ! Consultez les scores.`);
  }

  broadcastRoom(roomCode);
}

function startNewRound(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const deck = generateSkyjoDeck();
  room.drawPile = deck;

  // Deal 12 cards to each player
  room.state.players.forEach(player => {
    player.cards = room.drawPile.splice(0, 12);
    player.revealedCount = 0;
    player.initialRevealedCount = 0;
    player.roundScore = 0;
    player.hasFinishedRound = false;
  });

  // 1 card to discard pile
  const initialDiscard = room.drawPile.pop()!;
  initialDiscard.isRevealed = true;
  room.state.discardPile = [initialDiscard];
  room.state.currentDrawnCard = null;
  room.state.turnAction = 'choose_source';
  room.state.finalRoundTriggeredBy = null;
  room.state.lastTurnPlayerIds = [];
  room.state.roundNumber += 1;
  room.state.phase = 'initial_revealing';

  addSystemMessage(roomCode, `🎲 Manche ${room.state.roundNumber} commencée ! Retournez 2 cartes chacun.`);
  broadcastRoom(roomCode);

  // If there are bots, have them reveal 2 cards automatically
  room.state.players.forEach(p => {
    if (p.isBot) {
      setTimeout(() => {
        botRevealInitial(roomCode, p.id);
      }, 500);
    }
  });
}

function botRevealInitial(roomCode: string, botId: string) {
  const room = rooms.get(roomCode);
  if (!room || room.state.phase !== 'initial_revealing') return;
  const bot = room.state.players.find(p => p.id === botId);
  if (!bot) return;

  // Pick 2 random cards to reveal
  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 2; i++) {
    const card = bot.cards[indices[i]];
    if (card) {
      card.isRevealed = true;
      bot.initialRevealedCount++;
      bot.revealedCount++;
    }
  }
  bot.roundScore = calculatePlayerScore(bot.cards, true);
  checkAllInitialRevealed(roomCode);
}

function checkAllInitialRevealed(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || room.state.phase !== 'initial_revealing') return;

  const allDone = room.state.players.every(p => p.initialRevealedCount >= 2);
  if (allDone) {
    // Player with highest initial sum starts
    let highestSum = -999;
    let starterIndex = 0;
    room.state.players.forEach((p, idx) => {
      const sum = calculatePlayerScore(p.cards, true);
      if (sum > highestSum) {
        highestSum = sum;
        starterIndex = idx;
      }
    });

    room.state.currentPlayerIndex = starterIndex;
    room.state.phase = 'playing';
    room.state.turnAction = 'choose_source';

    const starter = room.state.players[starterIndex];
    addSystemMessage(
      roomCode,
      `🎮 Tous les joueurs sont prêts ! ${starter.name} commence la manche avec un score initial de ${highestSum} pts.`
    );

    broadcastRoom(roomCode);
    triggerBotTurnIfNeeded(roomCode);
  } else {
    broadcastRoom(roomCode);
  }
}

// Socket.io handlers
io.on('connection', (socket: Socket) => {
  let currentRoomCode: string | null = null;
  let playerId: string | null = null;

  // Resilient context resolver: guarantees that any incoming player action immediately
  // recovers roomCode, player identity, and socket room subscription even if the connection dropped/reconnected.
  function getContext(data?: { roomCode?: string; playerId?: string; sessionToken?: string }) {
    let code = (data?.roomCode || currentRoomCode)?.toUpperCase().trim();
    let room = code ? rooms.get(code) : undefined;

    const pid = data?.playerId || playerId;
    const token = data?.sessionToken;

    // If room not found by code, look through active rooms for the player's sessionToken or playerId
    if (!room) {
      for (const [rCode, rData] of rooms.entries()) {
        const found = rData.state.players.find(p => !p.isBot && (
          (token && (p.sessionToken === token || p.id === token)) ||
          (pid && p.id === pid)
        ));
        if (found) {
          room = rData;
          code = rCode;
          break;
        }
      }
    }

    if (!room || !code) return { room: undefined, player: undefined, code: '' };

    let player = room.state.players.find(p => !p.isBot && (
      (token && (p.sessionToken === token || p.id === token)) ||
      (pid && p.id === pid)
    ));

    // Fallback: if only 1 human player exists in the room, it's them!
    if (!player) {
      const humans = room.state.players.filter(p => !p.isBot);
      if (humans.length === 1) {
        player = humans[0];
      }
    }

    if (player) {
      currentRoomCode = code;
      playerId = player.id;
      player.isConnected = true;
      socket.join(code);
    }

    return { room, player, code };
  }

  socket.on('ping_alive', (callback) => {
    if (typeof callback === 'function') {
      callback(true);
    }
  });

  socket.on('create_room', (data: { playerName: string; avatar?: string; targetScore?: number; sessionToken?: string }, callback) => {
    const code = generateRoomCode();
    const pid = data.sessionToken || socket.id;
    playerId = pid;
    currentRoomCode = code;

    const hostPlayer: Player = {
      id: pid,
      sessionToken: data.sessionToken || pid,
      name: data.playerName?.trim() || 'Hôte',
      avatar: data.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)],
      isHost: true,
      cards: [],
      revealedCount: 0,
      initialRevealedCount: 0,
      roundScore: 0,
      totalScore: 0,
      hasFinishedRound: false,
      isConnected: true,
    };

    const newGameState: GameState = {
      roomCode: code,
      phase: 'lobby',
      players: [hostPlayer],
      currentPlayerIndex: 0,
      drawPileCount: 0,
      discardPile: [],
      currentDrawnCard: null,
      turnAction: 'choose_source',
      roundNumber: 1,
      targetScore: data.targetScore || 100,
      finalRoundTriggeredBy: null,
      lastTurnPlayerIds: [],
      winnerId: null,
      historyLogs: [],
    };

    rooms.set(code, {
      state: newGameState,
      drawPile: [],
      chat: [],
      lastActive: Date.now(),
    });

    socket.join(code);
    addSystemMessage(code, `✨ Salon créé ! Code : ${code}`);

    callback({ success: true, roomCode: code, playerId: pid, state: newGameState });
  });

  socket.on('rejoin_room', (data: { roomCode?: string; playerId?: string; sessionToken?: string }, callback) => {
    const { room, player, code } = getContext(data);

    if (!room || !player) {
      if (callback) callback({ success: false, error: 'Salon introuvable ou expiré.' });
      return;
    }

    currentRoomCode = code;
    playerId = player.id;
    player.isConnected = true;
    socket.join(code);

    broadcastRoom(code);

    if (callback) {
      callback({
        success: true,
        roomCode: code,
        playerId: player.id,
        state: room.state,
        chat: room.chat,
      });
    }
  });

  socket.on('join_room', (data: { roomCode: string; playerName: string; avatar?: string; sessionToken?: string }, callback) => {
    const code = data.roomCode?.toUpperCase().trim();
    const room = rooms.get(code);

    if (!room) {
      return callback({ success: false, error: 'Salon introuvable. Vérifiez le code.' });
    }

    const pid = data.sessionToken || socket.id;

    // If player is already in room, seamlessly re-attach them
    const existingPlayer = room.state.players.find(p => p.id === pid || (data.sessionToken && p.sessionToken === data.sessionToken));
    if (existingPlayer) {
      existingPlayer.isConnected = true;
      playerId = existingPlayer.id;
      currentRoomCode = code;
      socket.join(code);
      broadcastRoom(code);
      return callback({ success: true, roomCode: code, playerId: existingPlayer.id, state: room.state, chat: room.chat });
    }

    if (room.state.phase !== 'lobby') {
      return callback({ success: false, error: 'La partie est déjà en cours dans ce salon.' });
    }

    if (room.state.players.length >= 8) {
      return callback({ success: false, error: 'Le salon est complet (max 8 joueurs).' });
    }

    playerId = pid;
    currentRoomCode = code;

    const newPlayer: Player = {
      id: pid,
      sessionToken: data.sessionToken || pid,
      name: data.playerName?.trim() || `Joueur ${room.state.players.length + 1}`,
      avatar: data.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)],
      isHost: false,
      cards: [],
      revealedCount: 0,
      initialRevealedCount: 0,
      roundScore: 0,
      totalScore: 0,
      hasFinishedRound: false,
      isConnected: true,
    };

    room.state.players.push(newPlayer);
    socket.join(code);

    addSystemMessage(code, `👋 ${newPlayer.name} a rejoint le salon !`);
    broadcastRoom(code);

    callback({ success: true, roomCode: code, playerId: pid, state: room.state, chat: room.chat });
  });

  socket.on('add_bot', (callback) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state.phase !== 'lobby' || room.state.players.length >= 8) return;

    const botNames = ['Bot Max', 'Bot Léa', 'Bot Hugo', 'Bot Zoé', 'Bot Sam'];
    const botId = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const botName = botNames[room.state.players.length % botNames.length];

    const botPlayer: Player = {
      id: botId,
      name: botName,
      avatar: '🤖',
      isHost: false,
      isBot: true,
      cards: [],
      revealedCount: 0,
      initialRevealedCount: 0,
      roundScore: 0,
      totalScore: 0,
      hasFinishedRound: false,
      isConnected: true,
    };

    room.state.players.push(botPlayer);
    addSystemMessage(currentRoomCode, `🤖 ${botName} a été ajouté à la partie !`);
    broadcastRoom(currentRoomCode);
    if (callback) callback({ success: true });
  });

  socket.on('remove_bot', (data: { botId: string }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state.phase !== 'lobby') return;
    const bot = room.state.players.find(p => p.id === data.botId && p.isBot);
    if (bot) {
      room.state.players = room.state.players.filter(p => p.id !== data.botId);
      addSystemMessage(currentRoomCode, `🤖 ${bot.name} a quitté le salon.`);
      broadcastRoom(currentRoomCode);
    }
  });

  socket.on('update_settings', (data: { targetScore: number }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state.phase !== 'lobby') return;
    room.state.targetScore = data.targetScore;
    broadcastRoom(currentRoomCode);
  });

  socket.on('start_game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state.phase !== 'lobby' || room.state.players.length < 2) return;

    startNewRound(currentRoomCode);
  });

  socket.on('reveal_initial_card', (data: { cardIndex: number; roomCode?: string; playerId?: string; sessionToken?: string }) => {
    const { room, player, code } = getContext(data);
    if (!room || !player || room.state.phase !== 'initial_revealing') return;
    if (player.initialRevealedCount >= 2) return;

    const card = player.cards[data.cardIndex];
    if (card && !card.isRevealed) {
      card.isRevealed = true;
      player.initialRevealedCount++;
      player.revealedCount++;
      player.roundScore = calculatePlayerScore(player.cards, true);
      checkAllInitialRevealed(code);
    }
  });

  socket.on('draw_card', (data?: { roomCode?: string; playerId?: string; sessionToken?: string }) => {
    const { room, player, code } = getContext(data);
    if (!room || !player || room.state.phase !== 'playing') return;

    const activePlayer = room.state.players[room.state.currentPlayerIndex];
    if (!activePlayer || activePlayer.id !== player.id || room.state.turnAction !== 'choose_source') return;

    if (room.drawPile.length === 0) {
      recycleDiscardPile(room);
    }

    const card = room.drawPile.pop();
    if (!card) return;

    card.isRevealed = true;
    room.state.currentDrawnCard = card;
    room.state.turnAction = 'drawn_card_choice';

    broadcastRoom(code);
  });

  socket.on('take_discard', (data?: { roomCode?: string; playerId?: string; sessionToken?: string }) => {
    const { room, player, code } = getContext(data);
    if (!room || !player || room.state.phase !== 'playing') return;

    const activePlayer = room.state.players[room.state.currentPlayerIndex];
    if (!activePlayer || activePlayer.id !== player.id || room.state.turnAction !== 'choose_source') return;

    const top = room.state.discardPile.pop();
    if (!top) return;

    room.state.currentDrawnCard = top;
    room.state.turnAction = 'discard_choice';

    broadcastRoom(code);
  });

  socket.on('swap_card', (data: { cardIndex: number; roomCode?: string; playerId?: string; sessionToken?: string }) => {
    const { room, player, code } = getContext(data);
    if (!room || !player) return;
    handleSwap(code, player.id, data.cardIndex);
  });

  socket.on('discard_and_flip', (data: { flipIndex: number; roomCode?: string; playerId?: string; sessionToken?: string }) => {
    const { room, player, code } = getContext(data);
    if (!room || !player) return;
    handleDiscardAndFlip(code, player.id, data.flipIndex);
  });

  socket.on('next_round', (data?: { roomCode?: string; playerId?: string; sessionToken?: string }) => {
    const { room, code } = getContext(data);
    if (!room || room.state.phase !== 'round_ended') return;

    startNewRound(code);
  });

  socket.on('restart_game', (data?: { roomCode?: string; playerId?: string; sessionToken?: string }) => {
    const { room, code } = getContext(data);
    if (!room) return;

    room.state.phase = 'lobby';
    room.state.roundNumber = 1;
    room.state.winnerId = null;
    room.state.players.forEach(p => {
      p.totalScore = 0;
      p.roundScore = 0;
      p.cards = [];
      p.revealedCount = 0;
      p.initialRevealedCount = 0;
      p.hasFinishedRound = false;
    });

    addSystemMessage(code, `🔄 La partie a été réinitialisée par l'hôte.`);
    broadcastRoom(code);
  });

  socket.on('send_chat', (data: { text: string; roomCode?: string; playerId?: string; sessionToken?: string }) => {
    const { room, player, code } = getContext(data);
    if (!room || !player) return;

    const trimmed = data.text?.trim();
    if (!trimmed) return;

    const msg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  socket.on('disconnect', () => {
    if (currentRoomCode && playerId) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        const player = room.state.players.find(p => p.id === playerId);
        if (player) {
          player.isConnected = false;
          broadcastRoom(currentRoomCode);
        }
      }
    }
  });
});

// Configure Vite middleware in development or serve static in production
async function startServer() {
  console.log(`🚀 JoSky starting up (PORT=${PORT}, NODE_ENV=${process.env.NODE_ENV || 'development'})...`);
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || hasDist;

  if (isProd && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('📦 Serving production static build from dist/');
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('⚡ Serving development mode with Vite middleware');
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ JoSky server listening on 0.0.0.0:${PORT}`);
  });
}

// Graceful shutdown handling for container restarts on Render
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed cleanly');
    process.exit(0);
  });
});

startServer();

