import React from 'react';
import { JoskyCard as JoskyCardType, TurnAction, GamePhase, Player } from '../types/game';
import { JoskyCard } from './JoskyCard';
import { Layers, Timer, X, Zap } from 'lucide-react';

const TIMER_VISIBLE_SECONDS = 20;

interface CenterTableProps {
  drawPileCount: number;
  topDiscard: JoskyCardType | null;
  currentDrawnCard: JoskyCardType | null;
  turnAction: TurnAction;
  gamePhase: GamePhase;
  isMyTurn: boolean;
  activePlayer?: Player;
  myPlayer?: Player | null;
  discardAndFlipMode?: boolean;
  finalRoundTriggeredBy?: string | null;
  turnSecondsLeft?: number | null;
  isRevealing?: boolean;
  isKeeping?: boolean;
  onKeepCard?: () => void;
  onCancelKeep?: () => void;
  onDrawCard: () => void;
  onTakeDiscard: () => void;
  onToggleDiscardAndFlip?: () => void;
  onCancelDiscardAndFlip?: () => void;
}

export const CenterTable: React.FC<CenterTableProps> = ({
  drawPileCount,
  topDiscard,
  currentDrawnCard,
  turnAction,
  gamePhase,
  isMyTurn,
  activePlayer,
  myPlayer,
  discardAndFlipMode = false,
  finalRoundTriggeredBy,
  turnSecondsLeft = null,
  isRevealing = false,
  isKeeping = false,
  onKeepCard,
  onCancelKeep,
  onDrawCard,
  onTakeDiscard,
  onToggleDiscardAndFlip,
  onCancelDiscardAndFlip,
}) => {
  const canDraw = isMyTurn && gamePhase === 'playing' && turnAction === 'choose_source';
  const canTakeDiscard = isMyTurn && gamePhase === 'playing' && turnAction === 'choose_source' && topDiscard !== null;
  const canThrowAway = isMyTurn && gamePhase === 'playing' && turnAction === 'drawn_card_choice';
  const showTurnTimer = turnSecondsLeft !== null && turnSecondsLeft <= TIMER_VISIBLE_SECONDS;

  // One decision at a time: until the player chooses, only the two buttons stand out
  const isChoosing = canThrowAway && !discardAndFlipMode && !isKeeping;
  const shownDiscard = discardAndFlipMode && currentDrawnCard ? currentDrawnCard : topDiscard;

  const handleThrowAway = () => {
    if (discardAndFlipMode) onCancelDiscardAndFlip?.();
    else onToggleDiscardAndFlip?.();
  };

  return (
    <div data-table-anchor className="w-full max-w-md mx-auto bg-black/15 border border-brass-300/20 rounded-3xl px-2 py-1 flex-shrink-0 relative">
      {/* Final round subtle ribbon */}
      {finalRoundTriggeredBy && gamePhase === 'playing' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-xs px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-rose-900/50 z-10 whitespace-nowrap animate-last-round">
          <Zap className="w-3 h-3 fill-current" />
          <span>Dernier Tour</span>
        </div>
      )}

      {/* Turn countdown, shown once the player starts running out of time */}
      {showTurnTimer && (
        <div className={`absolute -top-3 right-2 font-black text-[11px] px-2 py-0.5 rounded-full tabular-nums flex items-center gap-1 shadow-md z-10 ${
          turnSecondsLeft <= 10 ? 'bg-rose-600 text-white' : 'bg-felt-700 text-felt-100'
        }`}>
          <Timer className="w-3 h-3" />
          <span>{turnSecondsLeft}s</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-1">
        {/* Left: Draw Pile (Pioche) */}
        <div className="flex flex-col items-center flex-1">
          <div className="relative group" data-card-anchor="draw">
            {/* Multi-layer stacked deck illusion */}
            <div className="absolute -inset-0.5 rounded-xl bg-brass-500/10 blur-xs"></div>
            <div className="absolute -bottom-0.5 -right-0.5 w-full h-full rounded-xl bg-felt-800 border border-brass-700/30"></div>

            <JoskyCard
              card={{ id: 'draw-pile', value: 0, isRevealed: false }}
              size="table"
              isSelectable={canDraw}
              onClick={onDrawCard}
            />

            {/* Card count tag */}
            <div className="absolute -bottom-1 -left-1 bg-brass-600 text-white font-extrabold text-[11px] px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-0.5 border border-brass-400">
              <Layers className="w-2.5 h-2.5" />
              <span>{drawPileCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {canThrowAway && isKeeping ? (
              <button type="button" onClick={onCancelKeep} className="tap-tall relative px-2 py-0.5 rounded-full bg-felt-800 text-felt-200 border border-felt-600 text-[11px] font-bold active:scale-95 flex items-center gap-0.5 cursor-pointer">
                <X className="w-3 h-3" />
                <span>Annuler</span>
              </button>
            ) : isChoosing ? (
              <button type="button" onClick={onKeepCard} className="tap-tall relative btn-primary px-4 py-0.5 rounded-full text-xs font-black active:scale-95 cursor-pointer transition">
                Garder
              </button>
            ) : (
              <span className="text-[11px] font-bold text-felt-300">
                Pioche
              </span>
            )}
          </div>
        </div>

        {/* Center: Modernized Minimalist Turn Indicator or Drawn Card Slot */}
        <div className="flex flex-col items-center justify-center flex-1 px-1 min-w-[110px] text-center">
          {discardAndFlipMode && currentDrawnCard ? (
            <div className="px-3 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-400/50 text-amber-200 flex flex-col items-center leading-tight">
              <span className="font-black text-xs">Carte jetée !</span>
              <span className="text-[11px] font-semibold mt-0.5 whitespace-nowrap">↓ Retournez-en une</span>
            </div>
          ) : currentDrawnCard ? (
            /* A card is drawn: the discard pile on the right is where it gets thrown away */
            <div className="flex flex-col items-center">
              <div data-card-anchor="hand">
                <JoskyCard
                  card={currentDrawnCard}
                  size="table"
                  isSelected={true}
                />
              </div>

              {isMyTurn && (
                <span className="mt-0.5 text-[11px] font-bold leading-tight whitespace-nowrap text-amber-200">
                  {isChoosing ? 'Garder ou jeter ?' : '↓ Remplacez une carte'}
                </span>
              )}
            </div>
          ) : (
            /* No card drawn: Minimalist, modern turn chip (replaces the huge action block) */
            <div className="flex flex-col items-center justify-center">
              {isRevealing ? (
                <div className="px-3 py-1 rounded-full bg-brass-500/15 border border-brass-400/40 text-brass-200 font-black text-[11px]">
                  Révélation !
                </div>
              ) : gamePhase === 'initial_revealing' ? (
                <div className="px-2.5 py-1 rounded-full bg-brass-500/15 border border-brass-400/30 text-brass-300 flex flex-col items-center leading-tight shadow-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brass-400"></span>
                    <span className="font-extrabold text-[11px] whitespace-nowrap">Révélez 2 cartes</span>
                  </div>
                  <span className="text-[11px] text-brass-300/80 mt-0.5 font-medium">
                    ({myPlayer?.initialRevealedCount || 0}/2 prêtes)
                  </span>
                </div>
              ) : isMyTurn ? (
                turnAction === 'discard_choice' ? (
                  <div className="px-2.5 py-1 rounded-full bg-brass-500/15 border border-brass-400/40 text-brass-300 flex flex-col items-center leading-tight shadow-xs">
                    <span className="font-black text-[11px]">📥 Défausse prise</span>
                    <span className="text-[11px] text-felt-300 mt-0.5">Touchez votre grille</span>
                  </div>
                ) : (
                  /* choose_source */
                  <div className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 flex flex-col items-center leading-tight shadow-xs">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span className="font-black text-[11px] tracking-tight">À votre tour</span>
                    </div>
                    <span className="text-[11px] text-felt-300 mt-0.5 font-medium">
                      <span className="whitespace-nowrap">{finalRoundTriggeredBy ? 'Dernier tour !' : 'Pioche ou défausse'}</span>
                    </span>
                  </div>
                )
              ) : (
                /* Opponent's turn */
                <div className="px-2 py-0.5 rounded-full bg-felt-950/50 border border-felt-800 text-felt-400 flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-felt-500"></span>
                  <span className="text-[11px] font-semibold truncate max-w-[130px]">
                    {activePlayer?.name || 'Adversaire'} {activePlayer && !activePlayer.isConnected ? 'hors ligne, tour auto' : 'joue...'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Discard Pile (Défausse) */}
        <div className="flex flex-col items-center flex-1">
          <div className="relative" data-card-anchor="discard">
            {shownDiscard ? (
              <div key={shownDiscard.id}>
                <JoskyCard
                  card={shownDiscard}
                  size="table"
                  isSelectable={canTakeDiscard}
                  onClick={canThrowAway && !isKeeping ? handleThrowAway : onTakeDiscard}
                />
              </div>
            ) : (
              <div className="card-table rounded-xl border-2 border-dashed border-felt-800 flex items-center justify-center text-felt-600 text-[11px] font-semibold">
                Vide
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {canThrowAway && discardAndFlipMode ? (
              <button
                type="button"
                onClick={onCancelDiscardAndFlip}
                className="px-2 py-0.5 rounded-full bg-felt-800 text-felt-200 border border-felt-600 text-[11px] font-bold active:scale-95 flex items-center gap-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Annuler</span>
              </button>
            ) : isChoosing ? (
              <button
                type="button"
                onClick={handleThrowAway}
                className="tap-tall relative btn-primary px-4 py-0.5 rounded-full text-xs font-black active:scale-95 cursor-pointer transition"
              >
                Jeter
              </button>
            ) : (
              <span className="text-[11px] font-bold text-felt-300">
                Défausse
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
