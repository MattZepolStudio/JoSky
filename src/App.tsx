import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from './services/socket';
import { BotLevel, GameState, ChatMessage } from './types/game';
import { sound } from './utils/audio';
import { recordFinishedGame } from './utils/stats';
import { deriveCardMoves, deriveEliminatedColumns, deriveLastRoundTrigger } from './utils/cardMoves';
import { getTutorialStep } from './utils/tutorial';
import { CardFlight, CardFlightLayer, findCardAnchor } from './components/CardFlightLayer';
import { FloatingEffect, ReactionLayer } from './components/ReactionLayer';
import { TutorialBubble } from './components/TutorialBubble';
import { Header } from './components/Header';
import { LobbyView } from './components/LobbyView';
import { PlayerBoard } from './components/PlayerBoard';
import { OpponentList } from './components/OpponentList';
import { CenterTable } from './components/CenterTable';
import { ChatDrawer } from './components/ChatDrawer';
import { ChatBubbles } from './components/ChatBubbles';
import { RulesModal } from './components/RulesModal';
import { RoundSummaryModal } from './components/RoundSummaryModal';
import { GameOverModal } from './components/GameOverModal';
import { AlertCircle } from 'lucide-react';

const MAX_CHAT_BUBBLES = 2;
const CHAT_BUBBLE_MS = 4000;

let memorySessionToken = '';

function createSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Secret proving who this browser is: it must never appear in the game state
function getPlayerSessionToken(): string {
  try {
    let token = localStorage.getItem('josky_session_secret');
    if (!token) {
      token = createSessionToken();
      localStorage.setItem('josky_session_secret', token);
    }
    return token;
  } catch {
    memorySessionToken = memorySessionToken || createSessionToken();
    return memorySessionToken;
  }
}

function getSavedRoomCode(): string {
  try {
    const saved = localStorage.getItem('josky_room_code') || '';
    const invited = new URLSearchParams(window.location.search).get('room')?.toUpperCase().trim();
    return invited && invited !== saved ? '' : saved;
  } catch {
    return '';
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
  const [chatBubbles, setChatBubbles] = useState<ChatMessage[]>([]);
  const [isChatMuted, setIsChatMuted] = useState(() => {
    try {
      return localStorage.getItem('josky_chat_muted') === 'true';
    } catch {
      return false;
    }
  });
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [discardAndFlipMode, setDiscardAndFlipMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number | null>(null);
  const [cardFlights, setCardFlights] = useState<CardFlight[]>([]);
  const [floatingEffects, setFloatingEffects] = useState<FloatingEffect[]>([]);
  const [isTutorialDone, setIsTutorialDone] = useState(() => {
    try {
      return localStorage.getItem('josky_tutorial_done') === 'true';
    } catch {
      return true;
    }
  });

  const myPlayerIdRef = useRef(myPlayerId);
  const lastStateRef = useRef<GameState | null>(null);
  const isChatOpenRef = useRef(isChatOpen);
  const isChatMutedRef = useRef(isChatMuted);
  isChatOpenRef.current = isChatOpen;
  isChatMutedRef.current = isChatMuted;
  const nextFlightIdRef = useRef(0);
  const savedRoomCodeRef = useRef(getSavedRoomCode());
  const roomCodeRef = useRef('');
  myPlayerIdRef.current = myPlayerId;
  roomCodeRef.current = gameState?.roomCode || savedRoomCodeRef.current;

  useEffect(() => {
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

      s.emit('rejoin_room', { roomCode: room, sessionToken: token }, (res: any) => {
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
        } else if (res && !res.success) {
          // The room no longer exists: go back to the menu instead of staying frozen
          savedRoomCodeRef.current = '';
          try {
            localStorage.removeItem('josky_room_code');
          } catch {}
          setGameState((current) => {
            if (current) setErrorMessage('Cette partie est terminée ou a expiré.');
            return null;
          });
          setChatMessages([]);
        }
      });
    };

    if (s.connected) tryRejoin(false);

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

    const addFloatingEffect = (effect: Omit<FloatingEffect, 'id'>) => {
      setFloatingEffects((current) => [...current, { ...effect, id: nextFlightIdRef.current++ }]);
    };

    // Runs before React renders the new state, so the departure positions are still on screen
    const startCardFlights = (newState: GameState) => {
      const prev = lastStateRef.current;
      lastStateRef.current = newState;

      const lastRoundTrigger = deriveLastRoundTrigger(prev, newState);
      if (lastRoundTrigger) {
        const trigger = newState.players.find((p) => p.id === lastRoundTrigger);
        sound.yourTurn();
        addFloatingEffect({
          playerId: lastRoundTrigger,
          text: lastRoundTrigger === myPlayerIdRef.current ? 'Dernier tour pour les autres !' : `Dernier tour ! ${trigger?.name ?? ''}`,
          kind: 'announce',
        });
      }

      deriveEliminatedColumns(prev, newState).forEach((playerId) => {
        sound.columnEliminate();
        addFloatingEffect({ playerId, text: 'Colonne éliminée !', kind: 'banner' });
      });

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const flights = deriveCardMoves(prev, newState).flatMap(({ card, from, to, delayMs }) => {
        const fromRect = findCardAnchor(from)?.getBoundingClientRect();
        return fromRect ? [{ id: nextFlightIdRef.current++, card, fromRect, to, delayMs }] : [];
      });
      if (flights.length > 0) setCardFlights((current) => [...current, ...flights]);
    };

    s.on('game_state_update', (newState: GameState) => {
      startCardFlights(newState);
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

    s.on('player_reaction', ({ playerId, emoji }: { playerId: string; emoji: string }) => {
      if (isChatMutedRef.current && playerId !== myPlayerIdRef.current) return;
      addFloatingEffect({ playerId, text: emoji, kind: 'reaction' });
    });

    s.on('action_rejected', (message: string) => {
      sound.error();
      setErrorMessage(message);
    });

    s.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);

      if (isChatOpenRef.current || msg.isSystem) return;
      setUnreadChatCount((count) => count + 1);
      if (isChatMutedRef.current || msg.senderId === myPlayerIdRef.current) return;

      sound.chatPing();
      setChatBubbles((current) => [...current.slice(-(MAX_CHAT_BUBBLES - 1)), msg]);
      setTimeout(() => {
        setChatBubbles((current) => current.filter((bubble) => bubble.id !== msg.id));
      }, CHAT_BUBBLE_MS);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWakeup);
      window.removeEventListener('pageshow', handleWakeup);
      s.off('connect');
      s.off('game_state_update');
      s.off('action_rejected');
      s.off('player_reaction');
      s.off('chat_message');
    };
  }, []);

  const clearError = () => setErrorMessage(null);

  // Remember the room so a page refresh brings the player back to their seat
  const activeRoomCode = gameState?.roomCode;
  useEffect(() => {
    if (!activeRoomCode) return;
    savedRoomCodeRef.current = activeRoomCode;
    try {
      localStorage.setItem('josky_room_code', activeRoomCode);
    } catch {}
  }, [activeRoomCode]);

  // Local countdown started from the time left sent by the server, immune to clock differences
  useEffect(() => {
    const remaining = gameState?.turnEndsInMs ?? null;
    if (remaining === null) {
      setTurnSecondsLeft(null);
      return;
    }
    const endsAt = Date.now() + remaining;
    const update = () => setTurnSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [gameState]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Lobby actions
  const handleCreateRoom = (playerName: string, avatar: string, targetScore: number, solo = false) => {
    clearError();
    const sessionToken = getPlayerSessionToken();
    socket.emit(
      'create_room',
      { playerName, avatar, targetScore, sessionToken },
      (res: { success: boolean; roomCode?: string; playerId?: string; state?: GameState; chat?: ChatMessage[]; error?: string }) => {
        if (res.success && res.state && res.playerId) {
          setMyPlayerId(res.playerId);
          setGameState(res.state);
          if (res.chat) setChatMessages(res.chat);
          try {
            localStorage.setItem('josky_player_id', res.playerId);
          } catch {}
          if (solo) {
            socket.emit('add_bot', { level: 'normal' });
            socket.emit('start_game');
          }
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

  const handleAddBot = (level: BotLevel) => {
    socket.emit('add_bot', { level });
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
    socket.emit('leave_room', getActionContext());
    savedRoomCodeRef.current = '';
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

  const handleTutorialDone = (isDone: boolean) => {
    setIsTutorialDone(isDone);
    try {
      localStorage.setItem('josky_tutorial_done', String(isDone));
    } catch {}
  };

  const handleReaction = (emoji: string) => {
    socket.emit('send_reaction', { emoji, ...getActionContext() });
  };

  const handleFloatingEffectDone = (id: number) => {
    setFloatingEffects((current) => current.filter((effect) => effect.id !== id));
  };

  const handleSendMessage = (text: string) => {
    socket.emit('send_chat', { text, ...getActionContext() });
  };

  const handleCardFlightDone = (id: number) => {
    setCardFlights((current) => current.filter((flight) => flight.id !== id));
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      const next = !prev;
      if (next) {
        setUnreadChatCount(0);
        setChatBubbles([]);
      }
      return next;
    });
  };

  const handleToggleChatMute = () => {
    setIsChatMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('josky_chat_muted', String(next));
      } catch {}
      if (next) setChatBubbles([]);
      return next;
    });
  };

  const myPlayer = gameState?.players.find((p) => p.id === myPlayerId);

  useEffect(() => {
    if (gameState?.phase === 'game_over' && myPlayerId) {
      recordFinishedGame(gameState, myPlayerId);
    }
  }, [gameState, myPlayerId]);

  const activePlayer = gameState ? gameState.players[gameState.currentPlayerIndex] : undefined;
  const isMyTurn = Boolean(activePlayer && myPlayer && activePlayer.id === myPlayer.id);
  const isHost = Boolean(myPlayer?.isHost);

  // Opponents are ALL other players in the room EXCEPT self (never show self in opponents)
  const myEffectiveId = myPlayer?.id || myPlayerId;
  const opponents = (gameState?.players || []).filter((p) => myEffectiveId ? p.id !== myEffectiveId : false);

  const isPlaying = Boolean(gameState && gameState.phase !== 'lobby');

  const tutorialStep = isTutorialDone ? null : getTutorialStep(gameState, myPlayer, isMyTurn, discardAndFlipMode);

  // In the waiting room, the chat only makes sense once someone else can read it
  const hasOtherHuman = opponents.some((p) => !p.isBot);
  const canChat = isPlaying || hasOtherHuman;

  useEffect(() => {
    if (!canChat) setIsChatOpen(false);
  }, [canChat]);

  return (
    <div className="w-full text-felt-100 flex flex-col font-sans select-none h-[100dvh] max-h-[100dvh] overflow-hidden">
      {/* Top Header */}
      <Header
        roomCode={gameState?.roomCode || ''}
        roundNumber={gameState?.roundNumber || 1}
        targetScore={gameState?.targetScore || 100}
        unreadChatCount={unreadChatCount}
        showChat={canChat}
        isPlaying={isPlaying}
        hasOtherHuman={hasOtherHuman}
        onToggleChat={handleToggleChat}
        onOpenRules={() => setIsRulesOpen(true)}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Floating non-blocking toast (Zero layout shift) */}
      {errorMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-fade-in">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-felt-900/95 border border-amber-500/70 shadow-2xl shadow-black/80 text-amber-300 text-xs font-bold backdrop-blur-md">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-pulse" />
            <span className="truncate max-w-[80vw]">{errorMessage}</span>
          </div>
        </div>
      )}


      {/* Main Content Area */}
      <main className={`flex-1 w-full max-w-full sm:max-w-lg mx-auto flex flex-col min-h-0 ${
        isPlaying ? 'p-1 xs:p-1.5 overflow-hidden' : 'p-2 sm:p-4 overflow-y-auto'
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
          <div className="w-full flex-1 flex flex-col justify-between items-center gap-1 min-h-0 overflow-hidden">
            {/* Opponent Section (Top) */}
            {opponents.length > 0 && (
              <div className="opponents-area w-full flex-1 min-h-0 flex justify-center">
                <OpponentList
                  opponents={opponents}
                  currentPlayerIndex={gameState.currentPlayerIndex}
                  allPlayers={gameState.players}
                  gamePhase={gameState.phase}
                />
              </div>
            )}

            {/* Center Table: Draw Pile, Integrated Modern Turn Pill, Discard Pile */}
            <CenterTable
              drawPileCount={gameState.drawPileCount}
              topDiscard={gameState.discardPile[gameState.discardPile.length - 1] || null}
              currentDrawnCard={gameState.currentDrawnCard}
              turnAction={gameState.turnAction}
              gamePhase={gameState.phase}
              isMyTurn={isMyTurn}
              activePlayer={activePlayer}
              myPlayer={myPlayer}
              discardAndFlipMode={discardAndFlipMode}
              finalRoundTriggeredBy={gameState.finalRoundTriggeredBy}
              turnSecondsLeft={turnSecondsLeft}
              onDrawCard={handleDrawCard}
              onTakeDiscard={handleTakeDiscard}
              onToggleDiscardAndFlip={handleToggleDiscardAndFlip}
              onCancelDiscardAndFlip={handleCancelDiscardAndFlip}
            />

            {/* Active User's Board (Matt) - Maximum comfort, priority visual presence, full width */}
            {myPlayer && (
              <div className="w-full flex-shrink min-h-0 pb-1 flex justify-center">
                <PlayerBoard
                  player={myPlayer}
                  isCurrentPlayer={isMyTurn}
                  isSelf={true}
                  gamePhase={gameState.phase}
                  turnAction={gameState.turnAction}
                  discardAndFlipMode={discardAndFlipMode}
                  onCardClick={handleCardClick}
                  mode="full"
                  tightRows={opponents.length >= 3}
                  onReact={handleReaction}
                />
              </div>
            )}
          </div>
        )}
      </main>


      <CardFlightLayer flights={cardFlights} onDone={handleCardFlightDone} />
      <ReactionLayer effects={floatingEffects} onDone={handleFloatingEffectDone} />
      <ChatBubbles messages={chatBubbles} onOpenChat={handleToggleChat} />
      {tutorialStep && <TutorialBubble step={tutorialStep} onFinish={() => handleTutorialDone(true)} />}

      {/* Real-time Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        currentUserId={myPlayerId}
        isMuted={isChatMuted}
        onToggleMute={handleToggleChatMute}
        onSendMessage={handleSendMessage}
      />

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        onReplayTutorial={() => {
          handleTutorialDone(false);
          setIsRulesOpen(false);
        }}
      />

      {/* Round Summary Modal */}
      {gameState && gameState.phase === 'round_ended' && (
        <RoundSummaryModal
          gameState={gameState}
          currentUserId={myPlayerId}
          isHost={isHost}
          onNextRound={handleNextRound}
        />
      )}

      {/* Game Over Modal */}
      {gameState && gameState.phase === 'game_over' && (
        <GameOverModal
          gameState={gameState}
          currentUserId={myPlayerId}
          isHost={isHost}
          onRestart={handleRestartGame}
        />
      )}
    </div>
  );
}
