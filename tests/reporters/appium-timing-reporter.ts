/* eslint-disable import-x/no-nodejs-modules */
/**
 * Collects Appium phase-timing attachments into a suite JSON artifact.
 *
 * Output: tests/test-reports/appium-timings/<suite|local>.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { PHASE_TIMINGS_ATTACHMENT_NAME } from '../framework/telemetry/PhaseTimer.ts';

const testsRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

interface PhaseTimingEntry {
  phases: Record<string, number>;
  meta: Record<string, unknown>;
  outcome: string;
  retry: number;
  durationMs: number;
  title: string;
  file: string;
  projectName?: string;
}

export default class AppiumTimingReporter implements Reporter {
  #entries: PhaseTimingEntry[] = [];
  #outputPath: string | undefined;

  onBegin(_config: FullConfig, _suite: Suite): void {
    const suiteName = process.env.APPIUM_SMOKE_SUITE_NAME?.trim() || 'local';
    const outDir = join(testsRoot, 'test-reports', 'appium-timings');
    mkdirSync(outDir, { recursive: true });
    this.#outputPath = join(outDir, `${suiteName}.json`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const attachment = result.attachments.find(
      (a) => a.name === PHASE_TIMINGS_ATTACHMENT_NAME,
    );
    if (!attachment) {
      return;
    }

    let parsed: {
      phases?: Record<string, number>;
      meta?: Record<string, unknown>;
    } | null = null;
    try {
      if (attachment.body) {
        const text =
          typeof attachment.body === 'string'
            ? attachment.body
            : Buffer.from(attachment.body).toString('utf8');
        parsed = JSON.parse(text) as {
          phases?: Record<string, number>;
          meta?: Record<string, unknown>;
        };
      } else if (attachment.path) {
        return;
      }
    } catch {
      return;
    }

    if (!parsed || typeof parsed !== 'object') {
      return;
    }

    this.#entries.push({
      phases: parsed.phases ?? {},
      meta: {
        ...(parsed.meta ?? {}),
        outcome: result.status,
        retry: result.retry,
      },
      outcome: result.status,
      retry: result.retry,
      durationMs: result.duration,
      title: test.title,
      file: test.location.file,
      projectName: test.parent?.project()?.name,
    });
  }

  onEnd(result: FullResult): void {
    if (!this.#outputPath) {
      return;
    }

    const suiteName = process.env.APPIUM_SMOKE_SUITE_NAME?.trim() || 'local';
    const payload = {
      schemaVersion: 1,
      suite: suiteName,
      status: result.status,
      generatedAt: new Date().toISOString(),
      runId: process.env.GITHUB_RUN_ID,
      job: process.env.APPIUM_SMOKE_JOB_TITLE,
      tests: this.#entries,
    };

    writeFileSync(
      this.#outputPath,
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8',
    );
  }
}
