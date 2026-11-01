import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import { JoskyCard as JoskyCardType } from '../types/game';
import { JoskyCard } from './JoskyCard';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayTutorial: () => void;
}

const faceUp = (value: number, key: string = ''): JoskyCardType => ({ id: `rules-${value}${key}`, value, isRevealed: true });
const faceDown: JoskyCardType = { id: 'rules-back', value: 0, isRevealed: false };

const CARD_RANGES = [
  { value: -2, label: '-2 et -1' },
  { value: 0, label: '0' },
  { value: 3, label: '1 à 4' },
  { value: 6, label: '5 à 8' },
  { value: 11, label: '9 à 12' },
];

const GAME_LENGTHS = ['100 points', '60 points', '1 manche'];

const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
  <section className="flex gap-3">
    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brass-300 text-brass-950 text-sm font-black flex items-center justify-center">
      {number}
    </span>
    <div className="flex-1 min-w-0 pt-0.5">
      <h3 className="text-lg text-white leading-tight mb-1.5">{title}</h3>
      {children}
    </div>
  </section>
);

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, onReplayTutorial }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 animate-fade-in">
      <div className="relative w-full max-w-md max-h-full bg-felt-900 border border-brass-300/25 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl text-white leading-none">Comment jouer</h2>
            <p className="text-sm text-brass-200 mt-1.5">Le moins de points gagne.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les règles"
            className="p-2 rounded-xl text-felt-300 bg-black/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5 overflow-y-auto space-y-6 text-sm text-felt-200 leading-snug">
          <Step number={1} title="Votre grille">
            <p>Vous avez 12 cartes cachées. Retournez-en 2 pour commencer.</p>
            <div className="flex gap-3 mt-2.5">
              {CARD_RANGES.map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 min-w-0">
                  <JoskyCard card={faceUp(value)} size="sm" />
                  <span className="text-[11px] font-semibold text-felt-300 whitespace-nowrap">{label}</span>
                </div>
              ))}
            </div>
          </Step>

          <Step number={2} title="À votre tour">
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0"><JoskyCard card={faceDown} size="sm" /></div>
                <p><strong className="text-white">Pioche :</strong> gardez la carte, ou jetez-la et retournez une carte cachée.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0"><JoskyCard card={faceUp(1)} size="sm" /></div>
                <p><strong className="text-white">Défausse :</strong> échangez-la contre une carte de votre grille.</p>
              </div>
            </div>
          </Step>

          <Step number={3} title="Trois pareilles, zéro point">
            <p>Trois cartes identiques visibles dans une colonne disparaissent.</p>
            <div className="flex items-center gap-3 mt-2.5">
              <div className="flex flex-col gap-1">
                {['a', 'b', 'c'].map((key) => (
                  <JoskyCard key={key} card={faceUp(8, key)} size="sm" />
                ))}
              </div>
              <ArrowRight className="w-5 h-5 text-brass-300 flex-shrink-0" />
              <span className="font-title text-2xl text-brass-200">0 point</span>
            </div>
          </Step>

          <Step number={4} title="Dernier tour">
            <p>
              Dès qu'un joueur a tout retourné, les autres jouent une dernière fois.
              S'il n'a pas strictement le plus petit score, ses points positifs comptent
              {' '}<span className="inline-block px-1.5 rounded-md bg-rose-600 text-white text-xs font-black">×2</span>.
            </p>
          </Step>

          <Step number={5} title="Fin de la partie">
            <p>L'hôte choisit la durée. Le plus petit total l'emporte.</p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {GAME_LENGTHS.map((length) => (
                <span key={length} className="px-2.5 py-1 rounded-full border border-brass-300/40 text-brass-200 text-xs font-semibold">
                  {length}
                </span>
              ))}
            </div>
          </Step>
        </div>

        <div className="px-5 py-3 border-t border-brass-300/15 flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onReplayTutorial}
            className="flex-1 text-xs font-semibold text-felt-300 underline text-left cursor-pointer"
          >
            Revoir le tutoriel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-6 py-2.5 rounded-xl font-black text-sm cursor-pointer active:scale-95 transition"
          >
            C'est parti !
          </button>
        </div>
      </div>
    </div>
  );
};
