import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx', 'src/cli.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  outDir: 'dist',
  external: ['react', 'ink'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.jsxImportSource = 'react';
  },
  banner: {
    js: '// @engineering-process/tui - Terminal UI for engineering-process plugin',
  },
});
