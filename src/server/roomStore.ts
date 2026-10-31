import fs from 'fs/promises';
import path from 'path';

// Saves the rooms snapshot, which contains player secrets: keep it private.
export interface RoomStore {
  load(): Promise<string | null>;
  save(snapshot: string): Promise<void>;
}

const UPSTASH_KEY = 'josky:rooms';
const SNAPSHOT_TTL_SECONDS = 24 * 60 * 60;

export function createFileStore(filePath: string): RoomStore {
  return {
    async load() {
      try {
        return await fs.readFile(filePath, 'utf8');
      } catch {
        return null;
      }
    },
    async save(snapshot) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, snapshot, 'utf8');
      await fs.rename(tempPath, filePath);
    },
  };
}

export function createUpstashStore(url: string, token: string): RoomStore {
  const command = async (args: (string | number)[]) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Upstash a répondu ${res.status}`);
    return (await res.json()) as { result: string | null };
  };

  return {
    async load() {
      const { result } = await command(['GET', UPSTASH_KEY]);
      return result;
    },
    async save(snapshot) {
      await command(['SET', UPSTASH_KEY, snapshot, 'EX', SNAPSHOT_TTL_SECONDS]);
    },
  };
}

export function createRoomStore(env: NodeJS.ProcessEnv): RoomStore {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return createUpstashStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  }
  return createFileStore(env.DATA_FILE || path.resolve('.data', 'rooms.json'));
}
