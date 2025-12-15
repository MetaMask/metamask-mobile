/**
 * Quality Gates Validator
 *
 * Validates performance metrics against thresholds defined in quality-gates.json.
 * Designed to be used in the reporter when generating reports.
 */

/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import path from 'path';

/**
 * Load quality gates configuration from JSON file
 * @returns {Object} Quality gates configuration
 */
function loadQualityGatesConfig() {
  // Build path relative to the appwright directory
  const configPath = path.join(
    process.cwd(),
    'appwright',
    'config',
    'quality-gates.json',
  );

  if (!fs.existsSync(configPath)) {
    console.warn('⚠️ Quality gates config not found:', configPath);
    return { defaults: {}, tests: {} };
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(configContent);
}

/**
 * @typedef {Object} StepResult
 * @property {number} index - Step index (0-based)
 * @property {string} name - Step name/description
 * @property {number} duration - Actual duration in ms
 * @property {number|null} threshold - Applied threshold in ms
 * @property {boolean} passed - Whether this step passed
 * @property {number|null} exceeded - Amount exceeded (null if passed)
 * @property {string|null} percentOver - Percentage over threshold
 */

/**
 * @typedef {Object} QualityGatesResult
 * @property {boolean} passed - Whether all thresholds passed
 * @property {boolean} hasThresholds - Whether thresholds are defined for this test
 * @property {Array<StepResult>} steps - All steps with their validation results
 * @property {Object} totalResult - Total duration validation result
 * @property {Array<Object>} violations - List of threshold violations
 * @property {Object} summary - Summary statistics
 */

class QualityGatesValidator {
  constructor() {
    this.config = loadQualityGatesConfig();
  }

  /**
   * Check if quality gates are defined for a test
   * @param {string} testName - The test title
   * @returns {boolean}
   */
  hasQualityGates(testName) {
    return testName in this.config.tests;
  }

  /**
   * Get thresholds for a specific test
   * @param {string} testName - The test title
   * @returns {Object|null}
   */
  getTestThresholds(testName) {
    return this.config.tests[testName] || null;
  }

  /**
   * Validate metrics from a test against quality gate thresholds
   * @param {string} testName - The test title
   * @param {Array<Object>} steps - Array of step objects [{stepName: duration}, ...]
   * @param {number} totalDuration - Total duration in seconds
   * @param {Object} options - Validation options
   * @returns {QualityGatesResult}
   */
  validate(testName, steps, totalDuration, options = {}) {
    const { useDefaults = true } = options;

    // Check if quality gates are defined for this test
    if (!this.hasQualityGates(testName)) {
      return {
        passed: true,
        hasThresholds: false,
        steps: [],
        totalResult: null,
        violations: [],
        summary: {
          testName,
          message: 'No quality gates defined for this test',
        },
      };
    }

    const testThresholds = this.getTestThresholds(testName);
    const defaults = this.config.defaults;
    const violations = [];
    const stepResults = [];

    // Convert total duration from seconds to ms for comparison
    const totalDurationMs = totalDuration * 1000;

    // Validate each step
    steps.forEach((stepObject, index) => {
      const [stepName, duration] = Object.entries(stepObject)[0];

      // Determine threshold for this step
      let threshold = null;
      if (testThresholds.stepThresholds?.[index] !== undefined) {
        threshold = testThresholds.stepThresholds[index];
      } else if (testThresholds.maxStepDuration !== undefined) {
        threshold = testThresholds.maxStepDuration;
      } else if (useDefaults && defaults.maxStepDuration) {
        threshold = defaults.maxStepDuration;
      }

      const passed = threshold === null || duration <= threshold;
      const exceeded = !passed ? duration - threshold : null;
      const percentOver =
        exceeded !== null ? ((exceeded / threshold) * 100).toFixed(1) : null;

      const stepResult = {
        index,
        name: stepName,
        duration,
        threshold,
        passed,
        exceeded,
        percentOver,
      };

      stepResults.push(stepResult);

      if (!passed) {
        violations.push({
          type: 'step',
          stepIndex: index,
          stepName,
          actual: duration,
          threshold,
          exceeded,
          percentOver,
          message: `Step ${index + 1} exceeded: ${duration}ms > ${threshold}ms (+${exceeded}ms / +${percentOver}%)`,
        });
      }
    });

    // Validate total duration
    let totalResult = null;
    const totalThreshold =
      testThresholds.totalThreshold ||
      (useDefaults ? defaults.maxTotalDuration : null);

    if (totalThreshold) {
      const totalPassed = totalDurationMs <= totalThreshold;
      const totalExceeded = !totalPassed
        ? totalDurationMs - totalThreshold
        : null;
      const totalPercentOver =
        totalExceeded !== null
          ? ((totalExceeded / totalThreshold) * 100).toFixed(1)
          : null;

      totalResult = {
        duration: totalDurationMs,
        threshold: totalThreshold,
        passed: totalPassed,
        exceeded: totalExceeded,
        percentOver: totalPercentOver,
      };

      if (!totalPassed) {
        violations.push({
          type: 'total',
          actual: totalDurationMs,
          threshold: totalThreshold,
          exceeded: totalExceeded,
          percentOver: totalPercentOver,
          message: `Total duration exceeded: ${totalDurationMs}ms > ${totalThreshold}ms (+${totalExceeded}ms / +${totalPercentOver}%)`,
        });
      }
    }

    const passedSteps = stepResults.filter((s) => s.passed).length;

    return {
      passed: violations.length === 0,
      hasThresholds: true,
      steps: stepResults,
      totalResult,
      violations,
      summary: {
        testName,
        totalSteps: stepResults.length,
        passedSteps,
        failedSteps: stepResults.length - passedSteps,
        totalDurationMs,
        totalThreshold,
      },
    };
  }

  /**
   * Format validation result as a console report
   * @param {QualityGatesResult} result
   * @returns {string}
   */
  formatConsoleReport(result) {
    if (!result.hasThresholds) {
      return `⚠️ No quality gates defined for: ${result.summary.testName}`;
    }

    const lines = [];
    lines.push('');
    lines.push(
      '═══════════════════════════════════════════════════════════════',
    );
    lines.push('                    QUALITY GATES VALIDATION');
    lines.push(
      '═══════════════════════════════════════════════════════════════',
    );
    lines.push(`Test: ${result.summary.testName}`);
    lines.push(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push(
      '───────────────────────────────────────────────────────────────',
    );

    for (const step of result.steps) {
      const status = step.passed ? '✅' : '❌';
      const thresholdStr = step.threshold ? `${step.threshold}ms` : 'N/A';
      lines.push(
        `${status} Step ${step.index + 1}: ${step.duration}ms [threshold: ${thresholdStr}]`,
      );
      lines.push(`   └─ ${step.name}`);
      if (!step.passed) {
        lines.push(
          `   └─ ⚠️ Exceeded by ${step.exceeded}ms (+${step.percentOver}%)`,
        );
      }
    }

    if (result.totalResult) {
      const totalStatus = result.totalResult.passed ? '✅' : '❌';
      lines.push(
        '───────────────────────────────────────────────────────────────',
      );
      lines.push(
        `${totalStatus} Total: ${result.totalResult.duration}ms [threshold: ${result.totalResult.threshold}ms]`,
      );
      if (!result.totalResult.passed) {
        lines.push(
          `   └─ ⚠️ Exceeded by ${result.totalResult.exceeded}ms (+${result.totalResult.percentOver}%)`,
        );
      }
    }

    lines.push(
      '═══════════════════════════════════════════════════════════════',
    );
    return lines.join('\n');
  }

  /**
   * Generate HTML section for quality gates result
   * @param {QualityGatesResult} result
   * @returns {string}
   */
  generateHtmlSection(result) {
    if (!result.hasThresholds) {
      return `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <strong>⚠️ Quality Gates:</strong> No thresholds defined for this test
        </div>
      `;
    }

    const statusColor = result.passed ? '#d4edda' : '#f8d7da';
    const statusBorder = result.passed ? '#28a745' : '#dc3545';
    const statusIcon = result.passed ? '✅' : '❌';
    const statusText = result.passed ? 'PASSED' : 'FAILED';

    let stepsHtml = result.steps
      .map((step) => {
        const stepStatus = step.passed ? '✅' : '❌';
        const rowStyle = step.passed ? '' : 'background-color: #ffebee;';
        const thresholdStr = step.threshold ? `${step.threshold}ms` : 'N/A';
        const exceededStr =
          step.exceeded !== null
            ? `<br><small style="color: #dc3545;">+${step.exceeded}ms (+${step.percentOver}%)</small>`
            : '';

        return `
          <tr style="${rowStyle}">
            <td>${stepStatus} Step ${step.index + 1}</td>
            <td>${step.duration}ms</td>
            <td>${thresholdStr}</td>
            <td>${step.passed ? 'Pass' : 'Fail'}${exceededStr}</td>
          </tr>
        `;
      })
      .join('');

    // Add total row if exists
    if (result.totalResult) {
      const totalStatus = result.totalResult.passed ? '✅' : '❌';
      const totalRowStyle = result.totalResult.passed
        ? 'background-color: #e8f5e8; font-weight: bold;'
        : 'background-color: #ffebee; font-weight: bold;';
      const exceededStr =
        result.totalResult.exceeded !== null
          ? `<br><small style="color: #dc3545;">+${result.totalResult.exceeded}ms (+${result.totalResult.percentOver}%)</small>`
          : '';

      stepsHtml += `
        <tr style="${totalRowStyle}">
          <td>${totalStatus} TOTAL</td>
          <td>${result.totalResult.duration}ms</td>
          <td>${result.totalResult.threshold}ms</td>
          <td>${result.totalResult.passed ? 'Pass' : 'Fail'}${exceededStr}</td>
        </tr>
      `;
    }

    return `
      <div style="margin: 20px 0;">
        <h3>🎯 Quality Gates Validation</h3>
        <div style="background-color: ${statusColor}; padding: 15px; border-radius: 8px; border-left: 4px solid ${statusBorder}; margin-bottom: 15px;">
          <strong>${statusIcon} Quality Gates: ${statusText}</strong>
          <p style="margin: 5px 0 0 0;">
            Steps: ${result.summary.passedSteps}/${result.summary.totalSteps} passed
          </p>
        </div>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <th style="border: 1px solid #e0e0e0; padding: 12px; background-color: #607d8b; color: white;">Step</th>
            <th style="border: 1px solid #e0e0e0; padding: 12px; background-color: #607d8b; color: white;">Duration</th>
            <th style="border: 1px solid #e0e0e0; padding: 12px; background-color: #607d8b; color: white;">Threshold</th>
            <th style="border: 1px solid #e0e0e0; padding: 12px; background-color: #607d8b; color: white;">Result</th>
          </tr>
          ${stepsHtml}
        </table>
        ${
          result.violations.length > 0
            ? `
          <div style="margin-top: 15px; padding: 15px; background-color: #ffebee; border-radius: 6px;">
            <strong style="color: #c62828;">Violations:</strong>
            <ul style="margin: 10px 0 0 0;">
              ${result.violations.map((v) => `<li>${v.message}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  /**
   * Generate CSV rows for quality gates result
   * @param {QualityGatesResult} result
   * @returns {Array<string>}
   */
  generateCsvRows(result) {
    const rows = [];

    if (!result.hasThresholds) {
      rows.push('QUALITY GATES,No thresholds defined');
      return rows;
    }

    rows.push('---,---,---,---');
    rows.push('QUALITY GATES VALIDATION,,,');
    rows.push(
      `Status,${result.passed ? 'PASSED' : 'FAILED'},Steps Passed,${result.summary.passedSteps}/${result.summary.totalSteps}`,
    );
    rows.push('Step,Duration (ms),Threshold (ms),Result');

    for (const step of result.steps) {
      const resultStr = step.passed
        ? 'Pass'
        : `Fail (+${step.exceeded}ms / +${step.percentOver}%)`;
      rows.push(
        `"Step ${step.index + 1}: ${step.name}",${step.duration},${step.threshold || 'N/A'},${resultStr}`,
      );
    }

    if (result.totalResult) {
      const totalResultStr = result.totalResult.passed
        ? 'Pass'
        : `Fail (+${result.totalResult.exceeded}ms / +${result.totalResult.percentOver}%)`;
      rows.push(
        `TOTAL,${result.totalResult.duration},${result.totalResult.threshold},${totalResultStr}`,
      );
    }

    return rows;
  }

  /**
   * Static method to validate timers directly from the fixture
   * Converts timers to steps format and validates
   * @param {string} testName - The test title
   * @param {Array<Object>} timers - Array of TimerHelper instances
   * @throws {Error} If any threshold is exceeded
   */
  static assertThresholds(testName, timers) {
    const validator = new QualityGatesValidator();

    if (!validator.hasQualityGates(testName)) {
      console.log(`⚠️ No quality gates defined for: ${testName}`);
      return;
    }

    // Convert timers to steps format
    const steps = timers.map((timer) => {
      const duration = timer.getDuration();
      return { [timer.id]: duration };
    });

    // Calculate total duration in seconds
    const totalDurationMs = timers.reduce((sum, timer) => {
      const duration = timer.getDuration();
      return sum + (duration || 0);
    }, 0);
    const totalDurationSec = totalDurationMs / 1000;

    const result = validator.validate(testName, steps, totalDurationSec);

    console.log(validator.formatConsoleReport(result));

    if (!result.passed) {
      const violationMessages = result.violations
        .map((v) => v.message)
        .join('\n  • ');

      throw new Error(
        `Quality Gates FAILED for "${testName}":\n  • ${violationMessages}`,
      );
    }
  }
}

/**
 * Check if quality gates are defined for a test (standalone function for imports)
 * @param {string} testName - The test title
 * @returns {boolean}
 */
export function hasQualityGates(testName) {
  const validator = new QualityGatesValidator();
  return validator.hasQualityGates(testName);
}

export default QualityGatesValidator;
