import React from 'react';
import { X, Award, CheckCircle2, AlertTriangle, Layers, Flame } from 'lucide-react';
import { SkyjoCard } from './SkyjoCard';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <h2 className="font-extrabold text-lg sm:text-xl text-white font-display">
              Règles officielles du JoSky
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm text-slate-300 leading-relaxed">
          {/* Objectif */}
          <section className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
            <h3 className="font-bold text-white text-base flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-amber-400" />
              Objectif du jeu
            </h3>
            <p>
              Dans JoSky, <strong className="text-amber-300">le but est d'avoir le MOINS de points possible</strong> à la fin de la partie. La partie s'arrête dès qu'un joueur atteint 100 points. Le joueur avec le plus petit total l'emporte !
            </p>
          </section>

          {/* Les Cartes et Couleurs */}
          <section>
            <h3 className="font-bold text-white text-base flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Les Cartes & Couleurs (150 cartes)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-2 text-center text-xs">
              <div className="bg-indigo-950/80 p-2 rounded-lg border border-indigo-500/50">
                <span className="font-extrabold text-indigo-300 text-sm">-2 et -1</span>
                <p className="text-[10px] text-slate-400 mt-1">Négatives (Excellent !)</p>
              </div>
              <div className="bg-cyan-950/80 p-2 rounded-lg border border-cyan-500/50">
                <span className="font-extrabold text-cyan-300 text-sm">0</span>
                <p className="text-[10px] text-slate-400 mt-1">Neutre (0 point)</p>
              </div>
              <div className="bg-emerald-950/80 p-2 rounded-lg border border-emerald-500/50">
                <span className="font-extrabold text-emerald-300 text-sm">1 à 4</span>
                <p className="text-[10px] text-slate-400 mt-1">Petits points (Vert)</p>
              </div>
              <div className="bg-amber-950/80 p-2 rounded-lg border border-amber-500/50">
                <span className="font-extrabold text-amber-300 text-sm">5 à 8</span>
                <p className="text-[10px] text-slate-400 mt-1">Points moyens (Jaune)</p>
              </div>
              <div className="bg-rose-950/80 p-2 rounded-lg border border-rose-500/50 col-span-2 sm:col-span-1">
                <span className="font-extrabold text-rose-300 text-sm">9 à 12</span>
                <p className="text-[10px] text-slate-400 mt-1">Danger (Rouge !)</p>
              </div>
            </div>
          </section>

          {/* Déroulement d'un tour */}
          <section className="space-y-2">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Déroulement d'un tour
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">Choisir une carte :</strong> Vous pouvez soit prendre la première carte face visible de la <strong className="text-emerald-300">Défausse</strong>, soit piocher une carte face cachée dans la <strong className="text-indigo-300">Pioche</strong>.
              </li>
              <li>
                <strong className="text-white">Si vous prenez la défausse :</strong> Vous devez obligatoirement l'échanger avec l'une de vos 12 cartes (qu'elle soit face visible ou cachée). La carte remplacée part dans la défausse.
              </li>
              <li>
                <strong className="text-white">Si vous piochez une carte :</strong>
                <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-slate-300">
                  <li>Soit vous <strong className="text-cyan-300">l'échangez</strong> contre une carte de votre grille.</li>
                  <li>Soit vous la <strong className="text-amber-300">jetez à la défausse</strong>, mais vous devez alors obligatoirement <strong className="text-white">retourner une de vos cartes cachées</strong>.</li>
                </ul>
              </li>
            </ol>
          </section>

          {/* Règle de la colonne (Triple) */}
          <section className="bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-500/30">
            <h3 className="font-bold text-indigo-300 text-base flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-amber-400" />
              Règle maîtresse : Élimination d'une colonne (Triple)
            </h3>
            <p>
              Si dans une même colonne verticale de 3 cartes, vous avez <strong className="text-white">3 cartes de même valeur toutes révélées</strong> (ex : 3 cartes "8"), la colonne entière est <strong className="text-amber-400">ÉLIMINÉE</strong> ! Vous vous débarrassez ainsi de tous ces points.
            </p>
          </section>

          {/* Règle du score doublé */}
          <section className="bg-amber-950/30 p-3.5 rounded-xl border border-amber-500/30">
            <h3 className="font-bold text-amber-300 text-base flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Fin de manche & Règle du doublement
            </h3>
            <p>
              Dès qu'un joueur a révélé toutes ses cartes, tous les autres ont un <strong className="text-white">dernier tour</strong>. Puis on compte les points de chacun.
            </p>
            <p className="mt-1.5 font-medium text-amber-200">
              ⚠️ Attention : Si le joueur qui a terminé en premier n'a pas <em>strictement le plus petit score</em> de la manche, son score positif est <strong className="text-rose-400 uppercase">DOUBLÉ</strong> !
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition cursor-pointer"
          >
            J'ai compris, c'est parti !
          </button>
        </div>
      </div>
    </div>
  );
};
