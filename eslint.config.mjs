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
];
