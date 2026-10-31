import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { AddressInfo } from 'node:net';
import { createFileStore, createUpstashStore } from '../src/server/roomStore.ts';

test('le fichier de sauvegarde restitue le contenu écrit', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'josky-'));
  const store = createFileStore(path.join(dir, 'sub', 'rooms.json'));
  assert.equal(await store.load(), null);
  await store.save('[1,2]');
  assert.equal(await store.load(), '[1,2]');
  await fs.rm(dir, { recursive: true });
});

test('Upstash reçoit les bonnes commandes REST', async () => {
  const data = new Map<string, string>();
  const auth: (string | undefined)[] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      auth.push(req.headers.authorization);
      const [command, key, value] = JSON.parse(body);
      if (command === 'SET') data.set(key, value);
      res.end(JSON.stringify({ result: command === 'GET' ? data.get(key) ?? null : 'OK' }));
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

  const { port } = server.address() as AddressInfo;
  const store = createUpstashStore(`http://127.0.0.1:${port}`, 'secret');
  assert.equal(await store.load(), null);
  await store.save('[3]');
  assert.equal(await store.load(), '[3]');
  assert.ok(auth.every(value => value === 'Bearer secret'));
  server.close();
});
