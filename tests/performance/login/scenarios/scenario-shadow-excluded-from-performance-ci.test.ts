/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { parseScenario } from '../../../framework/scenario-agent/scenario';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const SCENARIO_DIRS = [
  __dirname,
  path.resolve(__dirname, '../../onboarding/scenarios'),
];
const LOGIN_SCENARIO =
  'tests/performance/login/scenarios/eth-swap-flow.scenario.spec.ts';
const ONBOARDING_SCENARIO =
  'tests/performance/onboarding/scenarios/import-wallet.scenario.spec.ts';

/** Same grep as tests/playwright.testmu.config.ts and tests/playwright.config.ts. */
const PERFORMANCE_CONFIG_GREP = /@Performance\b/;

function discover(
  buildType: 'imported-wallet' | 'onboarding',
  grepTags: string,
): string[] {
  return execFileSync(
    'bash',
    [
      '.github/scripts/qa-automation/performance-tests/hyperexecute-discover-performance-tests.sh',
    ],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, BUILD_TYPE: buildType, GREP_TAGS: grepTags },
      encoding: 'utf8',
    },
  )
    .trim()
    .split('\n');
}

describe('scenario shadow specs run only when @PerformanceShadow is selected', () => {
  it.each(['', '@PerformanceLogin', '@PerformanceSwaps|@PerformanceLaunch'])(
    'discovery skips them for GREP_TAGS=%p (schedule, full suite, area labels)',
    (grepTags) => {
      const login = discover('imported-wallet', grepTags);
      const onboarding = discover('onboarding', grepTags);

      expect(login).toContain('tests/performance/login/eth-swap-flow.spec.ts');
      expect(onboarding.some((file) => file.includes('/onboarding/'))).toBe(
        true,
      );
      expect(
        [...login, ...onboarding].some((file) => file.includes('/scenarios/')),
      ).toBe(false);
    },
  );

  it.each(['@PerformanceShadow', '@PerformanceLogin|@PerformanceShadow'])(
    'discovery adds them for GREP_TAGS=%p',
    (grepTags) => {
      expect(discover('imported-wallet', grepTags)).toContain(LOGIN_SCENARIO);
      expect(discover('onboarding', grepTags)).toContain(ONBOARDING_SCENARIO);
    },
  );

  it('keeps the shadow config referenced only by the HyperExecute scripts', () => {
    const referencing: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (
          !entry.name.endsWith('.test.mjs') &&
          fs.readFileSync(fullPath, 'utf8').includes('scenario-shadow')
        ) {
          referencing.push(path.relative(REPO_ROOT, fullPath));
        }
      }
    };
    ['.github/workflows', '.github/scripts'].forEach((dir) =>
      walk(path.join(REPO_ROOT, dir)),
    );

    expect(referencing.sort()).toEqual([
      '.github/scripts/qa-automation/performance-tests/hyperexecute-discover-performance-tests.sh',
      '.github/scripts/qa-automation/performance-tests/hyperexecute-run-performance-test.sh',
    ]);
  });

  it('use tags and titles that the performance and system greps do not match', () => {
    const scenarioFiles = SCENARIO_DIRS.flatMap((dir) =>
      fs
        .readdirSync(dir)
        .filter((name) => name.endsWith('.scenario.md'))
        .map((name) => path.join(dir, name)),
    );
    expect(scenarioFiles.length).toBeGreaterThan(0);

    for (const file of scenarioFiles) {
      const scenario = parseScenario(fs.readFileSync(file, 'utf8'));
      expect(scenario.tags).toContain('@PerformanceShadow');
      const grepTarget = `${scenario.tags.join(' ')} ${scenario.title} ${scenario.team}`;
      expect(PERFORMANCE_CONFIG_GREP.test(grepTarget)).toBe(false);
      expect(/@System/.test(grepTarget)).toBe(false);
    }
  });
});
