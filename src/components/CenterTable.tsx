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
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 sm:p-4 my-2 shadow-lg">
      <div className="flex flex-wrap items-center justify-around gap-4 sm:gap-6">
        {/* Draw Pile (Pioche) */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            {/* Multi-layer stacked deck illusion */}
            <div className="absolute -inset-1 rounded-xl bg-indigo-500/10 blur-sm"></div>
            <div className="absolute -bottom-1 -right-1 w-full h-full rounded-xl bg-slate-800 border border-indigo-700/30"></div>
            <div className="absolute -bottom-0.5 -right-0.5 w-full h-full rounded-xl bg-slate-850 border border-indigo-600/40"></div>

            <SkyjoCard
              card={{ id: 'draw-pile', value: 0, isRevealed: false }}
              size="md"
              isSelectable={canDraw}
              onClick={onDrawCard}
            />

            {/* Card count tag */}
            <div className="absolute -bottom-2 -left-2 bg-indigo-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-indigo-400">
              <Layers className="w-2.5 h-2.5" />
              <span>{drawPileCount}</span>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-300 mt-2">
            Pioche
          </span>
          {canDraw && (
            <span className="text-[10px] text-amber-400 font-semibold animate-pulse">
              Piocher
            </span>
          )}
        </div>

        {/* Drawn card slot (if any player drew a card and needs to place it) */}
        {currentDrawnCard && (
          <div className="flex flex-col items-center animate-bounce-short">
            <div className="relative">
              <div className="absolute -inset-2 rounded-2xl bg-cyan-500/20 blur-md animate-pulse"></div>
              <SkyjoCard
                card={currentDrawnCard}
                size="md"
                isSelected={true}
              />
            </div>
            <span className="text-xs font-black text-cyan-300 mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Carte piochée
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
              <div className="h-20 w-14 sm:h-24 sm:w-17 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-xs font-semibold">
                Vide
              </div>
            )}
          </div>
          <span className="text-xs font-bold text-slate-300 mt-2">
            Défausse
          </span>
          {canTakeDiscard && (
            <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">
              Prendre
            </span>
          )}
        </div>
      </div>

      {/* Action controls when holding a drawn card */}
      {isMyTurn && currentDrawnCard && turnAction === 'drawn_card_choice' && (
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-2">
          {!discardAndFlipMode ? (
            <>
              <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5 text-center">
                <ArrowDownUp className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>Cliquez sur une carte de votre grille pour l'échanger</span>
              </div>
              <span className="text-xs text-slate-500 font-semibold">ou</span>
              <button
                type="button"
                onClick={onToggleDiscardAndFlip}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Défausser et révéler une carte cachée
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 bg-amber-950/50 border border-amber-500/40 rounded-xl px-3 py-1.5">
              <span className="text-xs font-bold text-amber-200">
                👉 Cliquez sur une carte face cachée pour la retourner
              </span>
              <button
                type="button"
                onClick={onCancelDiscardAndFlip}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      )}

      {isMyTurn && currentDrawnCard && turnAction === 'discard_choice' && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-center">
          <span className="text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5">
            <ArrowDownUp className="w-4 h-4 text-emerald-400" />
            Cliquez sur une carte de votre grille pour l'échanger avec la défausse
          </span>
        </div>
      )}
    </div>
  );
};
