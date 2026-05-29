import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup-env.ts'],
    testTimeout: 15000,
    reporters: ['default', 'junit'],
    outputFile: { junit: './ctrf/junit.xml' },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test/**'],
    },
  },
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, './src') + '/',
    },
  },
});
