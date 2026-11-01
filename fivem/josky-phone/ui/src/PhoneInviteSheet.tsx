import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface InviteSheetProps {
  roomCode: string;
  onClose: () => void;
}

// Replaces the website sheet: links and QR codes mean nothing inside the game
export const InviteSheet: React.FC<InviteSheetProps> = ({ roomCode, onClose }) =>
  createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Inviter des amis"
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-felt-900 border-t border-brass-300/25 rounded-t-3xl p-5 shadow-2xl animate-sheet-up"
      >
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-2xl text-white leading-none">Inviter des amis</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 -mt-1 rounded-xl text-felt-300 bg-black/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-felt-200 leading-snug">Donnez ce code à vos amis, ils le saisiront dans JoSky :</p>
        <p className="font-title text-5xl text-brass-200 tracking-widest text-center my-4">{roomCode}</p>
      </div>
    </div>,
    document.body
  );
