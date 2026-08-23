import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    environment: 'node',
    passWithNoTests: false,
    clearMocks: true,
    restoreMocks: true,
  },
});
