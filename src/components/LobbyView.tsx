import React, { useState, useEffect } from 'react';
import { BotLevel, GameState, MAX_PLAYERS } from '../types/game';
import { loadStats } from '../utils/stats';
import { Bot, Crown, Play, Share2, Trash2 } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';
import { InviteSheet } from './InviteSheet';
import { PWAInstallButton } from './PWAInstallButton';
import { IS_PHONE_APP } from '../platform';

interface LobbyViewProps {
  gameState: GameState | null;
  currentUserId: string;
  isHost: boolean;
  initialRoomCode?: string;
  resumeRoomCode?: string;
  onResumeGame: () => void;
  onDismissResume: () => void;
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

const AVATAR_NAMES: Record<string, string> = {
  '🦊': 'Renard', '🐼': 'Panda', '🦁': 'Lion', '🐯': 'Tigre', '🐨': 'Koala',
  '🐸': 'Grenouille', '🦄': 'Licorne', '🐙': 'Poulpe', '🦉': 'Hibou', '🐺': 'Loup',
};

// Two friends must never meet as two identical "Joueur 1"
function createProfile() {
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  return { avatar, name: `${AVATAR_NAMES[avatar]}${10 + Math.floor(Math.random() * 90)}` };
}

function loadProfile() {
  const fresh = createProfile();
  try {
    const name = localStorage.getItem('josky_name');
    return {
      name: name && name !== 'Joueur 1' ? name : fresh.name,
      avatar: localStorage.getItem('josky_avatar') || fresh.avatar,
    };
  } catch {
    return fresh;
  }
}

const TARGET_SCORES = [
  { value: 100, label: '100 points' },
  { value: 60, label: '60 points' },
  { value: 1, label: '1 manche' },
];

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
  resumeRoomCode = '',
  onResumeGame,
  onDismissResume,
  onCreateRoom,
  onJoinRoom,
  onAddBot,
  onRemoveBot,
  onUpdateSettings,
  onStartGame,
  onLeaveRoom,
  onOpenRules,
}) => {
  const [initialProfile] = useState(loadProfile);
  const [playerName, setPlayerName] = useState(initialProfile.name);
  const [selectedAvatar, setSelectedAvatar] = useState(initialProfile.avatar);
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [isInviting, setIsInviting] = useState(false);
  const [botLevel, setBotLevel] = useState<BotLevel>('normal');
  const [stats] = useState(loadStats);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCodeInput(initialRoomCode);
    }
  }, [initialRoomCode]);

  const saveProfile = (name: string, avatar: string) => {
    try {
      localStorage.setItem('josky_name', name);
      localStorage.setItem('josky_avatar', avatar);
    } catch {}
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

  // Inside Room Lobby
  if (gameState && gameState.phase === 'lobby') {
    const canStart = gameState.players.length >= 2;
    const canAddPlayer = gameState.players.length < MAX_PLAYERS;

    return (
      <div className="w-full max-w-md mx-auto p-4 sm:p-6 flex flex-col items-center">
        {/* Room code, the first thing to share */}
        <p className="text-sm text-felt-200 mt-2">Code du salon</p>
        <div className="font-title text-5xl text-brass-200 tracking-widest my-1">
          {gameState.roomCode}
        </div>
        <button
          type="button"
          onClick={() => setIsInviting(true)}
          className="mt-2 btn-secondary inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold cursor-pointer active:scale-98 transition"
        >
          <Share2 className="w-4 h-4" />
          <span>Inviter des amis</span>
        </button>
        {isInviting && <InviteSheet roomCode={gameState.roomCode} onClose={() => setIsInviting(false)} />}

        {/* Game length */}
        <div className="w-full mt-6">
          {isHost ? (
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-black/20" role="group" aria-label="Objectif de partie">
              {TARGET_SCORES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onUpdateSettings(value)}
                  aria-pressed={gameState.targetScore === value}
                  className={`py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                    gameState.targetScore === value ? 'btn-primary' : 'text-felt-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-felt-200">
              Partie en <strong className="text-brass-200">{gameState.targetScore === 1 ? '1 manche' : `${gameState.targetScore} points`}</strong>
            </p>
          )}
        </div>

        {/* Players */}
        <div className="w-full mt-6 mb-5">
          <h3 className="text-xl text-white mb-2">
            Joueurs prêts ({gameState.players.length}/{MAX_PLAYERS})
          </h3>

          <div className="divide-y divide-brass-300/15 border-y border-brass-300/15">
            {gameState.players.map((player) => {
              const isMe = player.id === currentUserId;

              return (
                <div key={player.id} className="flex items-center gap-3 py-2">
                  <span className="avatar w-10 h-10 text-xl flex-shrink-0">{player.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-sm truncate ${isMe ? 'text-brass-200' : 'text-white'}`}>
                        {player.name} {isMe && '(Vous)'}
                      </span>
                      {player.isHost && <Crown className="w-3.5 h-3.5 text-brass-300 flex-shrink-0" />}
                    </div>
                    <span className="text-xs text-felt-300">
                      {player.isBot
                        ? `Bot ${BOT_LEVEL_LABELS[player.botLevel ?? 'normal']}`
                        : player.isConnected ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>

                  {isHost && player.isBot && (
                    <button
                      type="button"
                      onClick={() => onRemoveBot(player.id)}
                      aria-label={`Retirer ${player.name}`}
                      className="p-2 rounded-lg text-felt-300 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isHost && canAddPlayer && (
            <div className="flex items-center justify-end gap-2 mt-3">
              <select
                value={botLevel}
                onChange={(e) => setBotLevel(e.target.value as BotLevel)}
                aria-label="Niveau du bot"
                className="bg-black/20 border border-brass-300/30 text-felt-100 rounded-xl px-2 py-2 text-sm font-bold cursor-pointer"
              >
                {Object.entries(BOT_LEVEL_LABELS).map(([level, label]) => (
                  <option key={level} value={level} className="text-black">{label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onAddBot(botLevel)}
                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold cursor-pointer active:scale-98 transition"
              >
                <Bot className="w-4 h-4" />
                <span>+ Bot</span>
              </button>
            </div>
          )}
        </div>

        {/* Start Button / Waiting message */}
        {isHost ? (
          <button
            type="button"
            disabled={!canStart}
            onClick={onStartGame}
            className={`sticky bottom-1 z-10 w-full py-3.5 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition transform active:scale-98 cursor-pointer disabled:cursor-default ${
              canStart ? 'btn-primary' : 'bg-felt-950/80 text-felt-200 text-sm'
            }`}
          >
            {canStart ? (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Lancer la partie !</span>
              </>
            ) : (
              <span>Invitez un ami ou ajoutez un bot</span>
            )}
          </button>
        ) : (
          <div className="sticky bottom-1 z-10 w-full py-3 px-4 rounded-2xl bg-felt-950/80 text-center text-sm text-felt-200 flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brass-300 animate-ping"></span>
            <span>En attente du lancement par l'hôte...</span>
          </div>
        )}
      </div>
    );
  }

  // Initial Welcome / Create / Join screen
  const isInvited = Boolean(initialRoomCode && !resumeRoomCode);

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 flex flex-col items-center">
      {/* Title lockup */}
      <div className="text-center my-3 sm:my-5 flex flex-col items-center">
        <AnimatedLogo />
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
              <div className="text-lg font-black text-brass-300 tabular-nums">{item.value}</div>
              <div className="text-[11px] text-felt-400 font-semibold">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* The player's seat: an avatar and a name, directly on the felt */}
      <div className="w-full flex items-center gap-3 mb-3">
        <span className="avatar w-14 h-14 text-3xl flex-shrink-0">{selectedAvatar}</span>
        {!IS_PHONE_APP && (
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Votre pseudo"
            aria-label="Votre pseudo"
            maxLength={15}
            className="flex-1 min-w-0 bg-transparent border-b-2 border-brass-300/40 px-1 py-2 text-xl font-bold text-white placeholder-felt-400 focus:outline-none focus:border-brass-300"
          />
        )}
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
        {resumeRoomCode && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onResumeGame}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-base transition active:scale-98 cursor-pointer btn-primary"
            >
              Reprendre ma partie ({resumeRoomCode})
            </button>
            <button
              type="button"
              onClick={onDismissResume}
              className="text-xs text-felt-300 underline cursor-pointer"
            >
              Ne pas reprendre
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleCreate}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-base transition active:scale-98 cursor-pointer ${
            isInvited || resumeRoomCode ? 'btn-secondary' : 'btn-primary'
          }`}
        >
          Créer le salon
        </button>

        <form onSubmit={handleJoin} className={`flex gap-2 ${isInvited ? '-order-1' : ''}`}>
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
              isInvited ? 'btn-primary' : 'btn-secondary'
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
        className="px-3 py-3 text-xs text-felt-300 underline cursor-pointer"
      >
        Comment jouer ?
      </button>
    </div>
  );
};
