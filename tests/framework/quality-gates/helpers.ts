/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import type { TestInfo } from '@playwright/test';
import { createLogger } from '../logger';

const logger = createLogger({
  name: 'Quality Gates - helpers',
});

// One marker per test avoids cross-process read-modify-write races.
const QUALITY_GATE_FAILURES_DIR = path.join(
  os.tmpdir(),
  'playwright-quality-gate-failures',
);

function qualityGateFailureMarker(testId: string): string {
  const markerName = createHash('sha256').update(testId).digest('hex');
  return path.join(QUALITY_GATE_FAILURES_DIR, markerName);
}

/**
 * Mark a test as failed due to quality gates
 * @param testId - Unique test identifier
 * @returns The set of test IDs that failed due to quality gates
 */
export function markQualityGateFailure(testId: string): void {
  try {
    fs.mkdirSync(QUALITY_GATE_FAILURES_DIR, { recursive: true });
    fs.writeFileSync(qualityGateFailureMarker(testId), '', {
      flag: 'a',
    });
    logger.info(`📝 Marked test "${testId}" as quality gate failure`);
  } catch (error) {
    logger.warn(
      '⚠️ Could not mark quality gate failure:',
      (error as Error).message,
    );
  }
}

/**
 * Check if a test previously failed due to quality gates
 * @param testId - Unique test identifier
 * @returns True if the test previously failed due to quality gates
 */
export function hasQualityGateFailure(testId: string): boolean {
  return fs.existsSync(qualityGateFailureMarker(testId));
}

/**
 * Clear all quality gate failures (call at the start of a test run)
 * @returns The set of test IDs that failed due to quality gates
 */
export function clearQualityGateFailures(): void {
  try {
    if (fs.existsSync(QUALITY_GATE_FAILURES_DIR)) {
      fs.rmSync(QUALITY_GATE_FAILURES_DIR, {
        recursive: true,
        force: true,
      });
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
