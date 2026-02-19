import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginPlaywright from 'eslint-plugin-playwright';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: [
      'node_modules/',
      'dist/',
      'playwright-report/',
      'test-results/',
      'allure-report/',
      'allure-results/',
      'coverage/',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Playwright configuration
    ...pluginPlaywright.configs['flat/recommended'],
    files: ['tests/**'],
  },
  eslintPluginPrettierRecommended,
  {
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
