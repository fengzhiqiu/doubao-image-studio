import { defineConfig, type Plugin } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function fixServiceWorkerManifest(): Plugin {
  return {
    name: 'fix-service-worker-manifest',
    closeBundle() {
      const manifestPath = resolve(__dirname, 'dist/manifest.json');
      const content = JSON.parse(readFileSync(manifestPath, 'utf8'));
      content.background.service_worker = 'assets/background.ts.js';
      writeFileSync(manifestPath, JSON.stringify(content, null, 2));
    },
  };
}

export default defineConfig({
  plugins: [
    crx({ manifest }),
    fixServiceWorkerManifest(),
  ],
  build: {
    rollupOptions: {
      input: {
        hook: 'src/hook.ts',
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
