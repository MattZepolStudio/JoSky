import React, { useState, useEffect } from 'react';
import { BotLevel, GameState } from '../types/game';
import { loadStats } from '../utils/stats';
import { 
  Users, 
  Play, 
  Bot, 
  Sparkles, 
  Copy, 
  Check, 
  Share2, 
  Crown, 
  LogOut, 
  Plus, 
  Trash2,
  Gamepad2,
  HelpCircle
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface LobbyViewProps {
  gameState: GameState | null;
  currentUserId: string;
  isHost: boolean;
  initialRoomCode?: string;
  onCreateRoom: (playerName: string, avatar: string, targetScore: number, solo?: boolean) => void;
  onJoinRoom: (roomCode: string, playerName: string, avatar: string) => void;
  onAddBot: (level: BotLevel) => void;
  onRemoveBot: (botId: string) => void;
  onUpdateSettings: (targetScore: number) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onOpenRules: () => void;
}

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐨', '🐸', '🦄', '🐙', '🦉', '🐺'];

const BOT_LEVEL_LABELS: Record<BotLevel, string> = {
  easy: 'Facile',
  normal: 'Normal',
  hard: 'Difficile',
};

export const LobbyView: React.FC<LobbyViewProps> = ({
  gameState,
  currentUserId,
  isHost,
  initialRoomCode = '',
  onCreateRoom,
  onJoinRoom,
  onAddBot,
  onRemoveBot,
  onUpdateSettings,
  onStartGame,
  onLeaveRoom,
  onOpenRules,
}) => {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('josky_name') || 'Joueur 1';
  });
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    return localStorage.getItem('josky_avatar') || '🦊';
  });
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [targetScore, setTargetScore] = useState(100);
  const [copied, setCopied] = useState(false);
  const [botLevel, setBotLevel] = useState<BotLevel>('normal');
  const [stats] = useState(loadStats);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCodeInput(initialRoomCode);
      setActiveTab('join');
    }
  }, [initialRoomCode]);

  const saveProfile = (name: string, avatar: string) => {
    localStorage.setItem('josky_name', name);
    localStorage.setItem('josky_avatar', avatar);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = playerName.trim() || 'Joueur 1';
    saveProfile(finalName, selectedAvatar);
    onCreateRoom(finalName, selectedAvatar, targetScore);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = playerName.trim() || 'Joueur 2';
    saveProfile(finalName, selectedAvatar);
    onJoinRoom(roomCodeInput.toUpperCase().trim(), finalName, selectedAvatar);
  };

  const handleInstantSolo = () => {
    const finalName = playerName.trim() || 'Joueur';
    saveProfile(finalName, selectedAvatar);
    onCreateRoom(finalName, selectedAvatar, targetScore, true);
  };

  const handleCopyLink = async () => {
    if (!gameState) return;
    const url = `${window.location.origin}?room=${gameState.roomCode}`;
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

  // Inside Room Lobby
  if (gameState && gameState.phase === 'lobby') {
    const canStart = gameState.players.length >= 2;

    return (
      <div className="w-full max-w-lg mx-auto p-4 sm:p-6 flex flex-col items-center">
        {/* Room Header Card */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl mb-4 text-center">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Salon d'attente
            </span>
            <button
              type="button"
              onClick={onLeaveRoom}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Quitter
            </button>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-4">
            <span className="text-xs text-slate-400 block mb-1">Code du salon :</span>
            <div className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono tracking-widest drop-shadow">
              {gameState.roomCode}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="mt-3 inline-flex items-center gap-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-200 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Lien copié dans le presse-papier !</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Inviter des amis (Copier le lien)</span>
                </>
              )}
            </button>
          </div>

          {/* Target Score Settings */}
          <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
            <span>Objectif de partie :</span>
            {isHost ? (
              <select
                value={gameState.targetScore}
                onChange={(e) => onUpdateSettings(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer"
              >
                <option value={100}>100 points (Standard)</option>
                <option value={60}>60 points (Partie rapide)</option>
                <option value={1}>1 manche unique (Express)</option>
              </select>
            ) : (
              <span className="font-bold text-amber-400">
                {gameState.targetScore === 1 ? '1 manche express' : `${gameState.targetScore} points`}
              </span>
            )}
          </div>
        </div>

        {/* Players List Card */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm text-white">
                Joueurs prêts ({gameState.players.length}/8)
              </h3>
            </div>
            {isHost && gameState.players.length < 8 && (
              <div className="flex items-center gap-1">
                <select
                  value={botLevel}
                  onChange={(e) => setBotLevel(e.target.value as BotLevel)}
                  aria-label="Niveau du bot"
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-1.5 py-1 text-xs font-bold cursor-pointer"
                >
                  {Object.entries(BOT_LEVEL_LABELS).map(([level, label]) => (
                    <option key={level} value={level}>{label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onAddBot(botLevel)}
                  className="inline-flex items-center gap-1 text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-xl font-bold transition cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>+ Bot</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {gameState.players.map((player) => {
              const isMe = player.id === currentUserId;

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{player.avatar}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-sm ${isMe ? 'text-cyan-300' : 'text-slate-200'}`}>
                          {player.name} {isMe && '(Vous)'}
                        </span>
                        {player.isHost && (
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {player.isBot ? `Bot ${BOT_LEVEL_LABELS[player.botLevel ?? 'normal']}` : 'Joueur en ligne'}
                      </span>
                    </div>
                  </div>

                  {isHost && player.isBot && (
                    <button
                      type="button"
                      onClick={() => onRemoveBot(player.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition"
                      title="Retirer le bot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {!canStart && (
            <div className="mt-4 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 text-center flex items-center justify-center gap-1.5">
              <span>⚠️ Il faut au moins 2 joueurs (ou un Bot IA) pour débuter.</span>
            </div>
          )}
        </div>

        {/* Start Button / Waiting message */}
        {isHost ? (
          <button
            type="button"
            disabled={!canStart}
            onClick={onStartGame}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition transform active:scale-98 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Lancer la partie !</span>
          </button>
        ) : (
          <div className="w-full py-3 px-4 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span>En attente du lancement par l'hôte...</span>
          </div>
        )}
      </div>
    );
  }

  // Initial Welcome / Create / Join screen
  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 flex flex-col items-center">
      {/* Title lockup */}
      <div className="text-center my-3 sm:my-5 flex flex-col items-center">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 via-rose-500 to-amber-500 shadow-xl shadow-indigo-500/20 mb-2 sm:mb-3">
          <Gamepad2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-wider font-display">
          JOSKY
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5 mb-2">
          Jeu de cartes multijoueur en ligne & temps réel
        </p>
        <PWAInstallButton />
      </div>

      {/* Local player stats */}
      {stats.gamesPlayed > 0 && (
        <div className="w-full grid grid-cols-3 gap-2 mb-4 text-center">
          {[
            { label: 'Parties', value: stats.gamesPlayed },
            { label: 'Victoires', value: stats.wins },
            { label: 'Meilleur score', value: stats.bestScore ?? '—' },
          ].map((item) => (
            <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-2">
              <div className="text-lg font-black text-amber-400 tabular-nums">{item.value}</div>
              <div className="text-[10px] text-slate-400 font-semibold">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Setup Box */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl mb-4">
        <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
          Votre pseudo :
        </label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Entrez votre nom..."
          maxLength={15}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 mb-3"
        />

        <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
          Choisissez votre avatar :
        </label>
        <div className="grid grid-cols-5 gap-2">
          {AVATARS.map((avatar) => (
            <button
              key={avatar}
              type="button"
              onClick={() => setSelectedAvatar(avatar)}
              className={`p-2 rounded-xl text-xl flex items-center justify-center transition-all ${
                selectedAvatar === avatar
                  ? 'bg-indigo-600/40 border-2 border-indigo-400 scale-105 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-950/60 border border-slate-800 hover:border-slate-700'
              } cursor-pointer`}
            >
              {avatar}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs: Créer / Rejoindre */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-2 text-xs font-extrabold rounded-xl transition cursor-pointer ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Créer un salon
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`py-2 text-xs font-extrabold rounded-xl transition cursor-pointer ${
              activeTab === 'join'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rejoindre un salon
          </button>
        </div>

        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Objectif de points :
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 100, label: '100 pts', sub: 'Standard' },
                  { val: 60, label: '60 pts', sub: 'Rapide' },
                  { val: 1, label: '1 Manche', sub: 'Express' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setTargetScore(item.val)}
                    className={`p-2 rounded-xl text-center border transition cursor-pointer ${
                      targetScore === item.val
                        ? 'bg-indigo-600/30 border-indigo-400 text-white font-black'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-500">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition transform active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Créer le salon & inviter</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Code du salon à rejoindre :
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="Ex: JOSK"
                maxLength={6}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-center font-mono font-black text-xl tracking-widest text-cyan-400 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={!roomCodeInput.trim()}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition transform active:scale-98 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Rejoindre la partie</span>
            </button>
          </form>
        )}
      </div>

      {/* Rules link & Solo test button */}
      <div className="w-full mt-4 flex items-center justify-between px-2 text-xs">
        <button
          type="button"
          onClick={onOpenRules}
          className="text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer underline"
        >
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>Comment jouer au JoSky ?</span>
        </button>

        <button
          type="button"
          onClick={handleInstantSolo}
          className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
        >
          🎮 Mode Solo rapide
        </button>
      </div>
    </div>
  );
};
