import React, { useState, useEffect } from 'react';
import { BotLevel, GameState, MAX_PLAYERS } from '../types/game';
import { loadStats } from '../utils/stats';
import { 
  Users, 
  Play, 
  Bot, 
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

const DEFAULT_TARGET_SCORE = 100;

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
  const [copied, setCopied] = useState(false);
  const [botLevel, setBotLevel] = useState<BotLevel>('normal');
  const [stats] = useState(loadStats);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCodeInput(initialRoomCode);
    }
  }, [initialRoomCode]);

  const saveProfile = (name: string, avatar: string) => {
    localStorage.setItem('josky_name', name);
    localStorage.setItem('josky_avatar', avatar);
  };

  const handleCreate = () => {
    const finalName = playerName.trim() || 'Joueur 1';
    saveProfile(finalName, selectedAvatar);
    onCreateRoom(finalName, selectedAvatar, DEFAULT_TARGET_SCORE);
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
    onCreateRoom(finalName, selectedAvatar, DEFAULT_TARGET_SCORE, true);
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
                        {player.isBot ? `Bot ${BOT_LEVEL_LABELS[player.botLevel ?? 'normal']}` : player.isConnected ? 'Joueur en ligne' : 'Absent'}
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

      {/* The player's seat: an avatar and a name, directly on the felt */}
      <div className="w-full flex items-center gap-3 mb-3">
        <span className="avatar w-14 h-14 text-3xl flex-shrink-0">{selectedAvatar}</span>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Votre pseudo"
          aria-label="Votre pseudo"
          maxLength={15}
          className="flex-1 min-w-0 bg-transparent border-b-2 border-brass-300/40 px-1 py-1.5 text-xl font-bold text-white placeholder-felt-400 focus:outline-none focus:border-brass-300"
        />
      </div>

      <div className="w-full max-w-[280px] grid grid-cols-5 justify-items-center gap-2 mb-6">
        {AVATARS.map((avatar) => (
          <button
            key={avatar}
            type="button"
            onClick={() => setSelectedAvatar(avatar)}
            aria-label={`Choisir l'avatar ${avatar}`}
            aria-pressed={selectedAvatar === avatar}
            className={`avatar w-11 h-11 text-xl cursor-pointer active:scale-90 transition-transform ${
              selectedAvatar === avatar ? 'avatar-selected' : ''
            }`}
          >
            {avatar}
          </button>
        ))}
      </div>

      <div className="w-full flex flex-col gap-3">
        <button
          type="button"
          onClick={handleCreate}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-base transition active:scale-98 cursor-pointer ${
            initialRoomCode ? 'btn-secondary' : 'btn-primary'
          }`}
        >
          Créer le salon
        </button>

        <form onSubmit={handleJoin} className={`flex gap-2 ${initialRoomCode ? '-order-1' : ''}`}>
          <input
            type="text"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            placeholder="CODE"
            aria-label="Code du salon"
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            className="w-28 flex-shrink-0 bg-black/25 border border-brass-300/40 rounded-2xl px-2 text-center font-mono font-black text-lg tracking-widest text-brass-200 placeholder-felt-500 focus:outline-none focus:border-brass-300"
          />
          <button
            type="submit"
            disabled={!roomCodeInput.trim()}
            aria-label="Rejoindre la partie"
            className={`flex-1 py-3.5 px-4 rounded-2xl font-black text-base transition active:scale-98 cursor-pointer disabled:opacity-50 ${
              initialRoomCode ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            Rejoindre
          </button>
        </form>

        <button
          type="button"
          onClick={handleInstantSolo}
          className="w-full py-3 text-brass-200 font-bold active:scale-98 transition cursor-pointer"
        >
          Mode Solo rapide
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenRules}
        className="mt-1 text-xs text-felt-300 underline cursor-pointer"
      >
        Comment jouer ?
      </button>
    </div>
  );
};
