import React, { useState } from 'react';
import { Volume2, VolumeX, MessageSquare, BookOpen, Share2, Check, LogOut } from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderProps {
  roomCode: string;
  roundNumber: number;
  targetScore: number;
  unreadChatCount: number;
  onToggleChat: () => void;
  onOpenRules: () => void;
  onLeaveRoom: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  roundNumber,
  targetScore,
  unreadChatCount,
  onToggleChat,
  onOpenRules,
  onLeaveRoom,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [copied, setCopied] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleCopyCode = async () => {
    const url = `${window.location.origin}?room=${roomCode}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-2.5 py-1.5 sm:px-4 sm:py-2 flex items-center justify-between sticky top-0 z-30 shadow-md flex-shrink-0">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center font-black text-white text-[11px] sm:text-sm shadow-md">
            JS
          </div>
          <span className="font-extrabold text-sm sm:text-lg tracking-wider text-white hidden xs:inline">
            JOSKY
          </span>
        </div>

        {/* Room Code Badge */}
        {roomCode && (
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold text-slate-200 transition active:scale-95 cursor-pointer"
            title="Copier le lien d'invitation"
          >
            <span className="text-slate-400 font-medium hidden xs:inline">Salon :</span>
            <span className="text-cyan-400 tracking-wider font-mono">{roomCode}</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Share2 className="w-3 h-3 text-slate-400" />
            )}
            {copied && (
              <span className="text-[9px] text-emerald-400 font-semibold hidden sm:inline">
                Copié !
              </span>
            )}
          </button>
        )}
      </div>

      {/* Center status: Round info */}
      <div className="hidden md:flex items-center gap-2 text-xs font-bold bg-slate-950/60 px-3 py-1 rounded-full border border-slate-800 text-slate-300">
        <span>Manche {roundNumber}</span>
        <span className="text-slate-600">•</span>
        <span className="text-amber-400">Objectif: {targetScore === 1 ? '1 manche' : `${targetScore} pts`}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Rules button */}
        <button
          type="button"
          onClick={onOpenRules}
          aria-label="Règles du jeu"
          className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Audio Mute toggle */}
        <button
          type="button"
          onClick={handleToggleSound}
          aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-400" />
          )}
        </button>

        {/* Chat button with badge */}
        <button
          type="button"
          onClick={onToggleChat}
          aria-label="Ouvrir le chat"
          className="relative p-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 transition cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce shadow">
              {unreadChatCount > 9 ? '9+' : unreadChatCount}
            </span>
          )}
        </button>

        {/* Leave button */}
        <button
          type="button"
          onClick={() => setShowConfirmLeave(true)}
          aria-label="Quitter le salon"
          className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition cursor-pointer"
          title="Quitter la partie"
        >
          <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>
      </div>

      {/* Leave confirmation modal */}
      {showConfirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-base sm:text-lg text-white mb-1.5">
              Quitter la partie ?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
              Êtes-vous sûr de vouloir quitter le salon ? Votre progression dans cette partie sera perdue.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmLeave(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm border border-slate-700 transition cursor-pointer active:scale-95"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmLeave(false);
                  onLeaveRoom();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/30 transition cursor-pointer active:scale-95"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
