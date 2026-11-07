import { formatScenarioReport } from './formatScenarioReport.ts';
import type { ScenarioRunReport } from './types.ts';

const report: ScenarioRunReport = {
  scenarioId: 'swap-eth-to-usdc',
  title: 'Swap',
  platform: 'android',
  policy: 'report',
  status: 'PASS_HEALED_TRIGGER',
  steps: [
    {
      id: 'open-swap',
      kind: 'do',
      text: 'Tap the Swap button on the wallet home',
      role: 'trigger',
      status: 'healed',
      resolvedBy: 'alternative',
      locator: { strategy: 'testID', value: 'wallet-swap-button' },
      durationMs: 812,
      errors: ['binding WalletView.tapWalletSwapButton: Simulated drift'],
      skippedTiers: [],
    },
    {
      id: 'swap-screen-visible',
      kind: 'expect',
      text: 'The swap screen with the source amount input is visible',
      role: 'until',
      status: 'passed',
      resolvedBy: 'binding',
      locator: null,
      durationMs: 640,
      errors: [],
      skippedTiers: [],
    },
  ],
  timers: [
    {
      name: 'Time since the user clicks on the "Swap" button until the swap page is loaded',
      after: 'open-swap',
      until: 'swap-screen-visible',
      valid: true,
      durationMs: 612,
      reason: null,
    },
  ],
  heals: [
    {
      stepId: 'open-swap',
      role: 'trigger',
      tier: 'alternative',
      locator: { strategy: 'testID', value: 'wallet-swap-button' },
      primaryError: 'Simulated drift',
      durationMs: 812,
      diagnosisOnly: false,
      proposedLockPatch: { stepId: 'open-swap', locators: [] },
    },
  ],
  ai: { available: false, calls: 0, totalMs: 0 },
  qualityGates: { evaluated: true, passed: true, violations: [] },
};

describe('formatScenarioReport', () => {
  it('prints status, per-step resolution, timers and heal summary', () => {
    const output = formatScenarioReport(report);

    expect(output).toContain(
      'Status: PASS_HEALED_TRIGGER   policy=report   ai=off',
    );
    expect(output).toContain(
      '🩹 open-swap [trigger]: alternative testID=wallet-swap-button (812ms)',
    );
    expect(output).toContain(
      '   └─ binding WalletView.tapWalletSwapButton: Simulated drift',
    );
    expect(output).toContain('✅ swap-screen-visible [until]: binding (640ms)');
    expect(output).toContain(
      '⏱️ 612ms  Time since the user clicks on the "Swap" button until the swap page is loaded',
    );
    expect(output).toContain('Quality gates (pre-check): passed');
    expect(output).toContain('Heals: 1');
  });
});
