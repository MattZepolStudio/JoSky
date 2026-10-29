import React, { useState, useEffect, useCallback } from 'react';
import { getSocket } from './services/socket';
import { GameState, ChatMessage, Player } from './types/game';
import { sound } from './utils/audio';
import { Header } from './components/Header';
import { LobbyView } from './components/LobbyView';
import { PlayerBoard } from './components/PlayerBoard';
import { OpponentList } from './components/OpponentList';
import { CenterTable } from './components/CenterTable';
import { ChatDrawer } from './components/ChatDrawer';
import { RulesModal } from './components/RulesModal';
import { RoundSummaryModal } from './components/RoundSummaryModal';
import { GameOverModal } from './components/GameOverModal';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [socket, setSocket] = useState(getSocket);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [discardAndFlipMode, setDiscardAndFlipMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  // Read URL query params on mount for 1-tap invite link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam.toUpperCase().trim());
    }
  }, []);

  // Socket event setup
  useEffect(() => {
    const s = getSocket();
    setSocket(s);

    if (s.id) {
      setMyPlayerId(s.id);
    }

    s.on('connect', () => {
      setMyPlayerId(s.id || '');
    });

    s.on('game_state_update', (newState: GameState) => {
      setGameState((prevState) => {
        // Play notification if turn switched to current user
        const prevPlayer = prevState ? prevState.players[prevState.currentPlayerIndex] : null;
        const newPlayer = newState.players[newState.currentPlayerIndex];

        if (
          newState.phase === 'playing' &&
          newPlayer &&
          newPlayer.id === s.id &&
          (!prevPlayer || prevPlayer.id !== s.id)
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
      s.off('game_state_update');
      s.off('chat_message');
    };
  }, []);

  const clearError = () => setErrorMessage(null);

  // Lobby actions
  const handleCreateRoom = (playerName: string, avatar: string, targetScore: number) => {
    clearError();
    socket.emit(
      'create_room',
      { playerName, avatar, targetScore },
      (res: { success: boolean; roomCode?: string; playerId?: string; state?: GameState; error?: string }) => {
        if (res.success && res.state) {
          setMyPlayerId(res.playerId || socket.id || '');
          setGameState(res.state);
        } else {
          setErrorMessage(res.error || 'Erreur lors de la création du salon.');
        }
      }
    );
  };

  const handleJoinRoom = (roomCode: string, playerName: string, avatar: string) => {
    clearError();
    socket.emit(
      'join_room',
      { roomCode, playerName, avatar },
      (res: { success: boolean; roomCode?: string; playerId?: string; state?: GameState; chat?: ChatMessage[]; error?: string }) => {
        if (res.success && res.state) {
          setMyPlayerId(res.playerId || socket.id || '');
          setGameState(res.state);
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
    setGameState(null);
    setChatMessages([]);
    setDiscardAndFlipMode(false);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Game actions
  const handleDrawCard = () => {
    sound.cardFlip();
    socket.emit('draw_card');
  };

  const handleTakeDiscard = () => {
    sound.cardPlace();
    socket.emit('take_discard');
  };

  const handleCardClick = (cardIndex: number) => {
    if (!gameState) return;

    if (gameState.phase === 'initial_revealing') {
      sound.cardFlip();
      socket.emit('reveal_initial_card', { cardIndex });
      return;
    }

    if (gameState.phase === 'playing') {
      const activePlayer = gameState.players[gameState.currentPlayerIndex];
      if (!activePlayer || activePlayer.id !== myPlayerId) return;

      if (discardAndFlipMode) {
        sound.cardFlip();
        socket.emit('discard_and_flip', { flipIndex: cardIndex });
        setDiscardAndFlipMode(false);
      } else {
        sound.cardPlace();
        socket.emit('swap_card', { cardIndex });
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
    socket.emit('next_round');
  };

  const handleRestartGame = () => {
    socket.emit('restart_game');
  };

  const handleSendMessage = (text: string) => {
    socket.emit('send_chat', { text });
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      const next = !prev;
      if (next) setUnreadChatCount(0);
      return next;
    });
  };

  // Find active player & self
  const myPlayer = gameState?.players.find((p) => p.id === myPlayerId);
  const activePlayer = gameState?.players[gameState.currentPlayerIndex];
  const isMyTurn = Boolean(activePlayer && activePlayer.id === myPlayerId);
  const isHost = Boolean(myPlayer?.isHost);

  const opponents = (gameState?.players || []).filter((p) => p.id !== myPlayerId);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
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
        <div className="w-full bg-rose-500/20 border-b border-rose-500/40 text-rose-200 px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-xs text-rose-300 hover:text-white underline cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto flex flex-col justify-start p-2 sm:p-4">
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
          <div className="w-full flex flex-col gap-2.5">
            {/* Status notification banner (Game Phase instructions) */}
            {gameState.phase === 'initial_revealing' && (
              <div className="w-full bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 border border-indigo-500/50 rounded-2xl p-3 text-center shadow-lg animate-pulse">
                <span className="font-extrabold text-sm sm:text-base text-amber-300">
                  {myPlayer && myPlayer.initialRevealedCount < 2
                    ? `👉 Retournez 2 cartes de votre grille (${myPlayer.initialRevealedCount}/2 faites)`
                    : '⏳ En attente des autres joueurs...'}
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Le joueur avec le total le plus élevé commencera la partie !
                </p>
              </div>
            )}

            {gameState.finalRoundTriggeredBy && gameState.phase === 'playing' && (
              <div className="w-full bg-gradient-to-r from-amber-950 via-red-950 to-amber-950 border border-amber-500/60 rounded-2xl p-2.5 text-center shadow-lg animate-pulse">
                <span className="font-black text-xs sm:text-sm text-amber-300">
                  ⚡ DERNIER TOUR DE LA MANCHE !
                </span>
                <span className="text-xs text-slate-300 block">
                  Chacun joue son ultime tour avant le décompte final.
                </span>
              </div>
            )}

            {/* Opponents Mini Bar (Scrollable on mobile) */}
            {opponents.length > 0 && (
              <OpponentList
                opponents={opponents}
                currentPlayerIndex={gameState.currentPlayerIndex}
                allPlayers={gameState.players}
                gamePhase={gameState.phase}
              />
            )}

            {/* Center Table: Draw Pile, Discard Pile, Drawn Card */}
            <CenterTable
              drawPileCount={gameState.drawPileCount}
              topDiscard={gameState.discardPile[gameState.discardPile.length - 1] || null}
              currentDrawnCard={gameState.currentDrawnCard}
              turnAction={gameState.turnAction}
              gamePhase={gameState.phase}
              isMyTurn={isMyTurn}
              discardAndFlipMode={discardAndFlipMode}
              onDrawCard={handleDrawCard}
              onTakeDiscard={handleTakeDiscard}
              onToggleDiscardAndFlip={handleToggleDiscardAndFlip}
              onCancelDiscardAndFlip={handleCancelDiscardAndFlip}
            />

            {/* Active User's Board (My 3x4 Grid) */}
            {myPlayer && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-1 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Votre Grille (3x4)
                  </span>
                  {isMyTurn && (
                    <span className="text-xs font-black text-amber-400 animate-pulse">
                      ★ C'est à vous de jouer !
                    </span>
                  )}
                </div>

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
