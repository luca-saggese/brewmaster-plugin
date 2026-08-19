import { defineConfig } from 'tsdown';

import { rawTextPlugin } from '../../../../build/raw-text-plugin.mjs';

export default defineConfig({
  entry: ['./src/server.ts'],
  format: ['esm'],
  platform: 'node',
  dts: false,
  outDir: 'dist',
  clean: true,
  minify: false,
  noExternal: [/.*/],
  plugins: [rawTextPlugin()],
});
