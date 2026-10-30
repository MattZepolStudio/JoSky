import React from 'react';
import { SkyjoCard as SkyjoCardType, TurnAction, GamePhase } from '../types/game';
import { SkyjoCard } from './SkyjoCard';
import { Layers, Sparkles } from 'lucide-react';

interface CenterTableProps {
  drawPileCount: number;
  topDiscard: SkyjoCardType | null;
  currentDrawnCard: SkyjoCardType | null;
  turnAction: TurnAction;
  gamePhase: GamePhase;
  isMyTurn: boolean;
  onDrawCard: () => void;
  onTakeDiscard: () => void;
}

export const CenterTable: React.FC<CenterTableProps> = ({
  drawPileCount,
  topDiscard,
  currentDrawnCard,
  turnAction,
  gamePhase,
  isMyTurn,
  onDrawCard,
  onTakeDiscard,
}) => {
  const canDraw = isMyTurn && gamePhase === 'playing' && turnAction === 'choose_source';
  const canTakeDiscard = isMyTurn && gamePhase === 'playing' && turnAction === 'choose_source' && topDiscard !== null;

  return (
    <div className="w-full max-w-md sm:max-w-lg mx-auto bg-slate-900/50 border border-slate-800/80 rounded-xl px-3 py-1.5 xs:px-4 xs:py-2 shadow-md flex-shrink-0 backdrop-blur-xs">
      <div className="flex items-center justify-around gap-2 xs:gap-4 sm:gap-6">
        {/* Draw Pile (Pioche) */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            {/* Multi-layer stacked deck illusion */}
            <div className="absolute -inset-0.5 rounded-xl bg-indigo-500/10 blur-xs"></div>
            <div className="absolute -bottom-0.5 -right-0.5 w-full h-full rounded-xl bg-slate-800 border border-indigo-700/30"></div>

            <SkyjoCard
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
            <span className="text-[10px] sm:text-xs font-bold text-slate-300">
              Pioche
            </span>
            {canDraw && (
              <span className="text-[8px] xs:text-[9px] text-amber-400 font-semibold animate-pulse">
                (Toucher)
              </span>
            )}
          </div>
        </div>

        {/* Drawn card slot (if a card is drawn) */}
        {currentDrawnCard && (
          <div className="flex flex-col items-center animate-bounce-short">
            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-cyan-500/25 blur-xs animate-pulse"></div>
              <SkyjoCard
                card={currentDrawnCard}
                size="table"
                isSelected={true}
              />
            </div>
            <span className="text-[9px] xs:text-[10px] font-black text-cyan-300 mt-0.5 flex items-center gap-0.5">
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
                size="table"
                isSelectable={canTakeDiscard}
                onClick={onTakeDiscard}
              />
            ) : (
              <div className="h-[68px] w-[48px] xs:h-[76px] xs:w-[54px] sm:h-[88px] sm:w-[62px] rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-[10px] font-semibold">
                Vide
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-300">
              Défausse
            </span>
            {canTakeDiscard && (
              <span className="text-[8px] xs:text-[9px] text-emerald-400 font-semibold animate-pulse">
                (Prendre)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

