/**
 * Component-view flake rules: sanctioned jest.mock allowlist, and the
 * patterns that cannot be a single no-restricted-syntax selector.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ESLint, Linter, RuleTester } from 'eslint';

/* eslint-disable @typescript-eslint/no-require-imports, import-x/no-commonjs */
const plugin = require('./component-view-plugin');
const eslintConfig = require('../../.eslintrc.js');
const installedPlugin = require('eslint-plugin-component-view');
/* eslint-enable @typescript-eslint/no-require-imports, import-x/no-commonjs */

const REPO_ROOT = path.join(__dirname, '..', '..');
const SKILL_URL = plugin.SKILL_URL as string;

const tester = new RuleTester({
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

interface EslintOverride {
  files?: string | string[];
  plugins?: string[];
  rules?: Record<string, unknown>;
}

const config = eslintConfig as { overrides: EslintOverride[] };

const overrideFor = (glob: string): EslintOverride => {
  const match = config.overrides.find((entry) => {
    const files = Array.isArray(entry.files) ? entry.files : [entry.files];
    return files.includes(glob);
  });
  if (!match) {
    throw new Error(`Missing ESLint override for ${glob}`);
  }
  return match;
};

const VIEW_GLOB = '**/*.view.test.{js,ts,tsx,jsx}';
const HELPER_GLOB = 'tests/component-view/**/*.{ts,tsx}';

describe('component-view eslint plugin', () => {
  it('links every message to the mobile-testing skill', () => {
    for (const rule of Object.values(plugin.rules) as {
      meta: { messages: Record<string, string>; docs: { url: string } };
    }[]) {
      expect(rule.meta.docs.url).toBe(SKILL_URL);
      for (const message of Object.values(rule.meta.messages)) {
        expect(message).toContain(SKILL_URL);
        expect(message.length).toBeGreaterThan(SKILL_URL.length + 40);
      }
    }
    expect(plugin.FAKE_TIMER_MESSAGE).toContain(SKILL_URL);
    expect(plugin.FAKE_TIMER_MESSAGE).toContain('unit test');
  });

  it('resolves the in-repo plugin when ESLint loads the config by package name', () => {
    const resolved = installedPlugin as {
      rules: Record<string, unknown>;
    };
    expect(resolved.rules['no-bare-query-timeout']).toBe(
      plugin.rules['no-bare-query-timeout'],
    );
  });

  it('scopes the rules to view tests and component-view helpers', async () => {
    const viewOverride = overrideFor(VIEW_GLOB);
    const helperOverride = overrideFor(HELPER_GLOB);
    expect(viewOverride.plugins).toContain('component-view');
    expect(helperOverride.plugins).toContain('component-view');
    expect(viewOverride.rules?.['component-view/no-arbitrary-jest-mock']).toBe(
      'error',
    );
    expect(
      helperOverride.rules?.['component-view/no-arbitrary-jest-mock'],
    ).toEqual(['error', { allowFrameworkExtras: true }]);
    expect(
      viewOverride.rules?.['component-view/no-bare-query-timeout'],
    ).toBe('warn');

    const fakeTimerBan = (
      viewOverride.rules?.['no-restricted-syntax'] as [string, { message: string }]
    )[1];
    expect(fakeTimerBan.message).toBe(plugin.FAKE_TIMER_MESSAGE);

    const eslint = new ESLint({ cwd: REPO_ROOT });
    const viewConfig = await eslint.calculateConfigForFile(
      'app/components/Views/ActivityList/ActivityList.view.test.tsx',
    );
    const helperConfig = await eslint.calculateConfigForFile(
      'tests/component-view/mocks.ts',
    );
    const unitConfig = await eslint.calculateConfigForFile(
      'app/components/Views/ActivityList/ActivityList.test.tsx',
    );
    expect(viewConfig.rules?.['component-view/no-fixed-sleep']).toEqual([
      'warn',
    ]);
    expect(
      helperConfig.rules?.['component-view/no-arbitrary-jest-mock'],
    ).toEqual(['error', { allowFrameworkExtras: true }]);
    expect(
      unitConfig.rules?.['component-view/no-nested-find-in-wait-for'],
    ).toBeUndefined();
  }, 120000);
});

describe('component-view/no-arbitrary-jest-mock', () => {
  const rule = plugin.rules['no-arbitrary-jest-mock'];

  tester.run('no-arbitrary-jest-mock', rule, {
    valid: [
      "jest.mock('../../../core/Engine', () => ({}));",
      "jest.mock('../../../../core/Engine/Engine', () => ({}));",
      "jest.mock('../../app/core/Engine/Engine.ts', () => ({}));",
      "jest.mock('react-native-device-info', () => ({}));",
      {
        code: "jest.mock('expo-web-browser', () => ({}));",
        options: [{ allowFrameworkExtras: true }],
      },
      {
        code: "jest.mock('../../app/util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData', () => ({}));",
        options: [{ allowFrameworkExtras: true }],
      },
      {
        code: "jest.mock('react-native/Libraries/Animated/Easing', () => ({}));",
        options: [{ allowFrameworkExtras: true }],
      },
    ],
    invalid: [
      {
        code: "jest.mock('./hooks/useFoo', () => ({}));",
        errors: [{ messageId: 'arbitraryMock' }],
      },
      {
        code: 'jest.mock(moduleName, () => ({}));',
        errors: [{ messageId: 'arbitraryMock' }],
      },
      {
        code: "jest.mock('expo-web-browser', () => ({}));",
        errors: [{ messageId: 'arbitraryMock' }],
      },
    ],
  });

  it('allows every jest.mock already declared in tests/component-view/mocks.ts', () => {
    const source = fs.readFileSync(
      path.join(REPO_ROOT, 'tests/component-view/mocks.ts'),
      'utf8',
    );
    const specifiers = [
      ...source.matchAll(/jest\.mock\(\s*(['"])([^'"]+)\1/gu),
    ].map((match) => match[2]);
    expect(specifiers.length).toBeGreaterThanOrEqual(6);

    const linter = new Linter();
    linter.defineRule('no-arbitrary-jest-mock', rule);
    const code = specifiers
      .map((specifier) => `jest.mock(${JSON.stringify(specifier)}, () => ({}));`)
      .join('\n');
    const messages = linter.verify(code, {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      rules: {
        'no-arbitrary-jest-mock': ['error', { allowFrameworkExtras: true }],
      },
    });
    expect(messages).toEqual([]);
  });
});

describe('component-view/no-nested-find-in-wait-for', () => {
  tester.run(
    'no-nested-find-in-wait-for',
    plugin.rules['no-nested-find-in-wait-for'],
    {
      valid: [
        'await findByText("Token A");',
        'await waitFor(() => { expect(getByText("Token A")).toBeOnTheScreen(); });',
        'await waitFor(() => screen.getByRole("button"));',
        'await findByText("Token A"); await waitFor(() => expect(getByText("Ready")).toBeOnTheScreen());',
        'await waitFor(() => { const row = items.find((item) => item.id === "1"); expect(row).toBeDefined(); });',
      ],
      invalid: [
        {
          code: 'await waitFor(() => findByTestId("row"));',
          errors: [{ messageId: 'nestedFind' }],
        },
        {
          code: 'await waitFor(async () => { expect(await screen.findByText("Token A")).toBeOnTheScreen(); });',
          errors: [{ messageId: 'nestedFind' }],
        },
        {
          code: 'await waitFor(() => within(row).findAllByRole("cell"));',
          errors: [{ messageId: 'nestedFind' }],
        },
        {
          code: 'const readTitle = () => findByText("Token A"); await waitFor(readTitle);',
          errors: [{ messageId: 'nestedFind' }],
        },
      ],
    },
  );
});

describe('component-view/no-fixed-sleep', () => {
  tester.run('no-fixed-sleep', plugin.rules['no-fixed-sleep'], {
    valid: [
      'await new Promise((resolve) => setTimeout(resolve, 0));',
      'setTimeout(() => callback(Date.now()), 0);',
      'await new Promise((resolve) => { resolve(); });',
      'jest.setTimeout(10000);',
      'setTimeout(resolve);',
    ],
    invalid: [
      {
        code: 'await new Promise((resolve) => setTimeout(resolve, 50));',
        errors: [{ messageId: 'fixedSleep' }],
      },
      {
        code: 'await new Promise((resolve) => setTimeout(resolve, delayMs));',
        errors: [{ messageId: 'fixedSleep' }],
      },
      {
        code: 'await sleep(100);',
        errors: [{ messageId: 'fixedSleep' }],
      },
      {
        code: 'await global.setTimeout(resolve, 10);',
        errors: [{ messageId: 'fixedSleep' }],
      },
    ],
  });
});

describe('component-view/no-bare-query-timeout', () => {
  tester.run(
    'no-bare-query-timeout',
    plugin.rules['no-bare-query-timeout'],
    {
      valid: [
        'await findByText("Token A");',
        'await waitFor(() => expect(getByText("Token A")).toBeOnTheScreen());',
        'await findByText("Token A", {}, { timeout: 5000 }); // quote debounce',
        `await findByTestId(
          "card",
          {},
          // chained quote query
          { timeout: 3000 },
        );`,
        `// Positions stream lags the first paint.
        const TIMEOUT_MS = 5000;
        await screen.findByTestId("header", {}, { timeout: TIMEOUT_MS });`,
        `const wait5s = { timeout: 5000 };
        await findByText("Token A", {}, wait5s); // quote debounce`,
        'fetch(url, { timeout: 5000 });',
      ],
      invalid: [
        {
          code: `// The retried earnings summary replaces the error banner.
            expect(
              await findByText("total", {}, { timeout: 3000 }),
            );`,
          errors: [{ messageId: 'bareTimeout' }],
        },
        {
          code: 'await findByText("Token A", {}, { timeout: 5000 });',
          errors: [{ messageId: 'bareTimeout' }],
        },
        {
          code: 'await waitFor(() => expect(getByText("Token A")).toBeOnTheScreen(), { timeout: 10000 });',
          errors: [{ messageId: 'bareTimeout' }],
        },
        {
          code: `const TIMEOUT_MS = 5000;
            await findByTestId("header", {}, { timeout: TIMEOUT_MS });`,
          errors: [{ messageId: 'bareTimeout' }],
        },
        {
          code: `// eslint-disable-next-line no-unused-vars
            await findByText("Token A", {}, { timeout: 1000 });`,
          errors: [{ messageId: 'bareTimeout' }],
        },
        {
          code: `const wait5s = { timeout: 5000 };
            await screen.findByRole("button", {}, wait5s);`,
          errors: [{ messageId: 'bareTimeout' }],
        },
      ],
    },
  );
});

describe('component-view/no-clear-all-mocks-without-reset', () => {
  tester.run(
    'no-clear-all-mocks-without-reset',
    plugin.rules['no-clear-all-mocks-without-reset'],
    {
      valid: [
        `beforeEach(() => {
          jest.clearAllMocks();
          engine.placeOrder.mockReset();
        });`,
        `beforeEach(() => {
          jest.clearAllMocks();
          jest.resetAllMocks();
        });`,
        'beforeEach(() => { target.mockClear(); });',
        `beforeEach(() => {
          jest.clearAllMocks();
          jest.restoreAllMocks();
        });`,
      ],
      invalid: [
        {
          code: 'beforeEach(() => { jest.clearAllMocks(); });',
          errors: [{ messageId: 'clearAllMocks' }],
        },
        {
          code: `beforeEach(() => { jest.clearAllMocks(); });
            it("keeps the implementation", () => { jest.clearAllMocks(); });`,
          errors: [
            { messageId: 'clearAllMocks' },
            { messageId: 'clearAllMocks' },
          ],
        },
      ],
    },
  );
});
