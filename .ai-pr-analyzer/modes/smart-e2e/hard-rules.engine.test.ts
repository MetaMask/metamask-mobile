import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const analyzerRoot =
  process.env.AI_ANALYZER_ROOT || join(repoRoot, '..', 'ai-pr-analyzer');
const require = createRequire(import.meta.url);

const analyzerAvailable = existsSync(
  join(analyzerRoot, 'src/analysis/hard-rules.ts'),
);

function loadAnalyzer() {
  const { evaluateHardRules } = require(
    join(analyzerRoot, 'src/analysis/hard-rules.ts'),
  );
  const { loadMode } = require(join(analyzerRoot, 'src/modes/mode-loader.ts'));
  return { evaluateHardRules, loadMode };
}

const testFn = analyzerAvailable ? it : it.skip;

describe('smart-e2e hard-rules.json on the analyzer engine', () => {
  const context = {
    baseDir: repoRoot,
    baseBranch: 'origin/main',
  };

  function evaluate(changedFiles: string[]) {
    const { evaluateHardRules, loadMode } = loadAnalyzer();
    const mode = loadMode('smart-e2e', join(repoRoot, '.ai-pr-analyzer'));
    const evaluation = evaluateHardRules(
      mode.hardRules,
      changedFiles,
      [],
      context,
      mode.fallback.conservative,
      mode.catalog ?? {},
      {
        triggers: mode.hardRuleTriggers ?? {},
        mergeContinueResult: mode.mergeHardRuleContinue,
        allowContinue: mode.allowHardRuleContinue,
      },
    );
    return evaluation;
  }

  function resultOf(
    evaluation: { result: Record<string, unknown>; continue?: boolean } | null,
  ) {
    assert.ok(evaluation);
    return evaluation.result;
  }

  testFn('runs all E2E tags when an E2E-relevant workflow changes', () => {
    const evaluation = evaluate([
      '.github/workflows/ci.yml',
      '.github/workflows/run-appium-e2e-workflow.yml',
    ]);
    const result = resultOf(evaluation);
    assert.equal(evaluation!.continue, false);
    assert.deepEqual(result.selected_tags, ['ALL']);
    assert.equal(result.confidence, 100);
    assert.match(String(result.reasoning), /e2e-relevant-workflow-change/);
  });

  for (const changedFile of [
    '.github/scripts/qa-automation/reporting/e2e-report-fixture-validation.mjs',
    '.github/scripts/qa-automation/e2e-sharding/e2e-split-tags-shards.mjs',
    '.github/actions/smart-e2e-selection/e2e-smart-selection.mjs',
    '.github/scripts/qa-automation/stats/e2e-freeze-timings.mjs',
    '.github/scripts/qa-automation/e2e-ci-orchestration/compute-e2e-platform-flags.mjs',
    '.github/scripts/qa-automation/e2e-ci-orchestration/run-compute-e2e-platform-flags.mjs',
  ]) {
    testFn(`runs all E2E tags when ${changedFile} changes`, () => {
      const result = resultOf(evaluate([changedFile]));
      assert.deepEqual(result.selected_tags, ['ALL']);
      assert.match(String(result.reasoning), /e2e-relevant-workflow-change/);
    });
  }

  testFn(
    'selects SmokeAccounts when only an accounts smoke spec changes',
    () => {
      const evaluation = evaluate([
        'tests/smoke-appium/accounts/create-wallet-account.spec.ts',
      ]);
      const result = resultOf(evaluation);
      assert.equal(evaluation!.continue, true);
      assert.ok((result.selected_tags as string[]).includes('SmokeAccounts'));
      assert.ok(Number(result.confidence) >= 90);
    },
  );

  testFn(
    'selects SmokeAccounts when shared page object and accounts smoke spec change together',
    () => {
      const result = resultOf(
        evaluate([
          'tests/page-objects/wallet/AccountListBottomSheet.ts',
          'tests/smoke-appium/accounts/create-wallet-account.spec.ts',
        ]),
      );
      assert.ok((result.selected_tags as string[]).includes('SmokeAccounts'));
    },
  );

  testFn(
    'includes smoke spec tags when a shared page object affects smoke importers',
    () => {
      const evaluation = evaluate([
        'tests/page-objects/wallet/AccountListBottomSheet.ts',
      ]);
      const result = resultOf(evaluation);
      assert.equal(evaluation!.continue, true);
      assert.ok((result.selected_tags as string[]).includes('SmokeAccounts'));
    },
  );

  testFn(
    'keeps targeted smoke tags when a page object changes with a performance workflow',
    () => {
      const result = resultOf(
        evaluate([
          '.github/workflows/performance-test-runner.yml',
          'tests/page-objects/Onboarding/ImportWalletView.ts',
          'tests/performance/onboarding/helpers/seedlessOnboardingTimers.ts',
          'tests/performance/onboarding/seedless-apple-onboarding.spec.ts',
        ]),
      );
      assert.ok(
        (result.selected_tags as string[]).includes('SmokeWalletPlatform'),
      );
      assert.match(String(result.reasoning), /test-shared-infra-impact/);
    },
  );

  testFn('runs all E2E tags when locales/languages/en.json changes', () => {
    const result = resultOf(evaluate(['locales/languages/en.json']));
    assert.match(String(result.reasoning), /en-locale-change/);
    assert.deepEqual(result.selected_tags, ['ALL']);
    assert.equal(result.confidence, 100);
  });

  testFn('runs all E2E tags when en.json is among other changed files', () => {
    const result = resultOf(
      evaluate([
        'locales/languages/en.json',
        'app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.test.tsx',
      ]),
    );
    assert.match(String(result.reasoning), /en-locale-change/);
    assert.deepEqual(result.selected_tags, ['ALL']);
  });

  testFn(
    'applies shared infra rule when page-object changes alongside ignorable workflow files',
    () => {
      const result = resultOf(
        evaluate([
          '.github/workflows/performance-test-runner.yml',
          'tests/page-objects/wallet/AccountListBottomSheet.ts',
        ]),
      );
      assert.ok((result.selected_tags as string[]).includes('SmokeAccounts'));
    },
  );

  testFn(
    'bails to AI when page-object changes alongside actual app code',
    () => {
      const result = evaluate([
        'app/components/Views/Wallet/index.tsx',
        'tests/page-objects/wallet/AccountListBottomSheet.ts',
      ]);
      assert.equal(result, null);
    },
  );
});
