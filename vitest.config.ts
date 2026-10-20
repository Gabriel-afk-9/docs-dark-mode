import { defineConfig } from 'vitest/config';

export default defineConfig({
  // O diagnóstico do logger fica desligado nos testes, como em produção.
  define: {
    __DDM_DEBUG__: false,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
