#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * Appends a Playwright run summary to $GITHUB_STEP_SUMMARY (GitHub Actions job summary).
 * Complements the built-in `github` reporter, which writes annotations to the job log only.
 */
import { appendFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testsRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** @typedef {import('@playwright/test/reporter').FullConfig} FullConfig */
/** @typedef {import('@playwright/test/reporter').FullResult} FullResult */
/** @typedef {import('@playwright/test/reporter').Suite} Suite */
/** @typedef {import('@playwright/test/reporter').TestCase} TestCase */

export default class GitHubStepSummaryReporter {
  /** @type {Suite | undefined} */
  #rootSuite;

  /** @param {FullConfig} _config @param {Suite} suite */
  onBegin(_config, suite) {
    this.#rootSuite = suite;
  }

  /** @param {FullResult} result */
  onEnd(result) {
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryPath) {
      return;
    }

    const stats = this.#rootSuite
      ? this.#collectStats(this.#rootSuite)
      : { passed: 0, failed: 0, flaky: 0, skipped: 0, total: 0 };

    const title =
      process.env.APPIUM_SMOKE_JOB_TITLE ?? 'Appium Smoke Tests';
    const statusEmoji = result.status === 'passed' ? '✅' : '❌';
    const suiteName = process.env.APPIUM_SMOKE_SUITE_NAME?.trim();
    const reportDir = suiteName
      ? join(testsRoot, 'test-reports/appium-smoke-report', suiteName)
      : join(testsRoot, 'test-reports/appium-smoke-report');
    const videosDir = suiteName
      ? join(testsRoot, 'test-reports/appium-smoke-videos', suiteName)
      : join(testsRoot, 'test-reports/appium-smoke-videos');
    const videosArtifactName =
      process.env.APPIUM_SMOKE_VIDEOS_ARTIFACT_NAME ??
      'appium-smoke-videos';
    const artifactsUrl =
      process.env.GITHUB_SERVER_URL &&
      process.env.GITHUB_REPOSITORY &&
      process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}#artifacts`
        : undefined;
    const artifactName =
      process.env.APPIUM_SMOKE_ARTIFACT_NAME ?? 'appium-smoke-report';

    const lines = [
      `## ${title}`,
      '',
      '| Result | Tests | Passed | Failed | Flaky | Skipped |',
      '|--------|------:|-------:|-------:|------:|--------:|',
      `| ${statusEmoji} ${result.status} | ${stats.total} | ${stats.passed} | ${stats.failed} | ${stats.flaky} | ${stats.skipped} |`,
      '',
      '### Playwright report',
      '',
    ];

    if (existsSync(join(reportDir, 'index.html'))) {
      lines.push(
        `Download the **${artifactName}** artifact, then open \`index.html\` locally.`,
      );
      if (artifactsUrl) {
        lines.push('', `[View run artifacts](${artifactsUrl})`);
      }
    } else {
      lines.push('No HTML report was generated (run may have aborted early).');
    }

    lines.push(
      '',
      'Failure details appear as inline annotations on this job (`github` reporter).',
    );

    const videoFiles = existsSync(videosDir)
      ? readdirSync(videosDir).filter((name) => name.endsWith('.mp4'))
      : [];
    if (videoFiles.length > 0) {
      lines.push('', '### Failure recordings', '');
      lines.push(
        `Download the **${videosArtifactName}** artifact for MP4 screen recordings (${videoFiles.length} file(s)).`,
      );
      if (artifactsUrl) {
        lines.push('', `[View run artifacts](${artifactsUrl})`);
      }
    }

    appendFileSync(summaryPath, `${lines.join('\n')}\n`);
  }

  /** @param {Suite} suite */
  #collectStats(suite) {
    /** @type {TestCase[]} */
    const tests = suite.allTests();
    let passed = 0;
    let failed = 0;
    let flaky = 0;
    let skipped = 0;

    for (const test of tests) {
      switch (test.outcome()) {
        case 'expected':
          passed += 1;
          break;
        case 'unexpected':
          failed += 1;
          break;
        case 'flaky':
          flaky += 1;
          break;
        case 'skipped':
          skipped += 1;
          break;
        default:
          break;
      }
    }

    return {
      passed,
      failed,
      flaky,
      skipped,
      total: tests.length,
    };
  }
}
