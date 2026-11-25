/* eslint-disable import-x/no-nodejs-modules */
/**
 * End-of-run summary of E2E steps that failed for a flaky reason and were
 * recovered by AI. Reads the `ai-flaky-recovery-<n>.json` attachments written
 * by the `aiFlakyRecovery` fixture.
 *
 * Output (only when something was recovered):
 * - tests/test-reports/ai-flaky-recovery/<suite|local>.json
 * - tests/test-reports/ai-flaky-recovery/<suite|local>.md
 * - the same markdown appended to $GITHUB_STEP_SUMMARY when set
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import {
  FLAKY_RECORD_ATTACHMENT_PATTERN,
  parseRecoveryRecord,
  renderRunSummaryMarkdown,
  type RecoverySummaryEntry,
} from '../framework/flaky-recovery/FlakyRecoveryReporting.ts';

export interface RecoverySummaryOutput {
  suite: string;
  /** Repository root; the report goes under `<root>/tests/test-reports`. */
  rootDir: string;
  /** `$GITHUB_STEP_SUMMARY` path; the markdown is appended when set. */
  stepSummaryPath?: string;
  runId?: string;
}

/** Writes the JSON + markdown summary. Returns false when nothing was recovered. */
export function writeFlakyRecoverySummary(
  entries: RecoverySummaryEntry[],
  output: RecoverySummaryOutput,
): boolean {
  if (entries.length === 0) {
    return false;
  }

  const markdown = renderRunSummaryMarkdown(entries, output.suite);
  const outDir = join(
    output.rootDir,
    'tests',
    'test-reports',
    'ai-flaky-recovery',
  );
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, `${output.suite}.json`),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        suite: output.suite,
        generatedAt: new Date().toISOString(),
        runId: output.runId,
        recoveries: entries,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  writeFileSync(join(outDir, `${output.suite}.md`), markdown, 'utf8');

  if (output.stepSummaryPath) {
    appendFileSync(output.stepSummaryPath, `\n${markdown}`, 'utf8');
  }
  return true;
}

function resolveSuiteName(raw: string | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return 'local';
  }
  return trimmed;
}

export default class AiFlakyRecoveryReporter implements Reporter {
  readonly #entries: RecoverySummaryEntry[] = [];

  onTestEnd(_test: TestCase, result: TestResult): void {
    for (const attachment of result.attachments) {
      if (
        !FLAKY_RECORD_ATTACHMENT_PATTERN.test(attachment.name) ||
        !attachment.body
      ) {
        continue;
      }
      const record = parseRecoveryRecord(attachment.body.toString('utf8'));
      if (record) {
        this.#entries.push({ record, status: result.status });
      }
    }
  }

  onEnd(_result: FullResult): void {
    writeFlakyRecoverySummary(this.#entries, {
      suite: resolveSuiteName(process.env.APPIUM_SMOKE_SUITE_NAME),
      // Repo-root relative: yarn scripts always run from the repository root.
      rootDir: process.cwd(),
      stepSummaryPath: process.env.GITHUB_STEP_SUMMARY,
      runId: process.env.GITHUB_RUN_ID,
    });
  }
}
