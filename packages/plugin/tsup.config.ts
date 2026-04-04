import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'agents-companion': 'src/companion/index.ts',
    'agents-worker': 'src/companion/worker.ts',
  },
  format: ['cjs'],
  outDir: 'scripts',
  outExtension: () => ({ js: '.cjs' }),
  splitting: false,
  sourcemap: false,
  clean: true,
  bundle: true,
  noExternal: [/.*/],
});
