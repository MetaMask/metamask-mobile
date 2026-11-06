import type { ScenarioRunReport, StepOutcome } from './types.ts';

const RULE = '═'.repeat(63);
const THIN_RULE = '─'.repeat(63);

const STEP_ICONS: Record<StepOutcome['status'], string> = {
  passed: '✅',
  healed: '🩹',
  failed: '❌',
  skipped: '⏭️',
};

function describeResolution(step: StepOutcome): string {
  if (step.resolvedBy === null) {
    return step.status === 'skipped' ? 'not run' : 'unresolved';
  }
  if (step.resolvedBy === 'binding') {
    return 'binding';
  }
  const locator = step.locator
    ? ` ${step.locator.strategy}=${step.locator.value}`
    : '';
  return `${step.resolvedBy}${locator}`;
}

/** Console block printed after every scenario run (mirrors the quality gates block). */
export function formatScenarioReport(report: ScenarioRunReport): string {
  const lines = [
    RULE,
    '                    SCENARIO RUN',
    RULE,
    `Scenario: ${report.scenarioId} (${report.platform})`,
    `Status: ${report.status}   policy=${report.policy}   ai=${report.ai.available ? `on (${report.ai.calls} call(s), ${report.ai.totalMs}ms)` : 'off'}`,
    THIN_RULE,
  ];

  for (const step of report.steps) {
    const role = step.role === 'untimed' ? '' : ` [${step.role}]`;
    lines.push(
      `${STEP_ICONS[step.status]} ${step.id}${role}: ${describeResolution(step)} (${step.durationMs}ms)`,
    );
    for (const error of step.status === 'passed' ? [] : step.errors) {
      lines.push(`   └─ ${error}`);
    }
    for (const skipped of step.status === 'passed' ? [] : step.skippedTiers) {
      lines.push(`   └─ skipped ${skipped}`);
    }
  }

  lines.push(THIN_RULE);
  for (const timer of report.timers) {
    lines.push(
      timer.valid
        ? `⏱️ ${timer.durationMs}ms  ${timer.name}`
        : `⚠️ INVALID  ${timer.name}\n   └─ ${timer.reason}`,
    );
  }
  if (report.qualityGates.evaluated) {
    lines.push(
      `Quality gates (pre-check): ${report.qualityGates.passed ? 'passed' : 'FAILED'}`,
    );
  }
  if (report.heals.length > 0) {
    lines.push(
      `Heals: ${report.heals.length} — see the "scenario-heal-report" attachment for the proposed lockfile patch`,
    );
  }
  lines.push(RULE);
  return lines.join('\n');
}
