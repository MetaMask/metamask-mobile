import js from '@eslint/js';
import typescriptConfig from '@metamask/eslint-config-typescript';
import { FlatCompat } from '@eslint/eslintrc';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
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
const typescriptOverride = legacy.overrides.find((override) =>
  override.extends?.includes(typescriptExtend),
);
const legacyWithoutTypescriptExtend = {
  ...legacy,
  plugins: legacy.plugins.filter((plugin) => plugin !== '@typescript-eslint'),
  overrides: legacy.overrides.filter(
    (override) => override !== typescriptOverride,
  ),
};

// v15 is a flat config. The old `extends` key cannot load it. Apply it only
// to TypeScript, then re-apply the overrides from .eslintrc.js so rules that
// are off today stay off. Drop projectService so type-aware parsing stays on
// today's `parserOptions.project`.
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
  ...compat.config(legacyWithoutTypescriptExtend),
  ...typescriptBlocks,
  {
    files: ['**/*.{ts,tsx}'],
    rules: typescriptOverride.rules,
  },
];

// typescript-eslint's recommended and recommended-type-checked configs each
// register the same plugin. Flat config rejects the second registration.
const seenPlugins = new Set();
const flatConfig = config.map((block) => {
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
  return dropped ? { ...block, plugins } : block;
});

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

export default [
  ...flatConfig,
  {
    files: ['**/*.{js,jsx}'],
    plugins: { '@typescript-eslint': typescriptEslintPlugin },
  },
  { rules: pinToToday },
  { files: ['**/*.{js,jsx}'], rules: pinJavascriptToToday },
  { files: ['**/*.{ts,tsx}'], rules: pinTypescriptToToday },
  // ESLint 9 warns on unused eslint-disable comments. ESLint 8 did not.
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
];
