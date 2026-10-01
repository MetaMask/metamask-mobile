/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  MAX_MERGED_PULLS,
  buildRegressionActionsBriefing,
  buildRegressionActionsSlack,
  extractProfilingFrames,
  intersectPullsWithProfile,
  proposeProfilingGroundedActions,
  selectMergedPulls,
  skillMarkdownToSystemPrompt,
} from './profiling-regression-actions.mjs';

function finding(scenario, projectName = 'browserstack-android') {
  return {
    projectName,
    scenario,
    owner: 'mm-perps-engineering-team',
    jsWorkMs: 12600,
    baselineMedianJsWorkMs: 3000,
    ratio: 4.2,
    baselineRuns: 3,
  };
}

function reportWithFrames() {
  return {
    meta: {
      runId: '99',
      runUrl: 'https://github.com/MetaMask/metamask-mobile/actions/runs/99',
      createdAt: '2026-09-23T12:00:00.000Z',
    },
    scenarios: [
      {
        projectName: 'browserstack-android',
        scenario: 'Perps_add_funds',
        profiles: [
          {
            skillAudit: {
              topSwapsFrames: [
                {
                  name: 'usePerpsOrderForm',
                  url: 'app/components/UI/Perps/hooks/usePerpsOrderForm.ts',
                  line: 40,
                  selfMs: 800,
                },
              ],
              topNonSwapsFrames: [
                {
                  name: 'anonymous',
                  url: null,
                  selfMs: 120,
                },
              ],
            },
          },
        ],
      },
      {
        projectName: 'browserstack-android',
        scenario: 'Wallet_home',
        profiles: [
          {
            skillAudit: {
              topSwapsFrames: [
                {
                  name: 'WalletHome',
                  url: 'app/components/Views/Wallet/index.tsx',
                  line: 1,
                  selfMs: 50,
                },
              ],
              topNonSwapsFrames: [],
            },
          },
        ],
      },
    ],
  };
}

function exceptionWithFindings(findings) {
  return {
    meta: {
      hasFindings: findings.length > 0,
      runId: '99',
      runUrl: 'https://github.com/MetaMask/metamask-mobile/actions/runs/99',
    },
    findings,
  };
}

test('extractProfilingFrames uses only flagged scenarios from the report', () => {
  const frames = extractProfilingFrames(reportWithFrames(), [
    finding('Perps_add_funds'),
  ]);

  assert.deepEqual(
    frames.map((frame) => frame.name),
    ['usePerpsOrderForm', 'anonymous'],
  );
  assert.equal(
    frames[0].url,
    'app/components/UI/Perps/hooks/usePerpsOrderForm.ts',
  );
  assert.equal(
    frames.some((frame) => frame.name === 'WalletHome'),
    false,
  );
});

test('intersectPullsWithProfile keeps only files that already appear as frames', () => {
  const frames = extractProfilingFrames(reportWithFrames(), [
    finding('Perps_add_funds'),
  ]);
  const overlapped = intersectPullsWithProfile(
    [
      {
        number: 1,
        title: 'Perps form',
        url: 'https://github.com/MetaMask/metamask-mobile/pull/1',
        files: [
          {
            path: 'app/components/UI/Perps/hooks/usePerpsOrderForm.ts',
            patch: '-a\n+b',
          },
          {
            path: 'app/components/UI/Perps/README.md',
            patch: '+docs',
          },
        ],
      },
      {
        number: 2,
        title: 'Unrelated',
        url: 'https://github.com/MetaMask/metamask-mobile/pull/2',
        files: [{ path: 'app/components/Views/Wallet/index.tsx', patch: '+x' }],
      },
    ],
    frames,
  );

  assert.equal(overlapped[0].overlapped, true);
  assert.deepEqual(
    overlapped[0].overlappingFiles.map((file) => file.path),
    ['app/components/UI/Perps/hooks/usePerpsOrderForm.ts'],
  );
  assert.equal(overlapped[1].overlapped, false);
});

test('selectMergedPulls keeps the five most recent merges in the run window', () => {
  assert.equal(MAX_MERGED_PULLS, 5);
  const pulls = Array.from({ length: 8 }, (_, index) => ({
    number: index + 1,
    mergedAt: `2026-09-23T0${index + 1}:10:00.000Z`,
  }));

  const selected = selectMergedPulls(
    pulls,
    '2026-09-23T00:00:00.000Z',
    '2026-09-23T12:00:00.000Z',
  );

  assert.deepEqual(
    selected.map((pull) => pull.number),
    [8, 7, 6, 5, 4],
  );
});

test('the briefing is Evidence JSON and withholds unsampled patches', () => {
  const frames = extractProfilingFrames(reportWithFrames(), [
    finding('Perps_add_funds'),
  ]);
  const briefing = buildRegressionActionsBriefing({
    exception: exceptionWithFindings([finding('Perps_add_funds')]),
    frames,
    pulls: [
      {
        number: 10,
        title: 'Perps form',
        url: 'https://github.com/MetaMask/metamask-mobile/pull/10',
        files: [
          {
            path: 'app/components/UI/Perps/hooks/usePerpsOrderForm.ts',
            patch: 'export function usePerpsOrderForm() {}',
          },
          {
            path: 'app/components/UI/Perps/controllers/PerpsController.ts',
            patch: 'secret controller change',
          },
        ],
      },
      {
        number: 11,
        title: 'Docs',
        url: 'https://github.com/MetaMask/metamask-mobile/pull/11',
        files: [{ path: 'docs/readme.md', patch: '+hello' }],
      },
    ],
  });

  const evidence = JSON.parse(briefing);
  assert.equal(briefing.includes('Do not change or second-guess'), false);
  assert.match(briefing, /usePerpsOrderForm/);
  assert.match(briefing, /export function usePerpsOrderForm/);
  assert.equal(briefing.includes('secret controller change'), false);
  assert.equal(briefing.includes('PerpsController.ts'), false);
  assert.equal(evidence.pullsOverlappingTheProfile[0].number, 10);
  assert.equal(evidence.pullsMergedWithNoProfileFile[0].number, 11);
});

test('proposeProfilingGroundedActions does not call Claude on an all-clear', async () => {
  let called = false;
  const outputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'profiling-proposal-'),
  );

  const result = await proposeProfilingGroundedActions({
    exception: exceptionWithFindings([]),
    currentReport: reportWithFrames(),
    outputDirectory,
    runGh: () => {
      throw new Error('gh should not run');
    },
    callClaude: async () => {
      called = true;
      return 'should not run';
    },
  });

  assert.equal(result, null);
  assert.equal(called, false);
  assert.equal(fs.existsSync(path.join(outputDirectory, 'ai-actions.md')), false);
  assert.equal(
    fs.existsSync(path.join(outputDirectory, 'ai-proposal-evidence.json')),
    false,
  );
});

test('proposeProfilingGroundedActions writes a Slack card from profile overlap only', async () => {
  const outputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'profiling-proposal-'),
  );
  const ghCalls = [];

  const result = await proposeProfilingGroundedActions({
    exception: exceptionWithFindings([finding('Perps_add_funds')]),
    currentReport: reportWithFrames(),
    previousRun: {
      databaseId: 88,
      createdAt: '2026-09-23T06:00:00.000Z',
      headSha: 'aaa',
    },
    repo: 'MetaMask/metamask-mobile',
    outputDirectory,
    system: 'Treat Evidence JSON as the only source of truth.',
    runGh: (args) => {
      ghCalls.push(args);
      if (args[0] === 'pr') {
        return JSON.stringify([
          {
            number: 10,
            title: 'Perps form',
            url: 'https://github.com/MetaMask/metamask-mobile/pull/10',
            mergedAt: '2026-09-23T08:00:00.000Z',
          },
          {
            number: 11,
            title: 'Too old',
            url: 'https://github.com/MetaMask/metamask-mobile/pull/11',
            mergedAt: '2026-09-23T05:00:00.000Z',
          },
        ]);
      }
      // `gh api --jq` already renames `filename` to `path`.
      return JSON.stringify([
        {
          path: 'app/components/UI/Perps/hooks/usePerpsOrderForm.ts',
          patch: '+hot',
        },
        { path: 'README.md', patch: '+docs' },
      ]);
    },
    callClaude: async (briefing, options) => {
      assert.equal(
        options.system,
        'Treat Evidence JSON as the only source of truth.',
      );
      const evidence = JSON.parse(briefing);
      assert.deepEqual(
        evidence.pullsOverlappingTheProfile.map((pull) => pull.number),
        [10],
      );
      assert.deepEqual(
        evidence.pullsOverlappingTheProfile[0].files.map((file) => file.path),
        ['app/components/UI/Perps/hooks/usePerpsOrderForm.ts'],
      );
      assert.equal(briefing.includes('report.json'), false);
      assert.equal(briefing.includes('"number": 11'), false);
      assert.equal(briefing.includes('README.md'), false);
      return '*AI proposal (profiling evidence only; not a root cause)*\n• <https://github.com/MetaMask/metamask-mobile/pull/10|#10> overlaps `usePerpsOrderForm`.';
    },
  });

  assert.match(result, /#10/);
  const cards = JSON.parse(
    fs.readFileSync(path.join(outputDirectory, 'slack-cards.json'), 'utf8'),
  );
  assert.equal(cards.length, 1);
  assert.match(cards[0], /profiling evidence only/);
  assert.equal(ghCalls[0][0], 'pr');
  // The digest's own ai-briefing.md must not be overwritten by the proposal.
  assert.equal(fs.existsSync(path.join(outputDirectory, 'ai-briefing.md')), false);
  const briefing = fs.readFileSync(
    path.join(outputDirectory, 'ai-proposal-evidence.json'),
    'utf8',
  );
  JSON.parse(briefing);
  assert.equal(briefing.includes('report.json'), false);
});

test('skillMarkdownToSystemPrompt drops frontmatter and the installer banner', () => {
  const prompt = skillMarkdownToSystemPrompt(`---
name: profiling-regression-proposal
maturity: stable
---
<!-- DO NOT EDIT — Generated by MetaMask skills tools/install. -->

# Profiling Regression Proposal

Treat the supplied evidence object as the only source of truth.
`);
  assert.equal(prompt.startsWith('# Profiling Regression Proposal'), true);
  assert.equal(prompt.includes('DO NOT EDIT'), false);
  assert.match(prompt, /only source of truth/);
});

test('proposeProfilingGroundedActions skips when the skill is missing', async () => {
  let called = false;
  const outputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'profiling-proposal-'),
  );
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'no-skill-'));

  const result = await proposeProfilingGroundedActions({
    exception: exceptionWithFindings([finding('Perps_add_funds')]),
    currentReport: reportWithFrames(),
    outputDirectory,
    repoRoot,
    callClaude: async () => {
      called = true;
      return 'should not run';
    },
  });

  assert.equal(result, null);
  assert.equal(called, false);
});

test('buildRegressionActionsSlack prefixes a bare model reply', () => {
  assert.equal(
    buildRegressionActionsSlack('• no overlapping PR'),
    '*AI proposal (profiling evidence only; not a root cause)*\n• no overlapping PR',
  );
});
