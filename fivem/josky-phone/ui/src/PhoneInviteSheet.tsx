import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Contact, Share2, X } from 'lucide-react';
import { getSocket } from './phoneSocket';

interface InviteSheetProps {
  roomCode: string;
  onClose: () => void;
}

interface PhoneContact {
  number: string;
  name?: string;
  firstname?: string;
  lastname?: string;
}

interface LbPhoneComponents {
  setContactSelector?: (options: { onSelect: (contact: PhoneContact) => void }) => void;
  setShareComponent?: (options: { type: 'note'; data: { title: string; content: string; timestamp: number } }) => void;
}

function savedName(): string {
  try {
    return localStorage.getItem('josky_name') ?? '';
  } catch {
    return '';
  }
}

const contactName = ({ firstname, lastname, name, number }: PhoneContact) =>
  [firstname, lastname].filter(Boolean).join(' ') || name || number;

// Replaces the website sheet: links and QR codes mean nothing inside the game
export const InviteSheet: React.FC<InviteSheetProps> = ({ roomCode, onClose }) => {
  const [status, setStatus] = useState('');
  const components = (globalThis as unknown as { components?: LbPhoneComponents }).components;

  const handleInvite = () => {
    components?.setContactSelector?.({
      onSelect(contact) {
        setStatus('Envoi...');
        getSocket().emit('invite_contact', { roomCode, number: contact.number, senderName: savedName() }, (res: { success: boolean; error?: string }) => {
          setStatus(res.success ? `Invitation envoyée à ${contactName(contact)} !` : res.error ?? 'Message non envoyé.');
        });
      },
    });
  };

  const handleAirShare = () => {
    components?.setShareComponent?.({
      type: 'note',
      data: { title: 'Invitation JoSky', content: `Code du salon : ${roomCode}`, timestamp: Date.now() },
    });
  };

  return createPortal(
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
        {components?.setContactSelector && (
          <button
            type="button"
            onClick={handleInvite}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm cursor-pointer active:scale-98 transition"
          >
            <Contact className="w-4 h-4" />
            <span>Inviter un contact</span>
          </button>
        )}
        {components?.setShareComponent && (
          <button
            type="button"
            onClick={handleAirShare}
            className="btn-secondary w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-2xl font-bold text-sm cursor-pointer active:scale-98 transition"
          >
            <Share2 className="w-4 h-4" />
            <span>À proximité</span>
          </button>
        )}
        {status && <p role="status" className="text-sm text-felt-200 text-center mt-3">{status}</p>}
      </div>
    </div>,
    document.body
  );
};
