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
import os from 'node:os';
import path from 'node:path';
import { Linter } from 'eslint';

const RULE = 'no-restricted-syntax';
const REPO_ROOT = path.join(__dirname, '..');

interface FenceCase {
  name: string;
  file: string;
  code: string;
  message: string | null;
}

const FENCE_CASES: FenceCase[] = [
  {
    name: 'view test bans jest.mock of an unlisted module',
    file: 'app/components/UI/Perps/Views/PerpsTransactionsView/PerpsPositionTransactionView.view.test.tsx',
    code: 'jest.mock("react");\n',
    message:
      'Only Engine and react-native-device-info can be mocked in component-view tests.',
  },
  {
    name: 'view test allows the Engine mock',
    file: 'app/components/UI/Perps/Views/PerpsTransactionsView/PerpsPositionTransactionView.view.test.tsx',
    code: 'jest.mock("../../../core/Engine");\n',
    message: null,
  },
  {
    name: 'view test bans fake timers',
    file: 'app/components/UI/Perps/Views/PerpsTransactionsView/PerpsPositionTransactionView.view.test.tsx',
    code: 'jest.useFakeTimers();\n',
    message:
      'Component-view tests must not use fake timers. Keep time behaviour in a unit test, or serve fixtures already in the target state. See docs/testing/component-view-tests.md.',
  },
  {
    name: 'component-view helper bans fake timers',
    file: 'tests/component-view/platform.ts',
    code: 'jest.useFakeTimers();\n',
    message:
      'Component-view tests must not use fake timers. Keep time behaviour in a unit test, or serve fixtures already in the target state. See docs/testing/component-view-tests.md.',
  },
  {
    name: 'component-view helper allows jest.mock',
    file: 'tests/component-view/platform.ts',
    code: 'jest.mock("react");\n',
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

/**
 * Jest's vm cannot dynamically import eslint.config.mjs. Ask a plain Node
 * process for the rule ESLint would use for these files.
 */
const loadResolvedRules = (
  files: string[],
): Record<string, Linter.RuleEntry | null> => {
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
const cwd = ${JSON.stringify(REPO_ROOT)};
const outPath = ${JSON.stringify(outPath)};
const eslint = new ESLint({ cwd });
(async () => {
  const out = {};
  for (const file of files) {
    const config = await eslint.calculateConfigForFile(path.join(cwd, file));
    out[file] = config.rules[${JSON.stringify(RULE)}] ?? null;
  }
  fs.writeFileSync(outPath, JSON.stringify(out));
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
  const parsed = JSON.parse(fs.readFileSync(outPath, 'utf8')) as Record<
    string,
    Linter.RuleEntry | null
  >;
  fs.unlinkSync(outPath);
  return parsed;
};

const resolvedRules = loadResolvedRules([
  ...FENCE_CASES.map((item) => item.file),
  'app/core/Engine/Engine.ts',
]);
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

    expect(selectors).toHaveLength(3);
    expect(selectors[0]).toBe('WithStatement');
    expect(selectors[1]).toBe('SequenceExpression');
    expect(selectors[2]).toContain('useFakeTimers');
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
