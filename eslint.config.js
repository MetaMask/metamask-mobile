const js = require('@eslint/js');
const globals = require('globals');
const importPlugin = require('eslint-plugin-import');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts,tsx}'],
    ignores: ['**/node_modules/**', '**/build/**', '**/dist/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        ...Object.fromEntries(
          Object.entries({
            ...globals.browser,
            ...globals.node,
            ...globals.jest,
          }).map(([key, value]) => [key.trim(), value])
        ),
        expect: 'readonly',
        driver: 'readonly',
        device: 'readonly',
        element: 'readonly',
        by: 'readonly',
        __DEV__: 'readonly',
        $: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Temporarily disable problematic import plugin rules
      'import/no-unresolved': 'off',
      'import/named': 'off',
      'import/namespace': 'off',
      'import/default': 'off',
      'import/export': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',

      // Basic ESLint rules
      'no-undef': 'error',
    },
  },
];
