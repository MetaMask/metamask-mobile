/**
 * The flat config reapplies the *.{ts,tsx} override, and the TypeScript pins,
 * to every TypeScript file. Overrides after that block in .eslintrc.js replace
 * no-restricted-syntax for narrower globs. These tests resolve the flat config
 * ESLint actually uses and lint the banned syntax.
 *
 * Unit coverage: this is ESLint config cascade, not a screen, a controller
 * seam, or a device journey.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { Linter } from 'eslint';

const require = createRequire(__filename);
const componentViewPlugin = require('./eslint/component-view-plugin') as {
  meta: { name: string; version: string };
  rules: Record<string, Linter.RuleModule>;
};

const RULE = 'no-restricted-syntax';
const PLUGIN_RULES = [
  'component-view/no-restricted-syntax',
  'component-view/no-bare-query-timeout',
  'component-view/no-clear-all-mocks-without-reset',
] as const;
const REPO_ROOT = path.join(__dirname, '..');
const VIEW_TEST_FILE =
  'app/components/UI/Perps/Views/PerpsTransactionsView/PerpsPositionTransactionView.view.test.tsx';
const HELPER_FILE = 'tests/component-view/platform.ts';

interface FenceCase {
  name: string;
  file: string;
  code: string;
  message: string | null;
}

const FENCE_CASES: FenceCase[] = [
  {
    name: 'view test bans jest.mock of an unlisted module',
    file: VIEW_TEST_FILE,
    code: 'jest.mock("react");\n',
    message:
      'Arbitrary jest.mock() is not allowed in a component-view test. Drive behaviour through Redux state, presets, and renderers, or intercept HTTP with tests/component-view/api-mocking (nock). Only Engine (core/Engine or core/Engine/Engine) and react-native-device-info may be mocked. See the mobile-testing skill: https://github.com/MetaMask/skills/blob/main/domains/testing/skills/mobile-testing/references/component-view.md',
  },
  {
    name: 'view test allows the Engine mock',
    file: VIEW_TEST_FILE,
    code: 'jest.mock("../../../core/Engine");\n',
    message: null,
  },
  {
    name: 'view test bans fake timers',
    file: VIEW_TEST_FILE,
    code: 'jest.useFakeTimers();\n',
    message:
      'Component-view tests must not use fake timers. Test countdowns, debounces, and expiry in a unit test, where fake timers are allowed, or serve fixtures already in the target state. See the mobile-testing skill: https://github.com/MetaMask/skills/blob/main/domains/testing/skills/mobile-testing/references/component-view.md',
  },
  {
    name: 'component-view helper bans fake timers',
    file: HELPER_FILE,
    code: 'jest.useFakeTimers();\n',
    message:
      'Component-view tests must not use fake timers. Test countdowns, debounces, and expiry in a unit test, where fake timers are allowed, or serve fixtures already in the target state. See the mobile-testing skill: https://github.com/MetaMask/skills/blob/main/domains/testing/skills/mobile-testing/references/component-view.md',
  },
  {
    name: 'component-view helper bans an arbitrary jest.mock',
    file: HELPER_FILE,
    code: 'jest.mock("react");\n',
    message:
      'Arbitrary jest.mock() is not allowed in component-view helpers. Add a framework mock only in tests/component-view/mocks.ts, and only for Engine, react-native-device-info, expo-web-browser, generateDeviceAnalyticsMetaData, or react-native/Libraries/Animated/Easing. See the mobile-testing skill: https://github.com/MetaMask/skills/blob/main/domains/testing/skills/mobile-testing/references/component-view.md',
  },
  {
    name: 'view test bans a dynamic jest.mock',
    file: VIEW_TEST_FILE,
    code: 'jest.mock(moduleName);\n',
    message:
      'Arbitrary jest.mock() is not allowed in a component-view test. Drive behaviour through Redux state, presets, and renderers, or intercept HTTP with tests/component-view/api-mocking (nock). Only Engine (core/Engine or core/Engine/Engine) and react-native-device-info may be mocked. See the mobile-testing skill: https://github.com/MetaMask/skills/blob/main/domains/testing/skills/mobile-testing/references/component-view.md',
  },
  {
    name: 'component-view helper bans a dynamic jest.mock',
    file: HELPER_FILE,
    code: 'jest.mock(moduleName);\n',
    message:
      'Arbitrary jest.mock() is not allowed in component-view helpers. Add a framework mock only in tests/component-view/mocks.ts, and only for Engine, react-native-device-info, expo-web-browser, generateDeviceAnalyticsMetaData, or react-native/Libraries/Animated/Easing. See the mobile-testing skill: https://github.com/MetaMask/skills/blob/main/domains/testing/skills/mobile-testing/references/component-view.md',
  },
  {
    name: 'component-view helper allows the mocks.ts Engine mock',
    file: 'tests/component-view/mocks.ts',
    code: "jest.mock('../../app/core/Engine');\n",
    message: null,
  },
  {
    name: 'confirmations file bans a global network selector import',
    file: 'app/components/Views/confirmations/utils/fiat.ts',
    code: 'import { selectChainId } from "somewhere";\n',
    message: 'Avoid using global network selectors in confirmations',
  },
  {
    name: 'confirmations file allows an unlisted import name',
    file: 'app/components/Views/confirmations/utils/fiat.ts',
    code: 'import { selectOther } from "somewhere";\n',
    message: null,
  },
  {
    name: 'page object bans FrameworkDetector',
    file: 'tests/page-objects/CommonView.ts',
    code: 'const detector = FrameworkDetector;\n',
    message:
      'Do not use FrameworkDetector in POs/flows. Use Gestures/Assertions/Matchers.',
  },
  {
    name: 'page object test is outside the FrameworkDetector ban',
    file: 'tests/page-objects/wallet/AccountListBottomSheet.test.ts',
    code: 'const detector = FrameworkDetector;\n',
    message: null,
  },
  {
    name: 'flow file bans FrameworkDetector',
    file: 'tests/flows/wallet.flow.ts',
    code: 'const detector = FrameworkDetector;\n',
    message:
      'Do not use FrameworkDetector in POs/flows. Use Gestures/Assertions/Matchers.',
  },
  {
    name: 'flow test is outside the FrameworkDetector ban',
    file: 'tests/flows/general.flow.test.ts',
    code: 'const detector = FrameworkDetector;\n',
    message: null,
  },
  {
    name: 'smoke helper bans FrameworkDetector',
    file: 'tests/smoke-appium/notifications/utils/helpers.ts',
    code: 'const detector = FrameworkDetector;\n',
    message:
      'Do not use FrameworkDetector in specs. Use Gestures/Assertions/Matchers.',
  },
  {
    name: 'smoke unit test is outside the FrameworkDetector ban',
    file: 'tests/smoke-appium/mm-connect/utils.test.ts',
    code: 'const detector = FrameworkDetector;\n',
    message: null,
  },
  {
    name: 'ordinary TypeScript file does not ban jest.mock or FrameworkDetector',
    file: 'app/core/Engine/Engine.ts',
    code: 'jest.mock("react");\nconst detector = FrameworkDetector;\n',
    message: null,
  },
];

interface ResolvedConfig {
  syntax: Record<string, Linter.RuleEntry | null>;
  plugin: Record<string, Record<string, Linter.RuleEntry | null>>;
}

/**
 * Jest's vm cannot dynamically import eslint.config.mjs. Ask a plain Node
 * process for the rules ESLint would use for these files.
 */
const loadResolvedRules = (files: string[]): ResolvedConfig => {
  const unique = [...new Set(files)];
  const outPath = path.join(
    os.tmpdir(),
    `restricted-syntax-eslint-${process.pid}.json`,
  );
  const script = `
const { ESLint } = require('eslint');
const fs = require('node:fs');
const path = require('node:path');
const files = ${JSON.stringify(unique)};
const pluginRules = ${JSON.stringify(PLUGIN_RULES)};
const cwd = ${JSON.stringify(REPO_ROOT)};
const outPath = ${JSON.stringify(outPath)};
const eslint = new ESLint({ cwd });
(async () => {
  const syntax = {};
  const plugin = {};
  for (const file of files) {
    const config = await eslint.calculateConfigForFile(path.join(cwd, file));
    syntax[file] = config.rules[${JSON.stringify(RULE)}] ?? null;
    plugin[file] = {};
    for (const ruleId of pluginRules) {
      plugin[file][ruleId] = config.rules[ruleId] ?? null;
    }
  }
  fs.writeFileSync(outPath, JSON.stringify({ syntax, plugin }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: '' },
  });
  if (result.status !== 0) {
    throw new Error(
      `Failed to resolve ESLint config (status ${result.status}).\n${result.stderr}`,
    );
  }
  const parsed = JSON.parse(fs.readFileSync(outPath, 'utf8')) as ResolvedConfig;
  fs.unlinkSync(outPath);
  return parsed;
};

const { syntax: resolvedRules, plugin: resolvedPluginRules } = loadResolvedRules(
  [
    ...FENCE_CASES.map((item) => item.file),
    'app/core/Engine/Engine.ts',
  ],
);
const linter = new Linter({ cwd: REPO_ROOT });

const lintSyntax = (file: string, code: string): string[] => {
  const rule = resolvedRules[file];
  if (rule == null) {
    throw new Error(`No ${RULE} config was resolved for ${file}`);
  }
  return linter
    .verify(
      code,
      {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
        rules: { [RULE]: rule },
      },
      { filename: path.join(REPO_ROOT, file) },
    )
    .filter((message) => message.ruleId === RULE)
    .map((message) => message.message);
};

const selectorsOf = (rule: Linter.RuleEntry | null): string[] => {
  if (!Array.isArray(rule)) {
    return [];
  }
  return rule.slice(1).flatMap((entry) => {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'selector' in entry &&
      typeof entry.selector === 'string'
    ) {
      return [entry.selector];
    }
    return [];
  });
};

describe('no-restricted-syntax fences', () => {
  it('keeps the base with and sequence bans on an ordinary TypeScript file', () => {
    const rule = resolvedRules['app/core/Engine/Engine.ts'];

    const selectors = selectorsOf(rule);

    expect(selectors).toStrictEqual(['WithStatement', 'SequenceExpression']);
  });

  it('keeps the base bans and the fake-timer ban on component-view helpers', () => {
    const selectors = selectorsOf(
      resolvedRules['tests/component-view/platform.ts'],
    );

    expect(selectors).toHaveLength(5);
    expect(selectors[0]).toBe('WithStatement');
    expect(selectors[1]).toBe('SequenceExpression');
    expect(selectors[2]).toContain('useFakeTimers');
    expect(selectors[3]).toContain("property.name='mock'");
    expect(selectors[4]).toContain("property.name='mock'");
  });

  it.each(FENCE_CASES)('$name', ({ file, code, message }) => {
    const messages = lintSyntax(file, code);

    if (message === null) {
      expect(messages).toStrictEqual([]);
      return;
    }
    expect(messages).toContain(message);
  });
});

interface FlakeCase {
  name: string;
  file: string;
  ruleId: (typeof PLUGIN_RULES)[number];
  code: string;
  message: string | null;
}

const FLAKE_CASES: FlakeCase[] = [
  {
    name: 'view test warns on a bare timeout',
    file: VIEW_TEST_FILE,
    ruleId: 'component-view/no-bare-query-timeout',
    code: 'await findByText("Token A", {}, { timeout: 5000 });\n',
    message: 'A bare { timeout }',
  },
  {
    name: 'view test allows a timeout with a boundary comment',
    file: VIEW_TEST_FILE,
    ruleId: 'component-view/no-bare-query-timeout',
    code: 'await findByText("Token A", {}, { timeout: 5000 }); // quote debounce\n',
    message: null,
  },
  {
    name: 'view test allows a timeout whose shared constant names the boundary',
    file: VIEW_TEST_FILE,
    ruleId: 'component-view/no-bare-query-timeout',
    code: `// Positions stream lags the first paint.
const TIMEOUT_MS = 5000;
await screen.findByTestId("header", {}, { timeout: TIMEOUT_MS });
`,
    message: null,
  },
  {
    name: 'view test warns on clearAllMocks without a reset',
    file: VIEW_TEST_FILE,
    ruleId: 'component-view/no-clear-all-mocks-without-reset',
    code: 'beforeEach(() => { jest.clearAllMocks(); });\n',
    message: 'jest.clearAllMocks()',
  },
  {
    name: 'view test allows clearAllMocks when the file resets implementations',
    file: VIEW_TEST_FILE,
    ruleId: 'component-view/no-clear-all-mocks-without-reset',
    code: `beforeEach(() => {
  jest.clearAllMocks();
  engine.placeOrder.mockReset();
});
`,
    message: null,
  },
  {
    name: 'view test allows clearAllMocks when the file calls resetAllMocks',
    file: HELPER_FILE,
    ruleId: 'component-view/no-clear-all-mocks-without-reset',
    code: `beforeEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
});
`,
    message: null,
  },
  {
    name: 'view test warns on findBy nested in waitFor',
    file: VIEW_TEST_FILE,
    ruleId: 'component-view/no-restricted-syntax',
    code: 'await waitFor(() => findByTestId("row"));\n',
    message: 'Do not nest findBy*',
  },
  {
    name: 'view test allows waitFor with a synchronous query',
    file: VIEW_TEST_FILE,
    ruleId: 'component-view/no-restricted-syntax',
    code: 'await waitFor(() => { expect(getByText("Token A")).toBeOnTheScreen(); });\n',
    message: null,
  },
  {
    name: 'view test warns on a non-zero setTimeout',
    file: VIEW_TEST_FILE,
    ruleId: 'component-view/no-restricted-syntax',
    code: 'await new Promise((resolve) => setTimeout(resolve, 50));\n',
    message: 'Do not sleep',
  },
  {
    name: 'view test warns on sleep()',
    file: HELPER_FILE,
    ruleId: 'component-view/no-restricted-syntax',
    code: 'await sleep(100);\n',
    message: 'Do not sleep',
  },
  {
    name: 'view test allows a zero-delay setTimeout flush',
    file: VIEW_TEST_FILE,
    ruleId: 'component-view/no-restricted-syntax',
    code: 'await new Promise((resolve) => setTimeout(resolve, 0));\n',
    message: null,
  },
];

const lintPluginRule = (
  file: string,
  ruleId: (typeof PLUGIN_RULES)[number],
  code: string,
): string[] => {
  const rule = resolvedPluginRules[file]?.[ruleId];
  if (rule == null) {
    throw new Error(`No ${ruleId} config was resolved for ${file}`);
  }
  return linter
    .verify(
      code,
      {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
        plugins: { 'component-view': componentViewPlugin },
        rules: { [ruleId]: rule },
      },
      { filename: path.join(REPO_ROOT, file) },
    )
    .filter((message) => message.ruleId === ruleId)
    .map((message) => message.message);
};

describe('component-view flake fences', () => {
  it('does not apply the flake rules outside component-view files', () => {
    const rules = resolvedPluginRules['app/core/Engine/Engine.ts'];

    for (const ruleId of PLUGIN_RULES) {
      expect(rules?.[ruleId] ?? null).toBeNull();
    }
  });

  it.each(FLAKE_CASES)('$name', ({ file, ruleId, code, message }) => {
    const messages = lintPluginRule(file, ruleId, code);

    if (message === null) {
      expect(messages).toStrictEqual([]);
      return;
    }
    expect(messages.some((item) => item.includes(message))).toBe(true);
  });
});
