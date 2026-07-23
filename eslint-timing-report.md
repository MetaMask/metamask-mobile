# ESLint Rule Timing Report

Per-rule timing breakdown produced by running ESLint with the built-in
[`TIMING`](https://eslint.org/docs/latest/extend/stats#timing) profiler enabled.

## How this was generated

```bash
TIMING=all NODE_OPTIONS="--max-old-space-size=12288" \
  eslint "**/*.{js,ts,tsx}"
```

This mirrors the repo's `yarn lint` invocation (same glob and memory settings),
minus `--cache` so every file is freshly linted and every rule is exercised.
`TIMING=all` reports every rule instead of just the top 10.

## Run summary

| Metric | Value |
| :----------------------------- | ----------------: |
| Node | v24.16.0 |
| ESLint glob | `**/*.{js,ts,tsx}` |
| Candidate source files | 12,245 |
| Lint result | 0 errors, 6,049 warnings |
| Rules profiled | 255 |
| Total rule execution time | ~375,786 ms (~6m 16s) |

> Note: "Total rule execution time" is the sum of all per-rule timings. It is
> larger than wall-clock time because parsing, type-information construction
> (for type-aware rules), file I/O, and rule time overlap and are accounted
> separately by ESLint.

## Key takeaways

- **Two rules dominate ~64% of all rule time.** `@typescript-eslint/no-deprecated`
  (36.4%) and `react-compiler/react-compiler` (27.7%) together account for the
  bulk of linting cost. Both are expensive by nature: `no-deprecated` is
  type-aware (it leans on the TypeScript type checker), and the React Compiler
  rule performs a full compilation pass per component.
- **The top 5 rules account for ~76% of rule time.** Adding
  `import-x/no-named-as-default-member` (5.4%), `import-x/no-restricted-paths`
  (3.6%), and `tailwindcss/no-custom-classname` (3.4%) covers most of the budget.
- **The long tail is cheap.** The remaining 250 rules together make up ~24% of
  the time, and ~200 of them register well under 0.1% each.

## Top 25 rules by time

| Rule | Time (ms) | Relative |
| :--- | --------: | -------: |
| `@typescript-eslint/no-deprecated` | 136675.653 | 36.4% |
| `react-compiler/react-compiler` | 104268.308 | 27.7% |
| `import-x/no-named-as-default-member` | 20370.617 | 5.4% |
| `import-x/no-restricted-paths` | 13440.705 | 3.6% |
| `tailwindcss/no-custom-classname` | 12727.170 | 3.4% |
| `react/no-direct-mutation-state` | 8205.613 | 2.2% |
| `import-x/no-extraneous-dependencies` | 7679.045 | 2.0% |
| `react/no-unstable-nested-components` | 7362.009 | 2.0% |
| `jsdoc/check-syntax` | 5459.550 | 1.5% |
| `react/no-multi-comp` | 4150.245 | 1.1% |
| `@typescript-eslint/no-unnecessary-qualifier` | 4046.850 | 1.1% |
| `jsdoc/check-indentation` | 2839.272 | 0.8% |
| `tailwindcss/enforces-shorthand` | 2688.347 | 0.7% |
| `jest/no-restricted-matchers` | 2307.091 | 0.6% |
| `react/require-render-return` | 2076.379 | 0.6% |
| `react-hooks/exhaustive-deps` | 1672.386 | 0.4% |
| `react-native/no-color-literals` | 1589.946 | 0.4% |
| `jest/no-identical-title` | 1553.036 | 0.4% |
| `no-empty-function` | 1531.857 | 0.4% |
| `react/no-deprecated` | 1525.850 | 0.4% |
| `import-x/no-duplicates` | 1195.241 | 0.3% |
| `react/no-string-refs` | 1077.287 | 0.3% |
| `no-unexpected-multiline` | 1056.761 | 0.3% |
| `jest/no-disabled-tests` | 1044.548 | 0.3% |
| `tailwindcss/no-contradicting-classname` | 1039.128 | 0.3% |

## Full breakdown (all 255 rules)

| Rule | Time (ms) | Relative |
| :--- | --------: | -------: |
| `@typescript-eslint/no-deprecated` | 136675.653 | 36.4% |
| `react-compiler/react-compiler` | 104268.308 | 27.7% |
| `import-x/no-named-as-default-member` | 20370.617 | 5.4% |
| `import-x/no-restricted-paths` | 13440.705 | 3.6% |
| `tailwindcss/no-custom-classname` | 12727.170 | 3.4% |
| `react/no-direct-mutation-state` | 8205.613 | 2.2% |
| `import-x/no-extraneous-dependencies` | 7679.045 | 2.0% |
| `react/no-unstable-nested-components` | 7362.009 | 2.0% |
| `jsdoc/check-syntax` | 5459.550 | 1.5% |
| `react/no-multi-comp` | 4150.245 | 1.1% |
| `@typescript-eslint/no-unnecessary-qualifier` | 4046.850 | 1.1% |
| `jsdoc/check-indentation` | 2839.272 | 0.8% |
| `tailwindcss/enforces-shorthand` | 2688.347 | 0.7% |
| `jest/no-restricted-matchers` | 2307.091 | 0.6% |
| `react/require-render-return` | 2076.379 | 0.6% |
| `react-hooks/exhaustive-deps` | 1672.386 | 0.4% |
| `react-native/no-color-literals` | 1589.946 | 0.4% |
| `jest/no-identical-title` | 1553.036 | 0.4% |
| `no-empty-function` | 1531.857 | 0.4% |
| `react/no-deprecated` | 1525.850 | 0.4% |
| `import-x/no-duplicates` | 1195.241 | 0.3% |
| `react/no-string-refs` | 1077.287 | 0.3% |
| `no-unexpected-multiline` | 1056.761 | 0.3% |
| `jest/no-disabled-tests` | 1044.548 | 0.3% |
| `tailwindcss/no-contradicting-classname` | 1039.128 | 0.3% |
| `object-shorthand` | 865.113 | 0.2% |
| `array-callback-return` | 770.443 | 0.2% |
| `no-alert` | 746.235 | 0.2% |
| `no-restricted-imports` | 695.285 | 0.2% |
| `no-unmodified-loop-condition` | 673.213 | 0.2% |
| `import-x/no-nodejs-modules` | 671.860 | 0.2% |
| `@typescript-eslint/no-use-before-define` | 648.364 | 0.2% |
| `react/no-did-update-set-state` | 590.743 | 0.2% |
| `jest/valid-expect` | 576.908 | 0.2% |
| `@typescript-eslint/no-shadow` | 556.783 | 0.1% |
| `import-x/no-amd` | 538.137 | 0.1% |
| `no-regex-spaces` | 520.763 | 0.1% |
| `@typescript-eslint/no-unused-expressions` | 511.339 | 0.1% |
| `tailwindcss/classnames-order` | 490.063 | 0.1% |
| `no-script-url` | 473.532 | 0.1% |
| `tailwindcss/no-unnecessary-arbitrary-value` | 465.447 | 0.1% |
| `react-native/no-inline-styles` | 447.646 | 0.1% |
| `jest/no-focused-tests` | 447.631 | 0.1% |
| `react/jsx-wrap-multilines` | 434.357 | 0.1% |
| `react/jsx-no-comment-textnodes` | 424.024 | 0.1% |
| `import-x/no-commonjs` | 382.988 | 0.1% |
| `@metamask/design-tokens/color-no-hex` | 359.148 | 0.1% |
| `no-undef-init` | 349.051 | 0.1% |
| `quotes` | 347.942 | 0.1% |
| `no-unsafe-optional-chaining` | 344.389 | 0.1% |
| `react/no-render-return-value` | 340.669 | 0.1% |
| `no-useless-escape` | 334.044 | 0.1% |
| `@typescript-eslint/no-extra-non-null-assertion` | 324.678 | 0.1% |
| `react/react-in-jsx-scope` | 321.365 | 0.1% |
| `no-octal-escape` | 304.758 | 0.1% |
| `no-fallthrough` | 299.209 | 0.1% |
| `react/jsx-key` | 285.108 | 0.1% |
| `no-control-regex` | 272.276 | 0.1% |
| `react/no-children-prop` | 272.247 | 0.1% |
| `no-div-regex` | 271.774 | 0.1% |
| `no-useless-call` | 268.477 | 0.1% |
| `react/no-danger-with-children` | 265.842 | 0.1% |
| `no-eval` | 264.166 | 0.1% |
| `react/jsx-pascal-case` | 259.226 | 0.1% |
| `no-mixed-requires` | 259.179 | 0.1% |
| `prefer-spread` | 244.058 | 0.1% |
| `react/jsx-no-undef` | 236.229 | 0.1% |
| `@react-native/no-deep-imports` | 235.961 | 0.1% |
| `no-extend-native` | 228.871 | 0.1% |
| `no-prototype-builtins` | 218.986 | 0.1% |
| `no-lone-blocks` | 216.014 | 0.1% |
| `react/no-unescaped-entities` | 213.306 | 0.1% |
| `arrow-body-style` | 212.592 | 0.1% |
| `no-nonoctal-decimal-escape` | 210.540 | 0.1% |
| `react/no-find-dom-node` | 209.974 | 0.1% |
| `react/jsx-no-duplicate-props` | 205.229 | 0.1% |
| `react/no-unknown-property` | 204.309 | 0.1% |
| `tailwindcss/enforces-negative-arbitrary-values` | 198.027 | 0.1% |
| `@typescript-eslint/no-array-constructor` | 194.611 | 0.1% |
| `no-mixed-spaces-and-tabs` | 191.993 | 0.1% |
| `react/no-is-mounted` | 186.384 | 0.0% |
| `react/jsx-no-target-blank` | 186.171 | 0.0% |
| `no-shadow-restricted-names` | 181.617 | 0.0% |
| `no-extra-boolean-cast` | 181.613 | 0.0% |
| `no-implicit-globals` | 181.423 | 0.0% |
| `no-loop-func` | 171.868 | 0.0% |
| `@typescript-eslint/unified-signatures` | 158.276 | 0.0% |
| `no-misleading-character-class` | 156.954 | 0.0% |
| `handle-callback-err` | 156.117 | 0.0% |
| `@typescript-eslint/ban-ts-comment` | 154.721 | 0.0% |
| `no-proto` | 153.435 | 0.0% |
| `no-octal` | 140.948 | 0.0% |
| `no-useless-computed-key` | 132.567 | 0.0% |
| `@typescript-eslint/no-explicit-any` | 132.360 | 0.0% |
| `dot-notation` | 123.870 | 0.0% |
| `no-invalid-regexp` | 121.808 | 0.0% |
| `react-native/split-platform-components` | 121.230 | 0.0% |
| `@typescript-eslint/no-unnecessary-type-constraint` | 116.546 | 0.0% |
| `no-global-assign` | 116.350 | 0.0% |
| `@typescript-eslint/triple-slash-reference` | 116.011 | 0.0% |
| `no-else-return` | 115.867 | 0.0% |
| `no-extra-bind` | 114.722 | 0.0% |
| `no-iterator` | 114.265 | 0.0% |
| `@typescript-eslint/consistent-type-definitions` | 110.778 | 0.0% |
| `no-empty` | 108.700 | 0.0% |
| `@typescript-eslint/array-type` | 106.544 | 0.0% |
| `@typescript-eslint/no-dupe-class-members` | 105.939 | 0.0% |
| `no-irregular-whitespace` | 102.948 | 0.0% |
| `no-caller` | 99.999 | 0.0% |
| `@typescript-eslint/default-param-last` | 97.114 | 0.0% |
| `consistent-this` | 94.856 | 0.0% |
| `prefer-const` | 93.159 | 0.0% |
| `react/prefer-es6-class` | 92.942 | 0.0% |
| `no-duplicate-imports` | 86.421 | 0.0% |
| `no-constant-condition` | 82.077 | 0.0% |
| `@typescript-eslint/prefer-as-const` | 81.983 | 0.0% |
| `eslint-comments/no-aggregating-enable` | 79.756 | 0.0% |
| `@typescript-eslint/consistent-type-assertions` | 77.797 | 0.0% |
| `@typescript-eslint/no-namespace` | 77.136 | 0.0% |
| `react/prop-types` | 68.882 | 0.0% |
| `react/jsx-uses-react` | 68.268 | 0.0% |
| `no-restricted-syntax` | 67.418 | 0.0% |
| `no-useless-backreference` | 64.925 | 0.0% |
| `no-useless-rename` | 64.748 | 0.0% |
| `react/display-name` | 63.123 | 0.0% |
| `import-x/no-mutable-exports` | 61.459 | 0.0% |
| `no-unsafe-finally` | 61.306 | 0.0% |
| `no-dupe-else-if` | 60.204 | 0.0% |
| `no-inner-declarations` | 59.774 | 0.0% |
| `react/no-unused-prop-types` | 58.047 | 0.0% |
| `no-var` | 56.495 | 0.0% |
| `@typescript-eslint/parameter-properties` | 56.431 | 0.0% |
| `no-self-compare` | 55.372 | 0.0% |
| `@typescript-eslint/no-meaningless-void-operator` | 54.994 | 0.0% |
| `react/jsx-uses-vars` | 54.826 | 0.0% |
| `no-return-assign` | 53.600 | 0.0% |
| `@typescript-eslint/no-require-imports` | 53.106 | 0.0% |
| `react/jsx-boolean-value` | 48.109 | 0.0% |
| `@typescript-eslint/no-array-delete` | 47.237 | 0.0% |
| `valid-typeof` | 41.839 | 0.0% |
| `eqeqeq` | 40.307 | 0.0% |
| `@typescript-eslint/no-this-alias` | 39.793 | 0.0% |
| `@typescript-eslint/no-unsafe-function-type` | 39.058 | 0.0% |
| `@typescript-eslint/prefer-function-type` | 39.034 | 0.0% |
| `@typescript-eslint/no-unsafe-unary-minus` | 37.740 | 0.0% |
| `@typescript-eslint/no-unsafe-declaration-merging` | 35.278 | 0.0% |
| `use-isnan` | 34.210 | 0.0% |
| `no-console` | 33.060 | 0.0% |
| `react/no-danger` | 32.766 | 0.0% |
| `prefer-arrow-callback` | 31.011 | 0.0% |
| `@typescript-eslint/no-useless-constructor` | 30.912 | 0.0% |
| `no-empty-pattern` | 30.799 | 0.0% |
| `yoda` | 29.616 | 0.0% |
| `no-sparse-arrays` | 28.352 | 0.0% |
| `no-self-assign` | 24.857 | 0.0% |
| `no-useless-catch` | 24.119 | 0.0% |
| `no-sequences` | 23.998 | 0.0% |
| `no-compare-neg-zero` | 23.893 | 0.0% |
| `operator-assignment` | 23.274 | 0.0% |
| `no-useless-concat` | 22.601 | 0.0% |
| `no-unneeded-ternary` | 22.431 | 0.0% |
| `no-extra-semi` | 21.677 | 0.0% |
| `eol-last` | 21.553 | 0.0% |
| `@typescript-eslint/prefer-for-of` | 21.389 | 0.0% |
| `no-lonely-if` | 21.182 | 0.0% |
| `no-cond-assign` | 20.472 | 0.0% |
| `require-yield` | 17.983 | 0.0% |
| `@typescript-eslint/no-non-null-assertion` | 17.501 | 0.0% |
| `no-redeclare` | 17.142 | 0.0% |
| `eslint-comments/no-unused-enable` | 16.539 | 0.0% |
| `no-new-object` | 16.493 | 0.0% |
| `@typescript-eslint/no-for-in-array` | 16.471 | 0.0% |
| `no-case-declarations` | 16.151 | 0.0% |
| `no-new-func` | 16.027 | 0.0% |
| `no-use-before-define` | 15.364 | 0.0% |
| `@typescript-eslint/no-misused-new` | 15.238 | 0.0% |
| `prefer-rest-params` | 15.035 | 0.0% |
| `@typescript-eslint/prefer-namespace-keyword` | 14.462 | 0.0% |
| `import-x/no-namespace` | 14.231 | 0.0% |
| `for-direction` | 14.114 | 0.0% |
| `no-labels` | 13.613 | 0.0% |
| `no-path-concat` | 13.455 | 0.0% |
| `no-debugger` | 13.428 | 0.0% |
| `@typescript-eslint/no-non-null-asserted-optional-chain` | 13.001 | 0.0% |
| `ft-flow/define-flow-type` | 12.915 | 0.0% |
| `constructor-super` | 11.447 | 0.0% |
| `no-restricted-modules` | 11.020 | 0.0% |
| `no-ex-assign` | 10.630 | 0.0% |
| `no-negated-in-lhs` | 10.565 | 0.0% |
| `no-unreachable` | 10.475 | 0.0% |
| `no-dupe-keys` | 10.159 | 0.0% |
| `no-this-before-super` | 9.381 | 0.0% |
| `no-new-wrappers` | 9.256 | 0.0% |
| `no-duplicate-case` | 8.951 | 0.0% |
| `getter-return` | 8.845 | 0.0% |
| `no-delete-var` | 8.825 | 0.0% |
| `no-empty-character-class` | 7.560 | 0.0% |
| `no-unused-labels` | 7.186 | 0.0% |
| `@typescript-eslint/naming-convention` | 6.313 | 0.0% |
| `no-import-assign` | 6.312 | 0.0% |
| `no-new-require` | 6.285 | 0.0% |
| `import-x/no-unresolved` | 5.950 | 0.0% |
| `no-implied-eval` | 5.489 | 0.0% |
| `no-async-promise-executor` | 4.678 | 0.0% |
| `no-void` | 4.440 | 0.0% |
| `ft-flow/use-flow-type` | 4.166 | 0.0% |
| `no-label-var` | 4.145 | 0.0% |
| `no-const-assign` | 4.133 | 0.0% |
| `jsdoc/check-alignment` | 3.696 | 0.0% |
| `no-obj-calls` | 3.627 | 0.0% |
| `jsdoc/tag-lines` | 3.444 | 0.0% |
| `no-setter-return` | 3.276 | 0.0% |
| `react/self-closing-comp` | 3.097 | 0.0% |
| `no-array-constructor` | 2.587 | 0.0% |
| `no-dupe-class-members` | 2.077 | 0.0% |
| `import-x/order` | 1.402 | 0.0% |
| `no-unsafe-negation` | 1.396 | 0.0% |
| `no-func-assign` | 1.238 | 0.0% |
| `no-dupe-args` | 1.218 | 0.0% |
| `no-new-symbol` | 0.659 | 0.0% |
| `no-throw-literal` | 0.627 | 0.0% |
| `id-length` | 0.607 | 0.0% |
| `no-undef` | 0.581 | 0.0% |
| `no-class-assign` | 0.545 | 0.0% |
| `@typescript-eslint/consistent-type-exports` | 0.533 | 0.0% |
| `consistent-return` | 0.461 | 0.0% |
| `id-denylist` | 0.384 | 0.0% |
| `no-useless-constructor` | 0.380 | 0.0% |
| `promise/always-return` | 0.378 | 0.0% |
| `@typescript-eslint/prefer-nullish-coalescing` | 0.354 | 0.0% |
| `import-x/consistent-type-specifier-style` | 0.334 | 0.0% |
| `prefer-template` | 0.312 | 0.0% |
| `jsdoc/require-param` | 0.253 | 0.0% |
| `@typescript-eslint/restrict-template-expressions` | 0.246 | 0.0% |
| `require-unicode-regexp` | 0.237 | 0.0% |
| `jsdoc/check-param-names` | 0.236 | 0.0% |
| `no-with` | 0.228 | 0.0% |
| `no-implicit-coercion` | 0.212 | 0.0% |
| `@typescript-eslint/no-floating-promises` | 0.206 | 0.0% |
| `@typescript-eslint/prefer-readonly` | 0.195 | 0.0% |
| `curly` | 0.185 | 0.0% |
| `@typescript-eslint/explicit-function-return-type` | 0.134 | 0.0% |
| `prefer-destructuring` | 0.125 | 0.0% |
| `no-param-reassign` | 0.090 | 0.0% |
| `promise/no-nesting` | 0.066 | 0.0% |
| `no-plusplus` | 0.065 | 0.0% |
| `promise/param-names` | 0.060 | 0.0% |
| `import-x/no-named-as-default` | 0.051 | 0.0% |
| `no-negated-condition` | 0.050 | 0.0% |
| `jsdoc/require-returns` | 0.041 | 0.0% |
| `promise/no-callback-in-promise` | 0.038 | 0.0% |
| `jsdoc/require-param-description` | 0.035 | 0.0% |
| `no-eq-null` | 0.028 | 0.0% |
| `jsdoc/require-returns-description` | 0.022 | 0.0% |
| `no-nested-ternary` | 0.017 | 0.0% |

---

_Generated with `TIMING=all eslint` on Node v24.16.0. Times vary run-to-run; treat relative percentages as the stable signal._
