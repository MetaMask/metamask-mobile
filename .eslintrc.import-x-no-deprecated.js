/* eslint-disable import-x/no-commonjs */
/**
 * EXPERIMENT CONFIG — swap `@typescript-eslint/no-deprecated` → `import-x/no-deprecated`.
 * Benchmark/review only. Run (wrap in /usr/bin/time -p; eslint prints no timing):
 *   /usr/bin/time -p yarn eslint '**\/*.{js,ts,tsx}' --no-eslintrc -c .eslintrc.import-x-no-deprecated.js --no-cache
 *
 * Inherits the real config; only the 3 deltas below. `parserOptions.project`
 * stays on, so other type-aware rules keep working.
 */
module.exports = {
  extends: ['./.eslintrc.js'],

  rules: {
    // 1. Add resolver-based replacement (no TS program; also covers .js/.jsx).
    'import-x/no-deprecated': 'warn',
  },

  settings: {
    // 2. Ignore ONLY the deps import-x can't parse (Flow/other), by exact package
    //    dir (trailing slash so react-native-* siblings aren't caught). This kills
    //    the parse-error noise while keeping deprecation/named-export coverage for
    //    the rest of node_modules.
    'import-x/ignore': [
      '/node_modules/react-native/',
      '/node_modules/react-native-view-shot/',
      '/node_modules/react-native-i18n/',
    ],
  },

  overrides: [
    {
      // 3. Disable the type-aware rule we're replacing (the ~30% cost).
      files: ['*.{ts,tsx}'],
      rules: { '@typescript-eslint/no-deprecated': 'off' },
    },
  ],
};
