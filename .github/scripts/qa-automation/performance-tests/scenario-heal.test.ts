/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runHeal } from './scenario-heal';

const MD_PATH = 'tests/performance/login/scenarios/demo.scenario.md';
const CACHE_PATH = MD_PATH.replace('.md', '.cache.json');

const MARKDOWN = `# Demo [scenario shadow]

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
2. Tap the Swap button on the wallet home
3. Expect: the swap screen is visible

## Timers

- Measure from step 2 until step 3 (Android 2500 ms, iOS 2000 ms): swap opens
`;

const tap = (value: string) => [{ type: 'tap', locator: { strategy: 'testID', value } }];
const expectEl = (value: string) => [{ type: 'expect', locator: { strategy: 'testID', value } }];

function outcome(healedCache: Record<string, unknown>, status = 'INVALID_MEASUREMENT') {
  return {
    schema: 1,
    scenarioPath: MD_PATH,
    title: 'Demo [scenario shadow]',
    status,
    failedStep: null,
    timers: [
      { name: 'swap opens', valid: false, reason: 'end element testID=old did not appear', endPinned: false, untilStep: 3 },
    ],
    thresholdViolations: [],
    changedSteps: [
      { number: 3, text: 'the swap screen is visible', before: expectEl('old'), after: expectEl('swap-screen-v2') },
    ],
    rewordings: [],
    healedCache,
    modelCalls: 1,
  };
}

function setup(outcomeJson: unknown) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-heal-repo-'));
  const artifacts = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-heal-artifacts-'));
  fs.mkdirSync(path.join(root, path.dirname(MD_PATH)), { recursive: true });
  fs.writeFileSync(path.join(root, MD_PATH), MARKDOWN);
  fs.writeFileSync(
    path.join(root, CACHE_PATH),
    `${JSON.stringify({ 'Tap the Swap button on the wallet home': tap('wallet-swap-button'), 'the swap screen is visible': expectEl('old') }, null, 2)}\n`,
  );
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  const reports = path.join(artifacts, 'testmu-he-android-imported-wallet-test-results-x', 'tests/reporters/reports');
  fs.mkdirSync(reports, { recursive: true });
  fs.writeFileSync(path.join(reports, 'scenario-outcome-demo.json'), JSON.stringify(outcomeJson));
  fs.writeFileSync(path.join(reports, 'hyperexecute-job-imported-wallet.json'), JSON.stringify({ url: 'https://he/job/1' }));
  return { root, artifacts, out: path.join(artifacts, 'out'), git };
}

const healed = {
  'Tap the Swap button on the wallet home': tap('wallet-swap-button'),
  'the swap screen is visible': expectEl('swap-screen-v2'),
};

describe('scenario-heal', () => {
  it('dry run writes a cache-only diff and summary without touching the repo', () => {
    const { root, artifacts, out, git } = setup(outcome(healed));

    const result = runHeal({ artifactsDir: artifacts, repoRoot: root, outDir: out, apply: false, runUrl: 'https://run/1', baseRef: 'main', existingPrs: [] });

    expect(result.hasPr).toBe(true);
    expect(result.changes.map((c) => c.path)).toEqual([CACHE_PATH]);
    expect(result.diff).toContain('+        "value": "swap-screen-v2"');
    expect(result.summary).toContain('| Demo [scenario shadow] | INVALID_MEASUREMENT | repairable | 3 |');
    expect(fs.readFileSync(result.bodyFile, 'utf8')).toContain('https://he/job/1');
    expect(git('status', '--porcelain')).toBe('');
  });

  it('apply writes only the allowed file', () => {
    const { root, artifacts, out, git } = setup(outcome(healed));

    const result = runHeal({ artifactsDir: artifacts, repoRoot: root, outDir: out, apply: true, runUrl: '', baseRef: 'main', existingPrs: [] });

    expect(result.hasPr).toBe(true);
    expect(git('status', '--porcelain').trim()).toBe(`M ${CACHE_PATH}`);
  });

  it('aborts the whole heal and only reports when the diff breaks a rule', () => {
    const { root, artifacts, out, git } = setup(
      outcome({ ...healed, 'Log in to the wallet': tap('password-input') }),
    );

    const result = runHeal({ artifactsDir: artifacts, repoRoot: root, outDir: out, apply: true, runUrl: '', baseRef: 'main', existingPrs: [] });

    expect(result.hasPr).toBe(false);
    expect(result.summary).toContain('**Heal aborted.**');
    expect(git('status', '--porcelain')).toBe('');
  });

  it('skips a scenario step that an open heal PR already proposes', () => {
    const { root, artifacts, out } = setup(outcome(healed));

    const result = runHeal({
      artifactsDir: artifacts, repoRoot: root, outDir: out, apply: false, runUrl: '', baseRef: 'main',
      existingPrs: [
        {
          url: 'https://github.com/org/repo/pull/9',
          headSha: 'abc1234',
          body: `<!-- perf-scenario-heal: ${MD_PATH}#3 -->`,
        },
      ],
    });

    expect(result.hasPr).toBe(false);
    expect(result.summary).toContain('already proposed by an open heal PR');
  });

  it('reports a failed scenario without a PR', () => {
    const failed = { ...outcome(healed, 'FAIL'), failedStep: { number: 2, text: 'Tap the Swap button on the wallet home', error: "the scenario's check failed: testID=x" } };
    const { root, artifacts, out } = setup(failed);

    const result = runHeal({ artifactsDir: artifacts, repoRoot: root, outDir: out, apply: false, runUrl: '', baseRef: 'main', existingPrs: [] });

    expect(result.hasPr).toBe(false);
    expect(result.summary).toContain('| FAIL | pinned-check | 2 |');
  });
});
