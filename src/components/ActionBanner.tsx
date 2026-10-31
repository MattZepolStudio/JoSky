import React from 'react';
import { GamePhase, TurnAction, Player, SkyjoCard as SkyjoCardType } from '../types/game';
import { ArrowDownUp, RefreshCw, X, Sparkles, Layers, Clock, AlertTriangle } from 'lucide-react';

interface ActionBannerProps {
  gamePhase: GamePhase;
  turnAction: TurnAction;
  isMyTurn: boolean;
  activePlayer?: Player;
  myPlayer?: Player;
  currentDrawnCard: SkyjoCardType | null;
  discardAndFlipMode: boolean;
  finalRoundTriggeredBy?: string | null;
  players: Player[];
  onToggleDiscardAndFlip: () => void;
  onCancelDiscardAndFlip: () => void;
}

export const ActionBanner: React.FC<ActionBannerProps> = ({
  gamePhase,
  turnAction,
  isMyTurn,
  activePlayer,
  myPlayer,
  currentDrawnCard,
  discardAndFlipMode,
  finalRoundTriggeredBy,
  players,
  onToggleDiscardAndFlip,
  onCancelDiscardAndFlip,
}) => {
  // Final round alert
  const finalPlayer = finalRoundTriggeredBy
    ? players.find((p) => p.id === finalRoundTriggeredBy)
    : null;

  return (
    <div className="w-full max-w-[265px] xs:max-w-[290px] sm:max-w-[340px] mx-auto flex flex-col gap-0.5 flex-shrink-0 px-0.5">
      {/* Final round alert badge if triggered */}
      {finalRoundTriggeredBy && gamePhase === 'playing' && (
        <div className="w-full bg-gradient-to-r from-amber-950/80 via-red-950/80 to-amber-950/80 border border-amber-500/50 rounded-lg px-2 py-0.5 text-center shadow-sm flex items-center justify-center gap-1 text-amber-300 min-h-[22px]">
          <AlertTriangle className="w-2.5 h-2.5 text-amber-400 flex-shrink-0 animate-pulse" />
          <span className="font-black text-[9px] xs:text-[10px] truncate">
            ⚡ DERNIER TOUR · {finalPlayer ? `${finalPlayer.name} a fini !` : 'Dernier coup !'}
          </span>
        </div>
      )}


      {/* Main Interactive Action Banner */}
      {gamePhase === 'initial_revealing' && (
        <div className="w-full min-h-[36px] bg-slate-900/90 border border-indigo-500/50 rounded-xl px-2.5 py-0.5 shadow-md flex items-center justify-between gap-1.5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping flex-shrink-0"></span>
            <span className="font-extrabold text-[11px] xs:text-xs text-indigo-200 truncate">
              {myPlayer && myPlayer.initialRevealedCount < 2
                ? `👉 Révélez 2 cartes (${myPlayer.initialRevealedCount}/2)`
                : '⏳ Vos 2 cartes sont prêtes !'}
            </span>
          </div>
          <span className="text-[9px] text-indigo-400/80 font-medium hidden xs:inline flex-shrink-0">
            Plus fort score commence
          </span>
        </div>
      )}

      {gamePhase === 'playing' && isMyTurn && (
        <>
          {/* Phase A: Choose where to draw from */}
          {turnAction === 'choose_source' && (
            <div className="w-full min-h-[36px] bg-gradient-to-r from-indigo-950/90 via-slate-900/90 to-indigo-950/90 border border-amber-400/60 rounded-xl px-2.5 py-0.5 shadow-lg shadow-amber-500/10 flex items-center justify-between gap-1.5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0"></span>
                <span className="font-extrabold text-[11px] xs:text-xs text-amber-300 flex-shrink-0">
                  ★ Votre tour :
                </span>
                <span className="text-[10px] xs:text-[11px] text-slate-200 font-medium truncate">
                  Touchez la <strong className="text-cyan-300">Pioche</strong> ou la <strong className="text-emerald-300">Défausse</strong>
                </span>
              </div>
              <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0 animate-bounce" />
            </div>
          )}

          {/* Phase B: Drawn a card from the deck */}
          {turnAction === 'drawn_card_choice' && currentDrawnCard && (
            <div className="w-full min-h-[36px] bg-slate-900/95 border-2 border-cyan-400/70 rounded-xl p-1 shadow-xl shadow-cyan-500/10 backdrop-blur-md transition-all flex items-center">
              {!discardAndFlipMode ? (
                <div className="flex items-center gap-1.5 xs:gap-2 w-full">
                  {/* Option 1: Swap hint */}
                  <div className="flex-1 min-w-0 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-0.5 flex items-center gap-1.5">
                    <ArrowDownUp className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0 leading-none">
                      <span className="text-[10px] xs:text-[11px] font-black text-cyan-300 truncate">
                        Échanger ({currentDrawnCard.value})
                      </span>
                      <span className="text-[8px] xs:text-[9px] text-slate-400 truncate mt-0.5">
                        Touchez une carte de votre grille
                      </span>
                    </div>
                  </div>

                  {/* Option 2: Discard and Flip button */}
                  <button
                    type="button"
                    onClick={onToggleDiscardAndFlip}
                    className="flex-1 min-w-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-slate-950 font-black rounded-lg px-2 py-0.5 shadow-md shadow-amber-500/20 border border-amber-300 flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-950 flex-shrink-0" />
                    <div className="flex flex-col items-center leading-none">
                      <span className="text-[10px] xs:text-[11px] font-black tracking-tight uppercase">
                        Jeter & Retourner
                      </span>
                      <span className="text-[8px] opacity-80 font-bold mt-0.5">
                        Révéler une cachée
                      </span>
                    </div>
                  </button>
                </div>
              ) : (
                /* Discard & Flip Mode Active */
                <div className="flex items-center justify-between gap-2 w-full bg-gradient-to-r from-amber-950/90 via-amber-900/90 to-amber-950/90 border border-amber-400 rounded-lg px-2 py-0.5 min-h-[30px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin flex-shrink-0" />
                    <span className="text-[10px] xs:text-[11px] font-black text-amber-100 truncate">
                      👉 Touchez une carte <strong className="text-amber-300 underline">face cachée</strong> pour la révéler
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onCancelDiscardAndFlip}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-bold border border-slate-700 cursor-pointer flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                    <span>Annuler</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Phase C: Card taken from discard pile */}
          {turnAction === 'discard_choice' && (
            <div className="w-full min-h-[36px] bg-slate-900/95 border-2 border-emerald-400/70 rounded-xl px-2.5 py-0.5 shadow-xl shadow-emerald-500/10 flex items-center justify-between gap-1.5 backdrop-blur-md">
              <div className="flex items-center gap-2 min-w-0">
                <ArrowDownUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-[11px] xs:text-xs font-extrabold text-emerald-300 truncate">
                    📥 Carte récupérée !
                  </span>
                  <span className="text-[9px] xs:text-[10px] text-slate-200">
                    Touchez une carte de votre grille pour l'échanger
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Opponent's turn */}
      {gamePhase === 'playing' && !isMyTurn && activePlayer && (
        <div className="w-full min-h-[36px] bg-slate-900/60 border border-slate-800 rounded-xl px-2.5 py-0.5 shadow-xs flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs">{activePlayer.avatar}</span>
            <span className="text-[10px] xs:text-[11px] text-slate-300 font-semibold truncate">
              Tour de <strong className="text-white">{activePlayer.name}</strong>...
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-[9px] font-medium flex-shrink-0">
            <Clock className="w-3 h-3 text-slate-400 animate-spin" />
            <span>En cours</span>
          </div>
        </div>
      )}

    </div>
  );
};
