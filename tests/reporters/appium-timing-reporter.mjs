#!/usr/bin/env node
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

const testsRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const ATTACHMENT_NAME = 'appium-phase-timings';

/** @typedef {import('@playwright/test/reporter').FullConfig} FullConfig */
/** @typedef {import('@playwright/test/reporter').FullResult} FullResult */
/** @typedef {import('@playwright/test/reporter').Suite} Suite */
/** @typedef {import('@playwright/test/reporter').TestCase} TestCase */
/** @typedef {import('@playwright/test/reporter').TestResult} TestResult */

/**
 * @typedef {object} PhaseTimingEntry
 * @property {Record<string, number>} phases
 * @property {Record<string, unknown>} meta
 * @property {string} outcome
 * @property {number} retry
 * @property {number} durationMs
 * @property {string} title
 * @property {string} file
 * @property {string} [projectName]
 */

export default class AppiumTimingReporter {
  /** @type {PhaseTimingEntry[]} */
  #entries = [];

  /** @type {string | undefined} */
  #outputPath;

  /** @param {FullConfig} _config @param {Suite} _suite */
  onBegin(_config, _suite) {
    const suiteName = process.env.APPIUM_SMOKE_SUITE_NAME?.trim() || 'local';
    const outDir = join(testsRoot, 'test-reports', 'appium-timings');
    mkdirSync(outDir, { recursive: true });
    this.#outputPath = join(outDir, `${suiteName}.json`);
  }

  /**
   * @param {TestCase} test
   * @param {TestResult} result
   */
  onTestEnd(test, result) {
    const attachment = result.attachments.find((a) => a.name === ATTACHMENT_NAME);
    if (!attachment) {
      return;
    }

    /** @type {{ phases?: Record<string, number>, meta?: Record<string, unknown> } | null} */
    let parsed = null;
    try {
      if (attachment.body) {
        const text =
          typeof attachment.body === 'string'
            ? attachment.body
            : Buffer.from(attachment.body).toString('utf8');
        parsed = JSON.parse(text);
      } else if (attachment.path) {
        // Path-based attachments are uncommon for this payload; skip quietly.
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

  /** @param {FullResult} result */
  onEnd(result) {
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

    writeFileSync(this.#outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }
}
