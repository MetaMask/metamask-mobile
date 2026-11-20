/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { main, readOutcomes } from './scenario-report';

const MD_PATH = 'tests/performance/login/scenarios/demo.scenario.md';

const tap = (value: string) => [{ type: 'tap', locator: { strategy: 'testID', value } }];
const expectEl = (value: string) => [{ type: 'expect', locator: { strategy: 'testID', value } }];

function outcome(overrides: Record<string, unknown> = {}) {
  return {
    schema: 1,
    scenarioPath: MD_PATH,
    title: 'Demo [scenario shadow]',
    status: 'INVALID_MEASUREMENT',
    failedStep: null,
    timers: [
      { name: 'swap opens', valid: false, reason: 'end element testID=old did not appear', endPinned: false, untilStep: 3 },
    ],
    thresholdViolations: [],
    changedSteps: [
      { number: 3, text: 'the swap screen is visible', before: expectEl('old'), after: expectEl('swap-screen-v2') },
    ],
    healedCache: {
      'Tap the Swap button on the wallet home': tap('wallet-swap-button'),
      'the swap screen is visible': expectEl('swap-screen-v2'),
    },
    cacheErrors: { 'the swap screen is visible': 'end element testID=old did not appear' },
    modelCalls: 1,
    ...overrides,
  };
}

function artifacts(...outcomes: unknown[]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-report-'));
  outcomes.forEach((o, i) => {
    const reports = path.join(dir, `testmu-he-android-${i}-test-results-x`, 'tests/reporters/reports');
    fs.mkdirSync(reports, { recursive: true });
    fs.writeFileSync(path.join(reports, `scenario-outcome-demo-${i}.json`), JSON.stringify(o));
  });
  fs.writeFileSync(path.join(dir, 'scenario-outcome-broken.json'), '{"schema":');
  return dir;
}

describe('scenario-report', () => {
  it('writes the correction and a ready-to-paste cache entry to the job summary', () => {
    const summaryFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'summary-')), 'summary.md');

    const report = main(['--artifacts', artifacts(outcome())], { GITHUB_STEP_SUMMARY: summaryFile } as unknown as NodeJS.ProcessEnv);

    expect(fs.readFileSync(summaryFile, 'utf8')).toBe(report);
    expect(report).toContain('| Demo [scenario shadow] | INVALID_MEASUREMENT | cache fix below |');
    expect(report).toContain('**Step 3. the swap screen is visible**');
    expect(report).toContain('- Cached: `expect testID=old`');
    expect(report).toContain('- Failed: end element testID=old did not appear');
    expect(report).toContain("- Haiku's correction: `expect testID=swap-screen-v2`");
    expect(report).toContain(
      'Paste into `tests/performance/login/scenarios/demo.scenario.cache.json`, replacing the entry with the same key:',
    );
    const snippet = /```json\n([\s\S]*?)\n```/.exec(report)?.[1] ?? '';
    expect(JSON.parse(`{${snippet}}`)).toEqual({
      'the swap screen is visible': expectEl('swap-screen-v2'),
    });
  });

  it('lists a correction from a failed run with its reason, but never suggests copying it', () => {
    const failed = outcome({
      status: 'FAIL',
      timers: [{ name: 'swap opens', valid: true, endPinned: false, untilStep: 3 }],
      failedStep: { number: 4, text: 'Tap Review', error: "the scenario's check failed: testID=confirm-button" },
    });

    const report = main(['--artifacts', artifacts(failed)], {} as NodeJS.ProcessEnv);

    expect(report).toContain("| FAIL | report only | the scenario's check failed: testID=confirm-button |");
    expect(report).toContain("- Haiku's correction: `expect testID=swap-screen-v2`");
    expect(report).toContain('Not suggested for the cache');
    expect(report).not.toContain('```json');
  });

  it('reports a threshold failure as report only, with the reason', () => {
    const report = main(
      ['--artifacts', artifacts(outcome({ status: 'PASS', changedSteps: [], thresholdViolations: ['swap opens: 4000ms > 2875ms'] }))],
      {} as NodeJS.ProcessEnv,
    );

    expect(report).toContain('| PASS | report only | threshold exceeded: swap opens: 4000ms > 2875ms |');
  });

  it('shows drift a retry would hide, with the first attempt\'s error', () => {
    const drifted = outcome({
      status: 'PASS',
      attempt: 1,
      timers: [{ name: 'swap opens', valid: true, endPinned: false, untilStep: 3 }],
      changedSteps: [],
      cacheDrift: [
        { number: 3, text: 'the swap screen is visible', before: expectEl('old'), after: expectEl('swap-screen-v2') },
      ],
    });

    const report = main(['--artifacts', artifacts(drifted)], {} as NodeJS.ProcessEnv);

    expect(report).toContain('`tests/performance/login/scenarios/demo.scenario.md`: PASS on retry 1. cache drift (run passed)');
    expect(report).toContain('- Failed: end element testID=old did not appear');
    expect(report).toContain('```json');
  });

  it('keeps a clean pass to one table row and skips unreadable files', () => {
    const clean = outcome({
      status: 'PASS',
      timers: [{ name: 'swap opens', valid: true, endPinned: false, untilStep: 3 }],
      changedSteps: [],
    });
    const dir = artifacts(clean);

    expect(readOutcomes(dir)).toHaveLength(1);
    const report = main(['--artifacts', dir], {} as NodeJS.ProcessEnv);
    expect(report).toContain('| Demo [scenario shadow] | PASS | passed |  |');
    expect(report).not.toContain('### ');
  });

  it('says so when no outcome was found', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-report-empty-'));

    expect(main(['--artifacts', empty], {} as NodeJS.ProcessEnv)).toContain('_No scenario outcomes were found');
  });
});
