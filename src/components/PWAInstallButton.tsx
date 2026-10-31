import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition cursor-pointer ${
          compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        }`}
        title="Installer JoSky sur votre appareil"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 font-bold hover:text-white transition cursor-pointer active:scale-95 ${
            compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
          }`}
          title="Installer sur iPhone / iPad"
        >
          <Share className="w-3.5 h-3.5 text-amber-400" />
          <span>Installer</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
            <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Share className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-white">Installer sur iOS</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Pour ajouter <strong>JoSky</strong> à votre écran d&apos;accueil sans les barres Safari :
                <br /><br />
                1. Touchez l&apos;icône <strong>Partager</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-amber-400" /> en bas de Safari.<br />
                2. Faites défiler et touchez <strong>Sur l&apos;écran d&apos;accueil</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white transition active:scale-95"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
