import { defineConfig } from 'vitest/config';

// Without an explicit config, Vitest picks up astro.config.mjs and roots
// itself in dist/. These tests read the build output from the project root.
export default defineConfig({
  test: {
    root: import.meta.dirname,
    include: ['tests/**/*.test.ts'],
  },
});
