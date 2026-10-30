import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from './services/socket';
import { GameState, ChatMessage, Player } from './types/game';
import { sound } from './utils/audio';
import { Header } from './components/Header';
import { LobbyView } from './components/LobbyView';
import { PlayerBoard } from './components/PlayerBoard';
import { OpponentList } from './components/OpponentList';
import { CenterTable } from './components/CenterTable';
import { ActionBanner } from './components/ActionBanner';
import { ChatDrawer } from './components/ChatDrawer';
import { RulesModal } from './components/RulesModal';
import { RoundSummaryModal } from './components/RoundSummaryModal';
import { GameOverModal } from './components/GameOverModal';
import { AlertCircle } from 'lucide-react';

function getPlayerSessionToken(): string {
  try {
    let token = localStorage.getItem('josky_player_session_token');
    if (!token) {
      token = `p_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('josky_player_session_token', token);
    }
    return token;
  } catch {
    return `p_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export default function App() {
  const [socket, setSocket] = useState(getSocket);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>(() => {
    try {
      return localStorage.getItem('josky_player_id') || '';
    } catch {
      return '';
    }
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [discardAndFlipMode, setDiscardAndFlipMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  const myPlayerIdRef = useRef(myPlayerId);
  const roomCodeRef = useRef(gameState?.roomCode || '');
  myPlayerIdRef.current = myPlayerId;
  roomCodeRef.current = gameState?.roomCode || '';

  // Clear any stale room on fresh page load or manual URL refresh so user starts at the menu
  useEffect(() => {
    try {
      localStorage.removeItem('josky_room_code');
    } catch {}

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam.toUpperCase().trim());
    }
  }, []);

  // Socket event setup with automatic mobile resume
  useEffect(() => {
    const s = getSocket();
    setSocket(s);

    const tryRejoin = (forceReconnect = false) => {
      const room = roomCodeRef.current;
      // If at menu (no active game in session), do not auto-rejoin
      if (!room) return;

      const pid = myPlayerIdRef.current;
      const token = getPlayerSessionToken();

      if (forceReconnect || !s.connected) {
        s.disconnect();
        s.connect();
      }

      let ackReceived = false;
      const watchdog = setTimeout(() => {
        // If socket was stalled/dead in background, force re-establish
        if (!ackReceived && room) {
          s.disconnect();
          s.connect();
        }
      }, 1500);

      s.emit('rejoin_room', { roomCode: room, playerId: pid, sessionToken: token }, (res: any) => {
        ackReceived = true;
        clearTimeout(watchdog);
        if (res && res.success && res.state) {
          setGameState(res.state);
          if (res.playerId) {
            setMyPlayerId(res.playerId);
            try {
              localStorage.setItem('josky_player_id', res.playerId);
            } catch {}
          }
          if (res.chat) setChatMessages(res.chat);
        }
      });
    };

    s.on('connect', () => {
      tryRejoin(false);
    });

    // Handle user switching apps on mobile / phone screen wake up
    const handleWakeup = () => {
      tryRejoin(!s.connected);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleWakeup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWakeup);
    window.addEventListener('pageshow', handleWakeup);

    s.on('game_state_update', (newState: GameState) => {
      setGameState((prevState) => {
        const prevPlayer = prevState ? prevState.players[prevState.currentPlayerIndex] : null;
        const newPlayer = newState.players[newState.currentPlayerIndex];
        const currentPid = myPlayerIdRef.current;

        if (
          newState.phase === 'playing' &&
          newPlayer &&
          newPlayer.id === currentPid &&
          (!prevPlayer || prevPlayer.id !== currentPid)
        ) {
          sound.yourTurn();
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
              navigator.vibrate(100);
            } catch {
              // Ignore if vibrate is restricted
            }
          }
        }

        // If turn ended or changed, reset discardAndFlipMode
        if (prevState && prevState.currentPlayerIndex !== newState.currentPlayerIndex) {
          setDiscardAndFlipMode(false);
        }

        return newState;
      });
    });

    s.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);

      if (msg.text.includes('éliminé une colonne')) {
        sound.columnEliminate();
      }

      setIsChatOpen((open) => {
        if (!open && !msg.isSystem) {
          setUnreadChatCount((count) => count + 1);
          sound.chatPing();
        }
        return open;
      });
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWakeup);
      window.removeEventListener('pageshow', handleWakeup);
      s.off('connect');
      s.off('game_state_update');
      s.off('chat_message');
    };
  }, []);

  const clearError = () => setErrorMessage(null);

  // Lobby actions
  const handleCreateRoom = (playerName: string, avatar: string, targetScore: number) => {
    clearError();
    const sessionToken = getPlayerSessionToken();
    socket.emit(
      'create_room',
      { playerName, avatar, targetScore, sessionToken },
      (res: { success: boolean; roomCode?: string; playerId?: string; state?: GameState; error?: string }) => {
        if (res.success && res.state && res.playerId) {
          setMyPlayerId(res.playerId);
          setGameState(res.state);
          try {
            localStorage.setItem('josky_player_id', res.playerId);
          } catch {}
        } else {
          setErrorMessage(res.error || 'Erreur lors de la création du salon.');
        }
      }
    );
  };

  const handleJoinRoom = (roomCode: string, playerName: string, avatar: string) => {
    clearError();
    const sessionToken = getPlayerSessionToken();
    socket.emit(
      'join_room',
      { roomCode, playerName, avatar, sessionToken },
      (res: { success: boolean; roomCode?: string; playerId?: string; state?: GameState; chat?: ChatMessage[]; error?: string }) => {
        if (res.success && res.state && res.playerId) {
          setMyPlayerId(res.playerId);
          setGameState(res.state);
          try {
            localStorage.setItem('josky_player_id', res.playerId);
          } catch {}
          if (res.chat) {
            setChatMessages(res.chat);
          }
        } else {
          setErrorMessage(res.error || 'Impossible de rejoindre le salon.');
        }
      }
    );
  };

  const handleAddBot = () => {
    socket.emit('add_bot');
  };

  const handleRemoveBot = (botId: string) => {
    socket.emit('remove_bot', { botId });
  };

  const handleUpdateSettings = (targetScore: number) => {
    socket.emit('update_settings', { targetScore });
  };

  const handleStartGame = () => {
    socket.emit('start_game');
  };

  const handleLeaveRoom = () => {
    try {
      localStorage.removeItem('josky_room_code');
      localStorage.removeItem('josky_player_id');
    } catch {}
    setGameState(null);
    setChatMessages([]);
    setDiscardAndFlipMode(false);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const getActionContext = () => ({
    roomCode: gameState?.roomCode || roomCodeRef.current || '',
    playerId: myPlayer?.id || myPlayerIdRef.current || localStorage.getItem('josky_player_id') || '',
    sessionToken: getPlayerSessionToken(),
  });

  // Game actions
  const handleDrawCard = () => {
    sound.cardFlip();
    socket.emit('draw_card', getActionContext());
  };

  const handleTakeDiscard = () => {
    sound.cardPlace();
    socket.emit('take_discard', getActionContext());
  };

  const handleCardClick = (cardIndex: number) => {
    if (!gameState) return;
    const ctx = getActionContext();

    if (gameState.phase === 'initial_revealing') {
      if (myPlayer && myPlayer.initialRevealedCount >= 2) {
        setErrorMessage("⏳ Vous avez déjà retourné vos 2 cartes. En attente des autres joueurs...");
        return;
      }
      const card = myPlayer?.cards[cardIndex];
      if (card && card.isRevealed) {
        setErrorMessage("👉 Touchez une carte face cachée pour la retourner !");
        return;
      }
      sound.cardFlip();
      socket.emit('reveal_initial_card', { cardIndex, ...ctx });
      return;
    }

    if (gameState.phase === 'playing') {
      const activePlayer = gameState.players[gameState.currentPlayerIndex];
      const effectiveId = myPlayer?.id || myPlayerId;
      const isMyTurnNow = Boolean(activePlayer && effectiveId && activePlayer.id === effectiveId);

      if (!isMyTurnNow) {
        sound.error();
        setErrorMessage(`⌛ Ce n'est pas votre tour ! C'est à ${activePlayer?.name || 'l\'adversaire'} de jouer.`);
        return;
      }

      if (gameState.turnAction === 'choose_source') {
        sound.error();
        setErrorMessage("👉 Touchez la Pioche (à gauche) ou la Défausse (à droite) pour commencer votre coup !");
        return;
      }

      if (discardAndFlipMode) {
        const target = myPlayer?.cards[cardIndex];
        if (target && target.isRevealed) {
          setErrorMessage("👉 Choisissez une carte face cachée pour la retourner !");
          return;
        }
        sound.cardFlip();
        socket.emit('discard_and_flip', { flipIndex: cardIndex, ...ctx });
        setDiscardAndFlipMode(false);
      } else {
        sound.cardPlace();
        socket.emit('swap_card', { cardIndex, ...ctx });
      }
    }
  };

  const handleToggleDiscardAndFlip = () => {
    setDiscardAndFlipMode(true);
  };

  const handleCancelDiscardAndFlip = () => {
    setDiscardAndFlipMode(false);
  };

  const handleNextRound = () => {
    socket.emit('next_round', getActionContext());
  };

  const handleRestartGame = () => {
    socket.emit('restart_game', getActionContext());
  };

  const handleSendMessage = (text: string) => {
    socket.emit('send_chat', { text, ...getActionContext() });
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      const next = !prev;
      if (next) setUnreadChatCount(0);
      return next;
    });
  };

  const sessionToken = getPlayerSessionToken();

  // Find active player & self with multi-layered auto-healing detection
  const myPlayer = 
    gameState?.players.find((p) => !p.isBot && (p.id === myPlayerId || (p.sessionToken && p.sessionToken === sessionToken) || p.id === sessionToken)) ||
    (gameState?.players.filter((p) => !p.isBot).length === 1 ? gameState?.players.find((p) => !p.isBot) : undefined);

  // Keep myPlayerId state and localStorage in sync if auto-recovered
  useEffect(() => {
    if (myPlayer && myPlayer.id && myPlayer.id !== myPlayerId) {
      setMyPlayerId(myPlayer.id);
      try {
        localStorage.setItem('josky_player_id', myPlayer.id);
      } catch {}
    }
  }, [myPlayer, myPlayerId]);

  const activePlayer = gameState ? gameState.players[gameState.currentPlayerIndex] : undefined;
  const isMyTurn = Boolean(activePlayer && myPlayer && activePlayer.id === myPlayer.id);
  const isHost = Boolean(myPlayer?.isHost);

  // Opponents are ALL other players in the room EXCEPT self (never show self in opponents)
  const myEffectiveId = myPlayer?.id || myPlayerId;
  const opponents = (gameState?.players || []).filter((p) => myEffectiveId ? p.id !== myEffectiveId : false);

  const isPlaying = Boolean(gameState && gameState.phase !== 'lobby');

  return (
    <div className={`w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none ${
      isPlaying ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen overflow-x-hidden'
    }`}>
      {/* Top Header */}
      <Header
        roomCode={gameState?.roomCode || ''}
        roundNumber={gameState?.roundNumber || 1}
        targetScore={gameState?.targetScore || 100}
        unreadChatCount={unreadChatCount}
        onToggleChat={handleToggleChat}
        onOpenRules={() => setIsRulesOpen(true)}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Error notification banner */}
      {errorMessage && (
        <div className="w-full bg-rose-500/20 border-b border-rose-500/40 text-rose-200 px-3 py-1.5 text-xs sm:text-sm font-semibold flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-xs text-rose-300 hover:text-white underline cursor-pointer ml-2 flex-shrink-0"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full max-w-4xl mx-auto flex flex-col min-h-0 ${
        isPlaying ? 'justify-between p-1 xs:p-1.5 sm:p-2.5 overflow-hidden' : 'justify-start p-2 sm:p-4 overflow-y-auto'
      }`}>
        {!gameState || gameState.phase === 'lobby' ? (
          <LobbyView
            gameState={gameState}
            currentUserId={myPlayerId}
            isHost={isHost}
            initialRoomCode={initialRoomCode}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onAddBot={handleAddBot}
            onRemoveBot={handleRemoveBot}
            onUpdateSettings={handleUpdateSettings}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
            onOpenRules={() => setIsRulesOpen(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col justify-between gap-1 xs:gap-1.5 min-h-0">
            {/* Top Table Area: Opponents and Center Draw/Discard Table */}
            <div className="flex flex-col gap-1 xs:gap-1.5 flex-shrink-0 w-full">
              {/* Opponents Mini Strip */}
              {opponents.length > 0 && (
                <OpponentList
                  opponents={opponents}
                  currentPlayerIndex={gameState.currentPlayerIndex}
                  allPlayers={gameState.players}
                  gamePhase={gameState.phase}
                />
              )}

              {/* Center Table: Draw Pile & Discard Pile */}
              <CenterTable
                drawPileCount={gameState.drawPileCount}
                topDiscard={gameState.discardPile[gameState.discardPile.length - 1] || null}
                currentDrawnCard={gameState.currentDrawnCard}
                turnAction={gameState.turnAction}
                gamePhase={gameState.phase}
                isMyTurn={isMyTurn}
                onDrawCard={handleDrawCard}
                onTakeDiscard={handleTakeDiscard}
              />
            </div>

            {/* Modern Interactive Action Banner */}
            <ActionBanner
              gamePhase={gameState.phase}
              turnAction={gameState.turnAction}
              isMyTurn={isMyTurn}
              activePlayer={activePlayer}
              myPlayer={myPlayer}
              currentDrawnCard={gameState.currentDrawnCard}
              discardAndFlipMode={discardAndFlipMode}
              finalRoundTriggeredBy={gameState.finalRoundTriggeredBy}
              players={gameState.players}
              onToggleDiscardAndFlip={handleToggleDiscardAndFlip}
              onCancelDiscardAndFlip={handleCancelDiscardAndFlip}
            />

            {/* Active User's Board (Optimized, comfortable, perfectly fitted) */}
            {myPlayer && (
              <div className="w-full flex-1 min-h-0 flex flex-col justify-end items-center pb-0.5">
                <PlayerBoard
                  player={myPlayer}
                  isCurrentPlayer={isMyTurn}
                  isSelf={true}
                  gamePhase={gameState.phase}
                  turnAction={gameState.turnAction}
                  discardAndFlipMode={discardAndFlipMode}
                  onCardClick={handleCardClick}
                  mode="full"
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Real-time Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        currentUserId={myPlayerId}
        onSendMessage={handleSendMessage}
      />

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* Round Summary Modal */}
      {gameState && gameState.phase === 'round_ended' && (
        <RoundSummaryModal
          gameState={gameState}
          isHost={isHost}
          onNextRound={handleNextRound}
        />
      )}

      {/* Game Over Modal */}
      {gameState && gameState.phase === 'game_over' && (
        <GameOverModal
          gameState={gameState}
          isHost={isHost}
          onRestart={handleRestartGame}
        />
      )}
    </div>
  );
}
