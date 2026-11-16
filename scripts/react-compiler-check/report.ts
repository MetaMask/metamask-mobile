import { type Baseline, type Comparison, summarize } from './baseline';

export const BASELINE_FILE = 'scripts/react-compiler-check/baseline.json';
export const MIGRATION_SKILL_URL =
  'https://github.com/MetaMask/skills/tree/main/domains/assets/skills/react-compiler-migration';
export const DASHBOARD_URL =
  'https://metamask-mobile-react-compiler-scan.vercel.app/';

export function formatSummary(
  before: Baseline,
  after: Baseline,
  checkedFiles: number,
  elapsedMs: number,
): string {
  const previous = summarize(before);
  const next = summarize(after);
  const signed = (value: number): string => (value > 0 ? `+${value}` : `${value}`);
  return [
    `React Compiler check: ${checkedFiles} files in ${(elapsedMs / 1000).toFixed(1)}s`,
    `Baseline: ${previous.files} files / ${previous.failures} failures`,
    `Current:  ${next.files} files / ${next.failures} failures (${signed(
      next.files - previous.files,
    )} files, ${signed(next.failures - previous.failures)} failures)`,
  ].join('\n');
}

export function formatRegressions(comparison: Comparison): string {
  if (comparison.regressions.length === 0) {
    return '';
  }
  const lines = [
    `✖ ${comparison.regressions.length} file(s) have new React Compiler failures:`,
    '',
  ];
  for (const regression of comparison.regressions) {
    const header =
      regression.baselineCount === 0
        ? `${regression.path} (new: ${regression.count} failure(s))`
        : `${regression.path} (${regression.baselineCount} → ${regression.count} failure(s))`;
    lines.push(header);
    for (const failure of regression.failures) {
      lines.push(`  ${regression.path}:${failure.line}:${failure.column}  ${failure.reason}`);
    }
    for (const reason of regression.newReasons) {
      lines.push(`  new reason: ${reason}`);
    }
    lines.push('');
  }
  lines.push(
    'Fix these so the compiler can optimize the code. The fix recipes are in the react-compiler-migration skill:',
    `  ${MIGRATION_SKILL_URL}`,
    'Do not silence them with eslint-disable or "use no memo".',
    'Re-run: yarn lint:react-compiler <file>',
    `If the failure is intentional and approved in review, record it with: yarn lint:react-compiler --update --allow-new`,
  );
  return lines.join('\n');
}

export function formatImprovements(comparison: Comparison): string {
  if (comparison.improvements.length === 0) {
    return '';
  }
  const lines = [
    `✖ ${comparison.improvements.length} file(s) improved but ${BASELINE_FILE} still lists the old failures:`,
    '',
  ];
  for (const improvement of comparison.improvements) {
    lines.push(
      `  ${improvement.path} (${improvement.baselineCount} → ${improvement.count} failure(s))`,
    );
  }
  lines.push(
    '',
    'Run `yarn lint:react-compiler --update` to shrink the baseline and commit the result.',
  );
  return lines.join('\n');
}
