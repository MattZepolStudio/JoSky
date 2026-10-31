import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Player } from '../types/game';
import { JoskyCard } from './JoskyCard';

interface PlayerCardsRevealProps {
  player: Player;
  defaultOpen?: boolean;
}

export const PlayerCardsReveal: React.FC<PlayerCardsRevealProps> = ({ player, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-1.5 pt-1 border-t border-slate-800/80">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="w-full py-1 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-300 cursor-pointer"
      >
        <span>{isOpen ? 'Masquer les cartes' : 'Voir les cartes'}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="grid grid-cols-4 gap-1.5 justify-items-center max-w-[210px] mx-auto pt-1 pb-0.5">
          {player.cards.map((card, index) => (
            <JoskyCard key={index} card={card} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
};
