import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      'node_modules',
      'dist',
      // Exclude old test files that don't use vitest
      'src/test/api.test.ts',
      'src/test/run-tests.ts',
      'src/test/example.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.ts',
      ],
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
