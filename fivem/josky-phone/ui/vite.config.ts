import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const phoneFile = (file: string) => path.resolve(__dirname, 'src', file);

// Same game code as the website: only these files differ on the phone
export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^.*\/services\/socket$/, replacement: phoneFile('phoneSocket.ts') },
      { find: /^.*\/InviteSheet$/, replacement: phoneFile('PhoneInviteSheet.tsx') },
      { find: /^.*\/PWAInstallButton$/, replacement: phoneFile('NoInstallButton.tsx') },
      { find: /^.*\/platform$/, replacement: phoneFile('platform.ts') },
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
