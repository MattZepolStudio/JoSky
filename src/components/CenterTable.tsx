import React from 'react';
import { SkyjoCard as SkyjoCardType, TurnAction, GamePhase } from '../types/game';
import { SkyjoCard } from './SkyjoCard';
import { Layers, ArrowDownUp, Sparkles, RefreshCw } from 'lucide-react';

interface CenterTableProps {
  drawPileCount: number;
  topDiscard: SkyjoCardType | null;
  currentDrawnCard: SkyjoCardType | null;
  turnAction: TurnAction;
  gamePhase: GamePhase;
  isMyTurn: boolean;
  discardAndFlipMode: boolean;
  onDrawCard: () => void;
  onTakeDiscard: () => void;
  onToggleDiscardAndFlip: () => void;
  onCancelDiscardAndFlip: () => void;
}

export const CenterTable: React.FC<CenterTableProps> = ({
  drawPileCount,
  topDiscard,
  currentDrawnCard,
  turnAction,
  gamePhase,
  isMyTurn,
  discardAndFlipMode,
  onDrawCard,
  onTakeDiscard,
  onToggleDiscardAndFlip,
  onCancelDiscardAndFlip,
}) => {
  const canDraw = isMyTurn && gamePhase === 'playing' && turnAction === 'choose_source';
  const canTakeDiscard = isMyTurn && gamePhase === 'playing' && turnAction === 'choose_source' && topDiscard !== null;

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl sm:rounded-2xl p-1.5 xs:p-2 sm:p-3 my-0.5 sm:my-1.5 shadow-md flex-shrink-0">
      <div className="flex items-center justify-center gap-3 xs:gap-6 sm:gap-8">
        {/* Draw Pile (Pioche) */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            {/* Multi-layer stacked deck illusion */}
            <div className="absolute -inset-0.5 rounded-xl bg-indigo-500/10 blur-xs"></div>
            <div className="absolute -bottom-0.5 -right-0.5 w-full h-full rounded-xl bg-slate-800 border border-indigo-700/30"></div>

            <SkyjoCard
              card={{ id: 'draw-pile', value: 0, isRevealed: false }}
              size="md"
              isSelectable={canDraw}
              onClick={onDrawCard}
            />

            {/* Card count tag */}
            <div className="absolute -bottom-1.5 -left-1.5 bg-indigo-600 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded-full shadow-md flex items-center gap-0.5 border border-indigo-400">
              <Layers className="w-2.5 h-2.5" />
              <span>{drawPileCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-300">
              Pioche
            </span>
            {canDraw && (
              <span className="text-[9px] sm:text-[10px] text-amber-400 font-semibold animate-pulse">
                (Toucher)
              </span>
            )}
          </div>
        </div>

        {/* Drawn card slot (if a card is drawn) */}
        {currentDrawnCard && (
          <div className="flex flex-col items-center animate-bounce-short">
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-2xl bg-cyan-500/20 blur-sm animate-pulse"></div>
              <SkyjoCard
                card={currentDrawnCard}
                size="md"
                isSelected={true}
              />
            </div>
            <span className="text-[10px] sm:text-xs font-black text-cyan-300 mt-0.5 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Piochée
            </span>
          </div>
        )}

        {/* Discard Pile (Défausse) */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {topDiscard ? (
              <SkyjoCard
                card={topDiscard}
                size="md"
                isSelectable={canTakeDiscard}
                onClick={onTakeDiscard}
              />
            ) : (
              <div className="h-[58px] w-[41px] xs:h-[66px] xs:w-[46px] sm:h-22 sm:w-15 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-[10px] font-semibold">
                Vide
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-300">
              Défausse
            </span>
            {canTakeDiscard && (
              <span className="text-[9px] sm:text-[10px] text-emerald-400 font-semibold animate-pulse">
                (Prendre)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action controls when holding a drawn card */}
      {isMyTurn && currentDrawnCard && turnAction === 'drawn_card_choice' && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {!discardAndFlipMode ? (
            <>
              <div className="text-[10px] xs:text-[11px] sm:text-xs text-amber-300 font-bold flex items-center gap-1 text-center">
                <ArrowDownUp className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                <span>Touchez une carte de votre grille pour l'échanger</span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">ou</span>
              <button
                type="button"
                onClick={onToggleDiscardAndFlip}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] xs:text-[11px] font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Jeter & retourner une cachée</span>
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between w-full sm:w-auto gap-2 bg-amber-950/60 border border-amber-500/40 rounded-lg px-2.5 py-1">
              <span className="text-[10px] xs:text-[11px] font-bold text-amber-200">
                👉 Touchez une carte face cachée pour la retourner
              </span>
              <button
                type="button"
                onClick={onCancelDiscardAndFlip}
                className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer font-bold"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      )}

      {isMyTurn && currentDrawnCard && turnAction === 'discard_choice' && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-center">
          <span className="text-[10px] xs:text-[11px] sm:text-xs text-amber-300 font-bold flex items-center justify-center gap-1">
            <ArrowDownUp className="w-3 h-3 text-emerald-400" />
            Touchez une carte de votre grille pour l'échanger avec la défausse
          </span>
        </div>
      )}
    </div>
  );
};
