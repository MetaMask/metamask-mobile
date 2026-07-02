/* eslint-disable import-x/no-commonjs */
/**
 * EXPERIMENT CONFIG — drop all type-aware linting (Experiment 3).
 * Benchmark/review only. Run (wrap in /usr/bin/time -p; eslint prints no timing):
 *   /usr/bin/time -p yarn eslint '**\/*.{js,ts,tsx}' --no-eslintrc -c .eslintrc.no-type-aware.js --no-cache
 *
 * Inherits the real config but removes `parserOptions.project` (the whole-project
 * TS program build) and switches OFF every type-aware rule so ESLint doesn't error
 * out demanding type info. ⚠️ This disables ALL type-aware rules, not just
 * no-deprecated.
 */

// Type-aware rules (need `parserOptions.project`); set to 'off' so dropping the
// program is safe. Most are already off in the base config; this is belt-and-braces.
const TYPE_AWARE_RULES_OFF = Object.fromEntries(
  [
    'await-thenable',
    'consistent-type-exports',
    'dot-notation',
    'naming-convention',
    'no-array-delete',
    'no-base-to-string',
    'no-confusing-void-expression',
    'no-deprecated',
    'no-duplicate-type-constituents',
    'no-floating-promises',
    'no-for-in-array',
    'no-implied-eval',
    'no-meaningless-void-operator',
    'no-misused-promises',
    'no-mixed-enums',
    'no-redundant-type-constituents',
    'no-unnecessary-boolean-literal-compare',
    'no-unnecessary-condition',
    'no-unnecessary-qualifier',
    'no-unnecessary-template-expression',
    'no-unnecessary-type-arguments',
    'no-unnecessary-type-assertion',
    'no-unsafe-argument',
    'no-unsafe-assignment',
    'no-unsafe-call',
    'no-unsafe-enum-comparison',
    'no-unsafe-member-access',
    'no-unsafe-return',
    'no-unsafe-unary-minus',
    'non-nullable-type-assertion-style',
    'only-throw-error',
    'prefer-destructuring',
    'prefer-find',
    'prefer-includes',
    'prefer-nullish-coalescing',
    'prefer-optional-chain',
    'prefer-promise-reject-errors',
    'prefer-readonly',
    'prefer-readonly-parameter-types',
    'prefer-reduce-type-parameter',
    'prefer-regexp-exec',
    'prefer-return-this-type',
    'prefer-string-starts-ends-with',
    'promise-function-async',
    'require-array-sort-compare',
    'require-await',
    'restrict-plus-operands',
    'restrict-template-expressions',
    'return-await',
    'strict-boolean-expressions',
    'switch-exhaustiveness-check',
    'unbound-method',
    'use-unknown-in-catch-callback-variable',
  ].map((name) => [`@typescript-eslint/${name}`, 'off']),
);

module.exports = {
  extends: ['./.eslintrc.js'],

  // Drop the whole-project TS program at the root.
  parserOptions: { project: null },

  overrides: [
    {
      // Drop the program + all type-aware rules for the TS pass (this also covers
      // the perps override, which is matched earlier and would otherwise crash).
      files: ['*.{ts,tsx}'],
      parserOptions: { project: null },
      rules: TYPE_AWARE_RULES_OFF,
    },
  ],
};
