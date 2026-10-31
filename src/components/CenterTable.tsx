import React from 'react';
import { JoskyCard as JoskyCardType, TurnAction, GamePhase, Player } from '../types/game';
import { JoskyCard } from './JoskyCard';
import { Layers, Timer, X, Zap } from 'lucide-react';

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
  onDrawCard,
  onTakeDiscard,
  onToggleDiscardAndFlip,
  onCancelDiscardAndFlip,
}) => {
  const canDraw = isMyTurn && gamePhase === 'playing' && turnAction === 'choose_source';
  const canTakeDiscard = isMyTurn && gamePhase === 'playing' && turnAction === 'choose_source' && topDiscard !== null;
  const canThrowAway = isMyTurn && gamePhase === 'playing' && turnAction === 'drawn_card_choice';
  const showTurnTimer = turnSecondsLeft !== null && turnSecondsLeft <= 20;

  const handleThrowAway = () => {
    if (discardAndFlipMode) onCancelDiscardAndFlip?.();
    else onToggleDiscardAndFlip?.();
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/40 border border-slate-800/60 rounded-2xl px-2 py-1 xs:px-3 xs:py-1.5 shadow-sm flex-shrink-0 backdrop-blur-xs relative">
      {/* Final round subtle ribbon */}
      {finalRoundTriggeredBy && gamePhase === 'playing' && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black text-[9px] px-2 py-0.2 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md z-10">
          <Zap className="w-2.5 h-2.5 fill-current" />
          <span>Dernier Tour</span>
        </div>
      )}

      {/* Turn countdown, shown once the player starts running out of time */}
      {showTurnTimer && (
        <div className={`absolute -top-2.5 right-2 font-black text-[9px] px-1.5 py-0.2 rounded-full tabular-nums flex items-center gap-0.5 shadow-md z-10 ${
          turnSecondsLeft <= 10 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-700 text-slate-100'
        }`}>
          <Timer className="w-2.5 h-2.5" />
          <span>{turnSecondsLeft}s</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-1 xs:gap-2">
        {/* Left: Draw Pile (Pioche) */}
        <div className="flex flex-col items-center flex-1">
          <div className="relative group">
            {/* Multi-layer stacked deck illusion */}
            <div className="absolute -inset-0.5 rounded-xl bg-indigo-500/10 blur-xs"></div>
            <div className="absolute -bottom-0.5 -right-0.5 w-full h-full rounded-xl bg-slate-800 border border-indigo-700/30"></div>

            <JoskyCard
              card={{ id: 'draw-pile', value: 0, isRevealed: false }}
              size="table"
              isSelectable={canDraw}
              onClick={onDrawCard}
            />

            {/* Card count tag */}
            <div className="absolute -bottom-1 -left-1 bg-indigo-600 text-white font-extrabold text-[8px] xs:text-[9px] px-1.5 py-0.2 rounded-full shadow-md flex items-center gap-0.5 border border-indigo-400">
              <Layers className="w-2.5 h-2.5" />
              <span>{drawPileCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] font-bold text-slate-300">
              Pioche
            </span>
            {canDraw && (
              <span className="text-[8px] text-amber-400 font-bold animate-pulse">
                (Tirer)
              </span>
            )}
          </div>
        </div>

        {/* Center: Modernized Minimalist Turn Indicator or Drawn Card Slot */}
        <div className="flex flex-col items-center justify-center flex-1 px-1 min-w-[110px] text-center">
          {currentDrawnCard ? (
            /* A card is drawn: the discard pile on the right is where it gets thrown away */
            <div className="flex flex-col items-center animate-bounce-short">
              <JoskyCard
                card={currentDrawnCard}
                size="table"
                isSelected={true}
              />

              {isMyTurn && (
                <span className={`mt-0.5 text-[10px] font-bold leading-tight whitespace-nowrap ${discardAndFlipMode ? 'text-amber-300' : 'text-slate-200'}`}>
                  {discardAndFlipMode ? 'Retournez une carte' : 'Touchez votre grille'}
                </span>
              )}
            </div>
          ) : (
            /* No card drawn: Minimalist, modern turn chip (replaces the huge action block) */
            <div className="flex flex-col items-center justify-center">
              {gamePhase === 'initial_revealing' ? (
                <div className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 flex flex-col items-center leading-tight shadow-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                    <span className="font-extrabold text-[10px]">Révélez 2 cartes</span>
                  </div>
                  <span className="text-[8px] text-indigo-300/80 mt-0.2 font-medium">
                    ({myPlayer?.initialRevealedCount || 0}/2 prêtes)
                  </span>
                </div>
              ) : isMyTurn ? (
                turnAction === 'discard_choice' ? (
                  <div className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 flex flex-col items-center leading-tight animate-pulse shadow-xs">
                    <span className="font-black text-[10px]">📥 Défausse prise</span>
                    <span className="text-[8px] text-slate-300 mt-0.2">Touchez votre grille</span>
                  </div>
                ) : (
                  /* choose_source */
                  <div className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 flex flex-col items-center leading-tight shadow-xs">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      <span className="font-black text-[10px] tracking-tight">À votre tour</span>
                    </div>
                    <span className="text-[8px] text-slate-300 mt-0.2 font-medium">
                      Pioche ou Défausse
                    </span>
                  </div>
                )
              ) : (
                /* Opponent's turn */
                <div className="px-2 py-0.5 rounded-full bg-slate-950/50 border border-slate-800 text-slate-400 flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-ping"></span>
                  <span className="text-[9px] font-semibold truncate max-w-[100px]">
                    {activePlayer?.name || 'Adversaire'} joue...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Discard Pile (Défausse) */}
        <div className="flex flex-col items-center flex-1">
          <div className="relative">
            {topDiscard ? (
              <div key={topDiscard.id} className="animate-card-land">
                <JoskyCard
                  card={topDiscard}
                  size="table"
                  isSelectable={canTakeDiscard || (canThrowAway && !discardAndFlipMode)}
                  onClick={canThrowAway ? handleThrowAway : onTakeDiscard}
                />
              </div>
            ) : (
              <div className="h-[54px] w-[38px] xs:h-[60px] xs:w-[42px] sm:h-[70px] sm:w-[50px] rounded-xl border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-[10px] font-semibold">
                Vide
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {canThrowAway && discardAndFlipMode ? (
              <button
                type="button"
                onClick={onCancelDiscardAndFlip}
                className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-600 text-[10px] font-bold active:scale-95 flex items-center gap-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Annuler</span>
              </button>
            ) : canThrowAway ? (
              <span className="text-[10px] font-extrabold text-amber-300">
                Jeter ici
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-300">
                Défausse
              </span>
            )}
            {canTakeDiscard && (
              <span className="text-[8px] text-emerald-400 font-bold animate-pulse">
                (Prendre)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
