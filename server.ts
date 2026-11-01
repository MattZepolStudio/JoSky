import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createGameServer } from './src/server/gameServer.ts';
import { createRoomStore } from './src/server/roomStore.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = express();
const httpServer = http.createServer(app);
// Short heartbeat: a phone that lost the network is noticed in under 20 seconds
const io = new Server(httpServer, { maxHttpBufferSize: 16_000, pingInterval: 10_000, pingTimeout: 8_000 });
const store = createRoomStore(process.env);
const game = createGameServer({ io, store, env: process.env });

// Instant healthcheck routes for Render and cloud uptime monitors
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'healthy', uptime: Math.floor(process.uptime()), timestamp: Date.now() });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', rooms: game.roomCount() });
});

// Configure Vite middleware in development or serve static in production
async function startServer() {
  console.log(`🚀 JoSky starting up (PORT=${PORT}, NODE_ENV=${process.env.NODE_ENV || 'development'})...`);
  await game.start();

  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || hasDist;

  if (isProd && hasDist) {
    // File names under /assets contain a content hash, so they can be cached forever
    app.use('/assets', express.static(path.resolve(distPath, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use('/assets', (_req, res) => {
      res.sendStatus(404);
    });
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('📦 Serving production static build from dist/');
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('⚡ Serving development mode with Vite middleware');
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ JoSky server listening on 0.0.0.0:${PORT}`);
  });
}

// Graceful shutdown handling for container restarts on Render
async function shutdown(signal: string) {
  console.log(`${signal} signal received: saving rooms and closing HTTP server`);
  await game.saveNow();
  io.close(() => {
    console.log('HTTP server closed cleanly');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
