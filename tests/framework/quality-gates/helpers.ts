/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { TestInfo } from '@playwright/test';
import { createLogger } from '../logger';

const logger = createLogger({
  name: 'Quality Gates - helpers',
});

// File-based registry to track tests that failed due to quality gates
// This persists across Playwright workers which run in separate processes
const QUALITY_GATE_FAILURES_FILE = path.join(
  os.tmpdir(),
  'playwright-quality-gate-failures.json',
);

/**
 * Load quality gate failures from file
 * @returns The set of test IDs that failed due to quality gates
 */
function loadFailures(): Set<string> {
  try {
    if (fs.existsSync(QUALITY_GATE_FAILURES_FILE)) {
      const data = fs.readFileSync(QUALITY_GATE_FAILURES_FILE, 'utf-8');
      return new Set(JSON.parse(data) as string[]);
    }
  } catch (error) {
    logger.warn(
      '⚠️ Could not load quality gate failures file:',
      (error as Error).message,
    );
  }
  return new Set();
}

/**
 * Save quality gate failures to file
 * @param failures - The set of test IDs that failed due to quality gates
 */
function saveFailures(failures: Set<string>): void {
  try {
    fs.writeFileSync(
      QUALITY_GATE_FAILURES_FILE,
      JSON.stringify([...failures]),
      'utf-8',
    );
  } catch (error) {
    logger.warn(
      '⚠️ Could not save quality gate failures file:',
      (error as Error).message,
    );
  }
}

/**
 * Mark a test as failed due to quality gates
 * @param testId - Unique test identifier
 * @returns The set of test IDs that failed due to quality gates
 */
export function markQualityGateFailure(testId: string): void {
  const failures = loadFailures();
  failures.add(testId);
  saveFailures(failures);
  logger.info(
    `📝 Marked test "${testId}" as quality gate failure (file: ${QUALITY_GATE_FAILURES_FILE})`,
  );
}

/**
 * Check if a test previously failed due to quality gates
 * @param testId - Unique test identifier
 * @returns True if the test previously failed due to quality gates
 */
export function hasQualityGateFailure(testId: string): boolean {
  const failures = loadFailures();
  return failures.has(testId);
}

/**
 * Clear all quality gate failures (call at the start of a test run)
 * @returns The set of test IDs that failed due to quality gates
 */
export function clearQualityGateFailures(): void {
  try {
    if (fs.existsSync(QUALITY_GATE_FAILURES_FILE)) {
      fs.unlinkSync(QUALITY_GATE_FAILURES_FILE);
      logger.info('Cleared quality gate failures file');
    }
  } catch (error) {
    logger.warn(
      '⚠️ Could not clear quality gate failures file:',
      (error as Error).message,
    );
  }
}

/**
 * Generate a unique test ID from testInfo
 * @param testInfo - Playwright testInfo object
 * @returns The unique test ID
 */
export function getTestId(testInfo: TestInfo): string {
  return `${testInfo.project.name}::${testInfo.titlePath.join('::')}`;
}
