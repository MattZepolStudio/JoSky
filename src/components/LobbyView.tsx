import React, { useState, useEffect } from 'react';
import { BotLevel, GameState, MAX_PLAYERS } from '../types/game';
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
        <div className="w-full bg-felt-900 border border-felt-800 rounded-3xl p-5 sm:p-6 shadow-xl mb-4 text-center">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-felt-400 uppercase tracking-widest">
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

          <div className="bg-felt-950/80 border border-felt-800 rounded-2xl p-4 mb-4">
            <span className="text-xs text-felt-400 block mb-1">Code du salon :</span>
            <div className="text-3xl sm:text-4xl font-black text-brass-400 font-mono tracking-widest drop-shadow">
              {gameState.roomCode}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="mt-3 inline-flex items-center gap-1.5 bg-brass-600/30 hover:bg-brass-600/50 border border-brass-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-brass-200 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-brass-400" />
                  <span className="text-brass-300">Lien copié dans le presse-papier !</span>
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
          <div className="flex items-center justify-between text-xs text-felt-300 bg-felt-950/40 p-3 rounded-xl border border-felt-800/80">
            <span>Objectif de partie :</span>
            {isHost ? (
              <select
                value={gameState.targetScore}
                onChange={(e) => onUpdateSettings(Number(e.target.value))}
                className="bg-felt-800 border border-felt-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer"
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
        <div className="w-full bg-felt-900 border border-felt-800 rounded-3xl p-5 shadow-xl mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brass-400" />
              <h3 className="font-bold text-sm text-white">
                Joueurs prêts ({gameState.players.length}/{MAX_PLAYERS})
              </h3>
            </div>
            {isHost && gameState.players.length < MAX_PLAYERS && (
              <div className="flex items-center gap-1">
                <select
                  value={botLevel}
                  onChange={(e) => setBotLevel(e.target.value as BotLevel)}
                  aria-label="Niveau du bot"
                  className="bg-felt-800 border border-felt-700 text-white rounded-lg px-1.5 py-1 text-xs font-bold cursor-pointer"
                >
                  {Object.entries(BOT_LEVEL_LABELS).map(([level, label]) => (
                    <option key={level} value={level}>{label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onAddBot(botLevel)}
                  className="inline-flex items-center gap-1 text-xs bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-xl font-bold transition cursor-pointer"
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
                  className="flex items-center justify-between p-3 rounded-2xl bg-felt-950/60 border border-felt-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{player.avatar}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-sm ${isMe ? 'text-brass-300' : 'text-felt-200'}`}>
                          {player.name} {isMe && '(Vous)'}
                        </span>
                        {player.isHost && (
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>
                      <span className="text-[11px] text-felt-400">
                        {player.isBot ? `Bot ${BOT_LEVEL_LABELS[player.botLevel ?? 'normal']}` : 'Joueur en ligne'}
                      </span>
                    </div>
                  </div>

                  {isHost && player.isBot && (
                    <button
                      type="button"
                      onClick={() => onRemoveBot(player.id)}
                      className="p-1.5 rounded-lg text-felt-500 hover:text-rose-400 transition"
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
            className="sticky bottom-1 z-10 w-full py-3.5 px-6 rounded-2xl btn-primary disabled:opacity-40 disabled:pointer-events-none font-black text-base flex items-center justify-center gap-2 transition transform active:scale-98 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Lancer la partie !</span>
          </button>
        ) : (
          <div className="sticky bottom-1 z-10 w-full py-3 px-4 rounded-2xl bg-felt-900 border border-felt-800 text-center text-xs text-felt-400 flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brass-400 animate-ping"></span>
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
        <img
          src="/icon-512.png"
          alt="JoSky"
          className="w-32 h-32 sm:w-36 sm:h-36 drop-shadow-2xl"
        />
        <p className="text-sm text-felt-200 mt-2 mb-2">
          Le jeu de cartes entre amis
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
            <div key={item.label} className="bg-felt-900 border border-felt-800 rounded-2xl p-2">
              <div className="text-lg font-black text-amber-400 tabular-nums">{item.value}</div>
              <div className="text-[10px] text-felt-400 font-semibold">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Setup Box */}
      <div className="w-full bg-felt-900 border border-felt-800 rounded-3xl p-5 shadow-xl mb-4">
        <label className="text-xs font-bold text-felt-300 block mb-1.5 uppercase tracking-wider">
          Votre pseudo :
        </label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Entrez votre nom..."
          maxLength={15}
          className="w-full bg-felt-950 border border-felt-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white placeholder-felt-500 focus:outline-none focus:border-brass-500 mb-3"
        />

        <label className="text-xs font-bold text-felt-300 block mb-1.5 uppercase tracking-wider">
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
                  ? 'bg-brass-600/40 border-2 border-brass-400 scale-105 shadow-md shadow-brass-500/20'
                  : 'bg-felt-950/60 border border-felt-800 hover:border-felt-700'
              } cursor-pointer`}
            >
              {avatar}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs: Créer / Rejoindre */}
      <div className="w-full bg-felt-900 border border-felt-800 rounded-3xl p-5 shadow-xl">
        <div className="grid grid-cols-2 gap-2 p-1 bg-felt-950 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-2 text-xs font-extrabold rounded-xl transition cursor-pointer ${
              activeTab === 'create'
                ? 'bg-brass-600 text-white shadow'
                : 'text-felt-400 hover:text-white'
            }`}
          >
            Créer un salon
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`py-2 text-xs font-extrabold rounded-xl transition cursor-pointer ${
              activeTab === 'join'
                ? 'bg-brass-600 text-white shadow'
                : 'text-felt-400 hover:text-white'
            }`}
          >
            Rejoindre un salon
          </button>
        </div>

        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-felt-300 block mb-1.5">
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
                        ? 'bg-brass-600/30 border-brass-400 text-white font-black'
                        : 'bg-felt-950/60 border-felt-800 text-felt-400 hover:text-felt-200'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-felt-500">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl btn-primary font-black text-sm flex items-center justify-center gap-2 transition transform active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Créer le salon & inviter</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-felt-300 block mb-1.5">
                Code du salon à rejoindre :
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="Ex: JOSK"
                maxLength={6}
                className="w-full bg-felt-950 border border-felt-700 rounded-xl px-3.5 py-2.5 text-center font-mono font-black text-xl tracking-widest text-brass-400 placeholder-felt-600 focus:outline-none focus:border-brass-400"
              />
            </div>

            <button
              type="submit"
              disabled={!roomCodeInput.trim()}
              className="w-full py-3.5 px-4 rounded-2xl btn-primary disabled:opacity-40 font-black text-sm flex items-center justify-center gap-2 transition transform active:scale-98 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Rejoindre la partie</span>
            </button>
          </form>
        )}
      </div>

      {/* Rules link & Solo test button */}
      <div className="w-full mt-3 flex flex-col items-center gap-3 text-sm">
        <button
          type="button"
          onClick={handleInstantSolo}
          className="w-full py-3 px-4 rounded-2xl border border-brass-300/50 bg-black/15 text-brass-200 font-bold active:scale-98 transition cursor-pointer"
        >
          Mode Solo rapide
        </button>

        <button
          type="button"
          onClick={onOpenRules}
          className="text-felt-400 hover:text-white flex items-center gap-1.5 cursor-pointer underline"
        >
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>Comment jouer au JoSky ?</span>
        </button>
      </div>
    </div>
  );
};
