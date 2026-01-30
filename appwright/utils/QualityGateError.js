/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Custom error class for Quality Gate failures.
 * Tests that fail with this error should NOT be retried
 * because the performance measurement was successful - only the threshold was exceeded.
 */
class QualityGateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QualityGateError';
    this.isQualityGateError = true;
  }
}

// File-based registry to track tests that failed due to quality gates
// This persists across Playwright workers which run in separate processes
const QUALITY_GATE_FAILURES_FILE = path.join(
  os.tmpdir(),
  'appwright-quality-gate-failures.json',
);

/**
 * Load quality gate failures from file
 * @returns {Set<string>}
 */
function loadFailures() {
  try {
    if (fs.existsSync(QUALITY_GATE_FAILURES_FILE)) {
      const data = fs.readFileSync(QUALITY_GATE_FAILURES_FILE, 'utf-8');
      return new Set(JSON.parse(data));
    }
  } catch (error) {
    console.warn(
      '⚠️ Could not load quality gate failures file:',
      error.message,
    );
  }
  return new Set();
}

/**
 * Save quality gate failures to file
 * @param {Set<string>} failures
 */
function saveFailures(failures) {
  try {
    fs.writeFileSync(
      QUALITY_GATE_FAILURES_FILE,
      JSON.stringify([...failures]),
      'utf-8',
    );
  } catch (error) {
    console.warn(
      '⚠️ Could not save quality gate failures file:',
      error.message,
    );
  }
}

/**
 * Mark a test as failed due to quality gates
 * @param {string} testId - Unique test identifier
 */
export function markQualityGateFailure(testId) {
  const failures = loadFailures();
  failures.add(testId);
  saveFailures(failures);
  console.log(
    `📝 Marked test "${testId}" as quality gate failure (file: ${QUALITY_GATE_FAILURES_FILE})`,
  );
}

/**
 * Check if a test previously failed due to quality gates
 * @param {string} testId - Unique test identifier
 * @returns {boolean}
 */
export function hasQualityGateFailure(testId) {
  const failures = loadFailures();
  return failures.has(testId);
}

/**
 * Clear all quality gate failures (call at the start of a test run)
 */
export function clearQualityGateFailures() {
  try {
    if (fs.existsSync(QUALITY_GATE_FAILURES_FILE)) {
      fs.unlinkSync(QUALITY_GATE_FAILURES_FILE);
      console.log('🧹 Cleared quality gate failures file');
    }
  } catch (error) {
    console.warn(
      '⚠️ Could not clear quality gate failures file:',
      error.message,
    );
  }
}

/**
 * Generate a unique test ID from testInfo
 * @param {Object} testInfo - Playwright testInfo object
 * @returns {string}
 */
export function getTestId(testInfo) {
  return `${testInfo.project.name}::${testInfo.titlePath.join('::')}`;
}

export default QualityGateError;
