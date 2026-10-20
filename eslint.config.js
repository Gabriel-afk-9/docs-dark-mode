import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      // O PRD proíbe `any` explícito (RNF-03).
      '@typescript-eslint/no-explicit-any': 'error',
      // Sem `console.log` disperso em produção (RF-10).
      'no-console': 'error',
    },
  },
  {
    // O logger é o único ponto autorizado a escrever no console.
    files: ['src/shared/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        URL: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      // Os scripts de build podem reportar progresso no terminal.
      'no-console': 'off',
    },
  },
);
