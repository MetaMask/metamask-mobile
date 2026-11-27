import js from '@eslint/js';
import typescriptConfig from '@metamask/eslint-config-typescript';
import { FlatCompat } from '@eslint/eslintrc';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const componentView = require('./scripts/eslint/component-view-plugin.js');
const componentViewPlugin = {
  meta: componentView.meta,
  rules: componentView.rules,
};

// Warn, not error: these patterns already exist. no-restricted-syntax in
// .eslintrc.js stays an error for jest.mock and fake timers, and a second
// override would replace that list. The re-exported rule is a second
// severity. TODO: flip to 'error' once the counts below are 0.
const CV_SKILL_URL =
  'https://github.com/MetaMask/skills/blob/main/domains/testing/skills/mobile-testing/references/component-view.md';
const CV_NESTED_FIND_MESSAGE = `Do not nest findBy*/findAllBy* inside waitFor. findBy* already polls (waitFor + getBy) and the two share one timeout, so CI fails with "Timed out in waitFor." Use await findBy* or waitFor(() => { getBy*; expect(...) }). See the mobile-testing skill: ${CV_SKILL_URL}`;
const CV_FIXED_SLEEP_MESSAGE = `Do not sleep on a fixed delay (setTimeout with a delay other than 0, or sleep()). A zero-delay flush (setTimeout(resolve, 0)) is allowed. Await the observable outcome with waitFor or findBy* instead of letting time pass. See the mobile-testing skill: ${CV_SKILL_URL}`;
const CV_FIND_QUERY = '/^find(?:All)?By[A-Z]/';
const cvFlakeSelectors = [
  {
    selector: `CallExpression[callee.name='waitFor'] CallExpression[callee.name=${CV_FIND_QUERY}]`,
    message: CV_NESTED_FIND_MESSAGE,
  },
  {
    selector: `CallExpression[callee.name='waitFor'] CallExpression[callee.property.name=${CV_FIND_QUERY}]`,
    message: CV_NESTED_FIND_MESSAGE,
  },
  {
    selector: `CallExpression[callee.property.name='waitFor'] CallExpression[callee.name=${CV_FIND_QUERY}]`,
    message: CV_NESTED_FIND_MESSAGE,
  },
  {
    selector: `CallExpression[callee.property.name='waitFor'] CallExpression[callee.property.name=${CV_FIND_QUERY}]`,
    message: CV_NESTED_FIND_MESSAGE,
  },
  {
    selector: "CallExpression[callee.name='sleep']",
    message: CV_FIXED_SLEEP_MESSAGE,
  },
  {
    selector: "CallExpression[callee.property.name='sleep']",
    message: CV_FIXED_SLEEP_MESSAGE,
  },
  {
    selector:
      "CallExpression[callee.name='setTimeout'][arguments.1]:not([arguments.1.type='Literal'][arguments.1.value=0])",
    message: CV_FIXED_SLEEP_MESSAGE,
  },
  {
    selector:
      "CallExpression[callee.object.name=/^(global|globalThis|window)$/][callee.property.name='setTimeout'][arguments.1]:not([arguments.1.type='Literal'][arguments.1.value=0])",
    message: CV_FIXED_SLEEP_MESSAGE,
  },
];
const designSystem = require('./scripts/eslint/design-system-plugin.js');
const designSystemPlugin = {
  meta: designSystem.meta,
  rules: designSystem.rules,
};

// Spacing sits on the 4px grid (Design Brain SP-S5). Selectors match on the
// literal's source text: a number is a multiple of 4 when its last two digits
// are, so OFF_GRID needs no arithmetic. Arbitrary values only count when they
// start with a number, so calc() and var() layouts are not flagged. The
// ConditionalExpression selectors cover the two result branches of a spacing
// ternary, e.g. paddingTop: expanded ? 22 : 0.
const SPACING_KEY =
  '/^(margin|padding)(Top|Right|Bottom|Left|Horizontal|Vertical|Start|End|(Inline|Block)(Start|End)?)?$|^(row|column)?[Gg]ap$/';
const OFF_GRID_NUMBER =
  '/^(?!(\\d*[02468][048]|\\d*[13579][26]|[048])$)\\d+(\\.\\d+)?$/';
const ARBITRARY_SPACING_CLASS =
  '/(^|[\\s:!])-?((m|p)[trblxyse]?|gap(-[xy])?)-\\[-?\\d/';
const CLASS_ATTRIBUTE = '/^(className|twClassName)$/';
const OFF_GRID_MESSAGE =
  'Spacing is off the 4px grid. Use a multiple of 4, or a Tailwind class or Box spacing prop (1 = 4px). A 2px half-step or optical offset needs an eslint-disable comment that says why.';
const ARBITRARY_SPACING_MESSAGE =
  'Arbitrary spacing values like p-[15px] skip the 4px grid. Use a spacing step (p-4 = 16px, p-0.5 = 2px). An optical offset needs an eslint-disable comment that says why.';
const spacingGridSelectors = [
  {
    selector: `Property[key.name=${SPACING_KEY}] > Literal[raw=${OFF_GRID_NUMBER}]`,
    message: OFF_GRID_MESSAGE,
  },
  {
    selector: `Property[key.name=${SPACING_KEY}] > UnaryExpression > Literal[raw=${OFF_GRID_NUMBER}]`,
    message: OFF_GRID_MESSAGE,
  },
  {
    selector: `Property[key.name=${SPACING_KEY}] > ConditionalExpression > Literal[raw=${OFF_GRID_NUMBER}]`,
    message: OFF_GRID_MESSAGE,
  },
  {
    selector: `Property[key.name=${SPACING_KEY}] > ConditionalExpression > UnaryExpression > Literal[raw=${OFF_GRID_NUMBER}]`,
    message: OFF_GRID_MESSAGE,
  },
  {
    selector: `JSXAttribute[name.name=${CLASS_ATTRIBUTE}] Literal[value=${ARBITRARY_SPACING_CLASS}]`,
    message: ARBITRARY_SPACING_MESSAGE,
  },
  {
    selector: `JSXAttribute[name.name=${CLASS_ATTRIBUTE}] TemplateElement[value.raw=${ARBITRARY_SPACING_CLASS}]`,
    message: ARBITRARY_SPACING_MESSAGE,
  },
  {
    selector: `CallExpression[callee.object.name='tw'] Literal[value=${ARBITRARY_SPACING_CLASS}]`,
    message: ARBITRARY_SPACING_MESSAGE,
  },
  {
    selector: `CallExpression[callee.object.name='tw'] TemplateElement[value.raw=${ARBITRARY_SPACING_CLASS}]`,
    message: ARBITRARY_SPACING_MESSAGE,
  },
  {
    selector: `TaggedTemplateExpression[tag.name='tw'] TemplateElement[value.raw=${ARBITRARY_SPACING_CLASS}]`,
    message: ARBITRARY_SPACING_MESSAGE,
  },
];

const here = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: here,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// Rules stay in .eslintrc.js for this commit so the flat entry has the same
// checks that are on today. Fast checks that are off stay off.
const legacy = require('./.eslintrc.js');
const typescriptExtend = '@metamask/eslint-config-typescript';
const typescriptOverrideIndex = legacy.overrides.findIndex((override) =>
  override.extends?.includes(typescriptExtend),
);
if (typescriptOverrideIndex === -1) {
  throw new Error(
    'Expected .eslintrc.js to extend @metamask/eslint-config-typescript for TypeScript files.',
  );
}
const typescriptOverride = legacy.overrides[typescriptOverrideIndex];
// The *.{ts,tsx} override replaces rules such as no-restricted-syntax for
// every TypeScript file. Overrides after it in .eslintrc.js put the narrower
// fences back (view-test jest.mock, component-view fake timers, confirmations
// selectors, page-object FrameworkDetector). Flat config keeps the last
// matching block, so those overrides are appended after the TypeScript rules.
const overridesBeforeTypescript = legacy.overrides.slice(
  0,
  typescriptOverrideIndex,
);
const overridesAfterTypescript = legacy.overrides.slice(
  typescriptOverrideIndex + 1,
);
const legacyBeforeTypescript = {
  ...legacy,
  plugins: legacy.plugins.filter((plugin) => plugin !== '@typescript-eslint'),
  overrides: overridesBeforeTypescript,
};

// v15 is a flat config. The old `extends` key cannot load it. Apply it only
// to TypeScript, then re-apply the *.{ts,tsx} override so rules that are off
// today stay off. Drop projectService so ESLint does not load the TypeScript
// project. Oxlint runs the rules that need type information.
const typescriptBlocks = (
  Array.isArray(typescriptConfig) ? typescriptConfig : [typescriptConfig]
).map((block) => {
  const next = { ...block };
  if (!next.files) {
    next.files = ['**/*.{ts,tsx}'];
  }
  if (next.languageOptions?.parserOptions?.projectService) {
    const parserOptions = { ...next.languageOptions.parserOptions };
    delete parserOptions.projectService;
    next.languageOptions = { ...next.languageOptions, parserOptions };
  }
  return next;
});

// ESLint 9 does not read .eslintignore. These are the patterns from that file
// plus ignorePatterns in .eslintrc.js.
const ignores = [
  '**/scripts/inpage-bridge/**',
  '**/app/core/InpageBridgeWeb3.js',
  '**/app/components/UI/Charts/AdvancedChart/webview/chartLogic.js',
  '**/app/components/UI/Charts/AdvancedChart/webview/chartLogicString.ts',
  '**/app/components/UI/Charts/AdvancedChart/webview/syncChartLogic.js',
  '**/app/util/blockies.js',
  '**/__snapshots__/**',
  '**/android/**',
  '**/build/**',
  '**/coverage/**',
  '**/ios/**',
  '**/jest.preprocessor.js',
  '**/node_modules/**',
  '**/CHANGELOG.md',
  '**/app/util/test/testSetup.js',
  '**/tests/scripts/ai-e2e-tags-selector.ts',
  '**/app/**/*-method-action-types.ts',
  '**/app/util/termsOfUse/termsOfUseContent.ts',
];

const config = [
  { ignores },
  ...compat.config(legacyBeforeTypescript),
  ...typescriptBlocks,
  {
    files: ['**/*.{ts,tsx}'],
    rules: typescriptOverride.rules,
  },
];

// typescript-eslint's recommended and recommended-type-checked configs each
// register the same plugin, and the overrides reapplied below load plugins
// the base config already loaded. Flat config rejects the second registration.
const seenPlugins = new Set();
const withoutDuplicatePlugins = (blocks) =>
  blocks.map((block) => {
    if (!block.plugins) {
      return block;
    }
    const plugins = {};
    let dropped = false;
    for (const [name, plugin] of Object.entries(block.plugins)) {
      if (seenPlugins.has(name)) {
        dropped = true;
        continue;
      }
      seenPlugins.add(name);
      plugins[name] = plugin;
    }
    if (!dropped) {
      return block;
    }
    if (Object.keys(plugins).length === 0) {
      const rest = { ...block };
      delete rest.plugins;
      return rest;
    }
    return { ...block, plugins };
  });
const flatConfig = withoutDuplicatePlugins(config);

// v15 and ESLint 9 turn some checks on, and turn a few off, compared with
// ESLint 8. Pin those back so this commit keeps today's rules.
const pinToToday = {
  'import-x/no-rename-default': 'off',
  'no-constant-binary-expression': 'off',
  'no-empty-static-block': 'off',
  'no-extra-semi': 'error',
  'no-inner-declarations': 'error',
  'no-mixed-spaces-and-tabs': 'error',
  'no-unused-private-class-members': 'off',
};
const pinTypescriptToToday = {
  'import-x/consistent-type-specifier-style': 'off',
  'import-x/no-duplicates': 'error',
  'jsdoc/check-access': 'off',
  'jsdoc/check-alignment': 'off',
  'jsdoc/check-indentation': 'error',
  'jsdoc/check-param-names': 'off',
  'jsdoc/check-property-names': 'off',
  'jsdoc/check-tag-names': 'off',
  'jsdoc/check-types': 'off',
  'jsdoc/check-values': 'off',
  'jsdoc/empty-tags': 'off',
  'jsdoc/implements-on-classes': 'off',
  'jsdoc/multiline-blocks': 'off',
  'jsdoc/no-defaults': 'off',
  'jsdoc/no-multi-asterisks': 'off',
  'jsdoc/require-jsdoc': 'off',
  'jsdoc/require-param': 'off',
  'jsdoc/require-param-description': 'off',
  'jsdoc/require-param-name': 'off',
  'jsdoc/require-property': 'off',
  'jsdoc/require-property-description': 'off',
  'jsdoc/require-property-name': 'off',
  'jsdoc/require-returns': 'off',
  'jsdoc/require-returns-check': 'off',
  'jsdoc/require-returns-description': 'off',
  'jsdoc/require-yields': 'off',
  'jsdoc/require-yields-check': 'off',
  'jsdoc/tag-lines': 'off',
};
const pinJavascriptToToday = {
  'no-new-native-nonconstructor': 'off',
  'no-new-symbol': 'error',
};

// The v15 blocks register @typescript-eslint only for TypeScript files. JS
// files still have eslint-disable comments for its rules, and ESLint 8 loaded
// the plugin for every file. Register the same plugin object for JS too.
const typescriptEslintPlugin = typescriptBlocks.find(
  (block) => block.plugins?.['@typescript-eslint'],
)?.plugins['@typescript-eslint'];

// After typescriptOverride.rules and the TypeScript pins. Both match every
// ts/tsx file, and flat config replaces a rule instead of merging it.
const overridesAfterTypescriptBlocks = withoutDuplicatePlugins(
  compat.config({ overrides: overridesAfterTypescript }),
);

// Oxlint runs these rules, with the same options and file scopes, from
// .oxlintrc.json. They are turned off here so each file is checked once.
// lint-staged and lint:fix apply their fixes with scripts/oxlint-fix.mjs.
// Rules that ESLint can auto-fix and oxlint cannot (eqeqeq, no-lonely-if,
// no-extra-boolean-cast, react/jsx-no-target-blank, ...) stay in ESLint so
// eslint --fix keeps them.
// import-x/no-named-as-default-member stays too: oxlint does not read .d.ts
// files, so it misses CommonJS packages that ship separate typings. So do
// rules where oxlint reports different code (no-alert, react/no-danger,
// no-unsafe-optional-chaining, the globals rules such as no-undef).
const rulesOwnedByOxlint = [
  '@typescript-eslint/array-type',
  '@typescript-eslint/ban-ts-comment',
  '@typescript-eslint/consistent-type-assertions',
  '@typescript-eslint/default-param-last',
  '@typescript-eslint/no-array-constructor',
  '@typescript-eslint/no-dupe-class-members',
  '@typescript-eslint/no-explicit-any',
  '@typescript-eslint/no-extra-non-null-assertion',
  '@typescript-eslint/no-misused-new',
  '@typescript-eslint/no-namespace',
  '@typescript-eslint/no-non-null-asserted-optional-chain',
  '@typescript-eslint/no-non-null-assertion',
  '@typescript-eslint/no-require-imports',
  '@typescript-eslint/no-this-alias',
  '@typescript-eslint/no-unnecessary-type-constraint',
  '@typescript-eslint/no-unsafe-declaration-merging',
  '@typescript-eslint/no-unsafe-function-type',
  '@typescript-eslint/no-unused-expressions',
  '@typescript-eslint/no-use-before-define',
  '@typescript-eslint/no-useless-constructor',
  '@typescript-eslint/parameter-properties',
  '@typescript-eslint/prefer-as-const',
  '@typescript-eslint/prefer-for-of',
  '@typescript-eslint/prefer-function-type',
  '@typescript-eslint/prefer-namespace-keyword',
  '@typescript-eslint/triple-slash-reference',
  '@typescript-eslint/unified-signatures',
  'array-callback-return',
  'arrow-body-style',
  'constructor-super',
  'for-direction',
  'getter-return',
  'import-x/no-amd',
  'import-x/no-commonjs',
  'import-x/no-duplicates',
  'import-x/no-mutable-exports',
  'import-x/no-nodejs-modules',
  'jest/no-identical-title',
  'jest/no-restricted-matchers',
  'no-array-constructor',
  'no-async-promise-executor',
  'no-caller',
  'no-case-declarations',
  'no-class-assign',
  'no-compare-neg-zero',
  'no-cond-assign',
  'no-console',
  'no-const-assign',
  'no-constant-condition',
  'no-control-regex',
  'no-debugger',
  'no-delete-var',
  'no-div-regex',
  'no-dupe-class-members',
  'no-dupe-else-if',
  'no-dupe-keys',
  'no-duplicate-case',
  'no-duplicate-imports',
  'no-else-return',
  'no-empty',
  'no-empty-character-class',
  'no-empty-function',
  'no-empty-pattern',
  'no-ex-assign',
  'no-extend-native',
  'no-fallthrough',
  'no-func-assign',
  'no-import-assign',
  'no-invalid-regexp',
  'no-irregular-whitespace',
  'no-iterator',
  'no-label-var',
  'no-labels',
  'no-lone-blocks',
  'no-loop-func',
  'no-misleading-character-class',
  'no-new-func',
  'no-new-wrappers',
  'no-nonoctal-decimal-escape',
  'no-proto',
  'no-prototype-builtins',
  'no-regex-spaces',
  'no-restricted-imports',
  'no-return-assign',
  'no-script-url',
  'no-self-assign',
  'no-self-compare',
  'no-sequences',
  'no-setter-return',
  'no-shadow-restricted-names',
  'no-sparse-arrays',
  'no-this-before-super',
  'no-throw-literal',
  'no-unexpected-multiline',
  'no-unmodified-loop-condition',
  'no-unreachable',
  'no-unsafe-finally',
  'no-unsafe-negation',
  'no-unused-labels',
  'no-use-before-define',
  'no-useless-backreference',
  'no-useless-call',
  'no-useless-catch',
  'no-useless-computed-key',
  'no-useless-concat',
  'no-useless-constructor',
  'no-useless-escape',
  'no-useless-rename',
  'no-var',
  'no-void',
  'no-warning-comments',
  'no-with',
  'object-shorthand',
  'prefer-arrow-callback',
  'prefer-const',
  'prefer-rest-params',
  'prefer-spread',
  'react-hooks/exhaustive-deps',
  'react/jsx-boolean-value',
  'react/jsx-key',
  'react/jsx-no-comment-textnodes',
  'react/jsx-no-duplicate-props',
  'react/jsx-no-undef',
  'react/jsx-pascal-case',
  'react/no-children-prop',
  'react/no-danger-with-children',
  'react/no-direct-mutation-state',
  'react/no-find-dom-node',
  'react/no-is-mounted',
  'react/no-multi-comp',
  'react/no-render-return-value',
  'react/no-string-refs',
  'react/no-unescaped-entities',
  'react/no-unstable-nested-components',
  'react/prefer-es6-class',
  'react/react-in-jsx-scope',
  'react/require-render-return',
  'react/self-closing-comp',
  'require-yield',
  'use-isnan',
  'valid-typeof',
  'yoda',
];
// Oxlint runs these jest rules only on test files (*.test.*, *.spec.*,
// __tests__/), so ESLint keeps them for every other file.
const jestRulesOwnedByOxlintInTests = [
  'jest/no-disabled-tests',
  'jest/no-focused-tests',
];

export default [
  ...flatConfig,
  {
    files: ['**/*.{js,jsx}'],
    plugins: { '@typescript-eslint': typescriptEslintPlugin },
  },
  { rules: pinToToday },
  { files: ['**/*.{js,jsx}'], rules: pinJavascriptToToday },
  { files: ['**/*.{ts,tsx}'], rules: pinTypescriptToToday },
  ...overridesAfterTypescriptBlocks,
  // After every block that sets these rules, so 'off' wins. Oxlint cannot
  // parse app/declarations, so ESLint keeps the rules there.
  {
    ignores: ['app/declarations/**'],
    rules: Object.fromEntries(rulesOwnedByOxlint.map((rule) => [rule, 'off'])),
  },
  {
    files: ['**/*.{test,spec}.{js,jsx,ts,tsx}', '**/__tests__/**'],
    ignores: ['app/declarations/**'],
    rules: Object.fromEntries(
      jestRulesOwnedByOxlintInTests.map((rule) => [rule, 'off']),
    ),
  },
  // ESLint 9 warns on unused eslint-disable comments. ESLint 8 did not.
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
  // Counts on this tree: nested findBy 13, fixed sleep 18, bare timeout 446,
  // clearAllMocks without a reset 43. Sleep and timeout moved with main;
  // nested findBy is the same 13 sites.
  {
    files: [
      '**/*.view.test.{js,ts,tsx,jsx}',
      'tests/component-view/**/*.{ts,tsx}',
    ],
    plugins: { 'component-view': componentViewPlugin },
    rules: {
      'component-view/no-restricted-syntax': ['warn', ...cvFlakeSelectors],
      'component-view/no-bare-query-timeout': 'warn',
      'component-view/no-clear-all-mocks-without-reset': 'warn',
    },
  },
  // Existing violations are baselined in eslint-suppressions.json. After
  // fixing one, run `yarn eslint <file> --prune-suppressions`. The
  // disable-reason rule keeps every exception to spacing-grid documented in
  // the disable comment itself.
  {
    files: ['app/**/*.{js,jsx,ts,tsx}'],
    ignores: [
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.stories.{js,jsx,ts,tsx}',
      '**/__mocks__/**',
    ],
    plugins: { 'design-system': designSystemPlugin },
    rules: {
      'design-system/spacing-grid': ['error', ...spacingGridSelectors],
      'design-system/spacing-grid-disable-reason': 'error',
    },
  },
];
