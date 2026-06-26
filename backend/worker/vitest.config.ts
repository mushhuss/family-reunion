import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Only run tests for pure utility functions — routes require the Cloudflare runtime
    include: ['src/utils.test.ts'],
  },
})
