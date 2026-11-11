import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { writeSmartE2eCatalog } from './catalog-from-tags';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const analyzerRoot =
  process.env.AI_ANALYZER_ROOT || join(repoRoot, '.ai-analyzer-action');
const require = createRequire(import.meta.url);

function loadAnalyzer() {
  const { evaluateHardRules } = require(
    join(analyzerRoot, 'src/analysis/hard-rules.ts'),
  );
  const { loadMode } = require(join(analyzerRoot, 'src/modes/mode-loader.ts'));
  return { evaluateHardRules, loadMode };
}

describe('smart-e2e hard-rules.json on the analyzer engine', () => {
  const context = {
    baseDir: repoRoot,
    baseBranch: 'origin/main',
  };

  function evaluate(
    changedFiles: string[],
    contextOverride: Partial<typeof context> = {},
  ) {
    writeSmartE2eCatalog();
    const { evaluateHardRules, loadMode } = loadAnalyzer();
    const mode = loadMode('smart-e2e', join(repoRoot, '.ai-pr-analyzer'));
    const evaluation = evaluateHardRules(
      mode.hardRules,
      changedFiles,
      [],
      { ...context, ...contextOverride },
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

  it('runs all E2E tags when an E2E-relevant workflow changes', () => {
    const evaluation = evaluate([
      '.github/workflows/ci.yml',
      '.github/workflows/run-appium-e2e-workflow.yml',
    ]);
    const result = resultOf(evaluation);
    assert.equal(evaluation!.continue, true);
    assert.deepEqual(result.selected_tags, ['ALL']);
    assert.equal(result.confidence, 100);
    assert.match(String(result.reasoning), /e2e-relevant-workflow-change/);
  });

  for (const changedFile of [
    '.github/scripts/qa-automation/reporting/e2e-report-fixture-validation.mjs',
    '.github/scripts/qa-automation/e2e-sharding/e2e-split-tags-shards.mjs',
    '.github/actions/smart-e2e-selection/e2e-smart-selection.mjs',
    '.github/actions/smart-e2e-selection/action.yml',
    '.github/actions/setup-e2e-env/action.yml',
    '.github/scripts/qa-automation/stats/e2e-freeze-timings.mjs',
    '.github/scripts/qa-automation/e2e-ci-orchestration/compute-e2e-platform-flags.mjs',
    '.github/scripts/qa-automation/e2e-ci-orchestration/run-compute-e2e-platform-flags.mjs',
  ]) {
    it(`runs all E2E tags when ${changedFile} changes`, () => {
      const result = resultOf(evaluate([changedFile]));
      assert.deepEqual(result.selected_tags, ['ALL']);
      assert.match(String(result.reasoning), /e2e-relevant-workflow-change/);
    });
  }

  it('selects SmokeAccounts when only an accounts smoke spec changes', () => {
    const evaluation = evaluate([
      'tests/smoke-appium/accounts/create-wallet-account.spec.ts',
    ]);
    const result = resultOf(evaluation);
    assert.equal(evaluation!.continue, true);
    assert.ok((result.selected_tags as string[]).includes('SmokeAccounts'));
    assert.ok(Number(result.confidence) >= 90);
  });

  it('selects SmokeAccounts when shared page object and accounts smoke spec change together', () => {
    const result = resultOf(
      evaluate([
        'tests/page-objects/wallet/AccountListBottomSheet.ts',
        'tests/smoke-appium/accounts/create-wallet-account.spec.ts',
      ]),
    );
    assert.ok((result.selected_tags as string[]).includes('SmokeAccounts'));
  });

  it('unions an unrelated changed smoke spec tag with import-graph tags', () => {
    const result = resultOf(
      evaluate([
        'tests/page-objects/wallet/AccountListBottomSheet.ts',
        'tests/smoke-appium/perps/perps-edit-tpsl-trigger.spec.ts',
      ]),
    );
    assert.ok((result.selected_tags as string[]).includes('SmokeAccounts'));
    assert.ok((result.selected_tags as string[]).includes('SmokePerps'));
  });

  it('includes smoke spec tags when a shared page object affects smoke importers', () => {
    const evaluation = evaluate([
      'tests/page-objects/wallet/AccountListBottomSheet.ts',
    ]);
    const result = resultOf(evaluation);
    assert.equal(evaluation!.continue, true);
    assert.ok((result.selected_tags as string[]).includes('SmokeAccounts'));
  });

  it('keeps targeted smoke tags when a page object changes with a performance workflow', () => {
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
  });

  // Base pinned to HEAD so en.json has no key diff regardless of the PR
  // running these tests; key-level behaviour is in locale-key-impact.test.ts.
  const unchangedLocale = { baseBranch: 'HEAD' };

  it('does not force ALL when en.json has no modified or removed keys', () => {
    const evaluation = evaluate(['locales/languages/en.json'], unchangedLocale);
    assert.equal(evaluation, null);
  });

  it('keeps targeted tags when en.json changes alongside a page object', () => {
    const result = resultOf(
      evaluate(
        [
          'locales/languages/en.json',
          'tests/page-objects/wallet/AccountListBottomSheet.ts',
        ],
        unchangedLocale,
      ),
    );
    assert.ok((result.selected_tags as string[]).includes('SmokeAccounts'));
    assert.ok(!(result.selected_tags as string[]).includes('ALL'));
  });

  it('still runs ALL when en.json changes alongside global infrastructure', () => {
    const result = resultOf(
      evaluate(
        ['locales/languages/en.json', 'app/store/index.ts'],
        unchangedLocale,
      ),
    );
    assert.deepEqual(result.selected_tags, ['ALL']);
    assert.match(String(result.reasoning), /global-infrastructure-change/);
  });

  it('applies shared infra rule when page-object changes alongside ignorable workflow files', () => {
    const result = resultOf(
      evaluate([
        '.github/workflows/performance-test-runner.yml',
        'tests/page-objects/wallet/AccountListBottomSheet.ts',
      ]),
    );
    assert.ok((result.selected_tags as string[]).includes('SmokeAccounts'));
  });

  it('bails to AI when page-object changes alongside actual app code (index stem excluded)', () => {
    const result = evaluate([
      'app/components/Views/Wallet/index.tsx',
      'tests/page-objects/wallet/AccountListBottomSheet.ts',
    ]);
    assert.equal(result, null);
  });

  it('selects SmokeConfirmations when ActivityDetails component changes', () => {
    const evaluation = evaluate([
      'app/components/Views/ActivityDetails/ActivityDetails.tsx',
    ]);
    const result = resultOf(evaluation);
    assert.equal(evaluation!.continue, true);
    assert.ok(
      (result.selected_tags as string[]).includes('SmokeConfirmations'),
      `Expected SmokeConfirmations in ${JSON.stringify(result.selected_tags)}`,
    );
    assert.match(String(result.reasoning), /app-source-import-graph/);
  });
});
