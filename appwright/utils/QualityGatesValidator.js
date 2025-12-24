/**
 * Quality Gates Validator
 *
 * Validates performance metrics against thresholds defined in TimerHelper instances.
 * Each timer can have its own threshold (base + 10% margin).
 * Designed to be used in the reporter when generating reports.
 */

/**
 * @typedef {Object} StepResult
 * @property {number} index - Step index (0-based)
 * @property {string} name - Step name/description
 * @property {number} duration - Actual duration in ms
 * @property {number|null} threshold - Applied threshold in ms (with 10% margin)
 * @property {number|null} baseThreshold - Original threshold without margin
 * @property {boolean} passed - Whether this step passed
 * @property {number|null} exceeded - Amount exceeded (null if passed)
 * @property {string|null} percentOver - Percentage over threshold
 */

/**
 * @typedef {Object} QualityGatesResult
 * @property {boolean} passed - Whether all thresholds passed
 * @property {boolean} hasThresholds - Whether any timer has thresholds defined
 * @property {Array<StepResult>} steps - All steps with their validation results
 * @property {Object} totalResult - Total duration validation result
 * @property {Array<Object>} violations - List of threshold violations
 * @property {Object} summary - Summary statistics
 */

class QualityGatesValidator {
  /**
   * Check if any timer has quality gates defined
   * @param {Array<Object>} timers - Array of TimerHelper instances
   * @returns {boolean}
   */
  hasQualityGates(timers) {
    return timers.some((timer) => timer.hasThreshold());
  }

  /**
   * Validate timers against their defined thresholds
   * @param {string} testName - The test title
   * @param {Array<Object>} timers - Array of TimerHelper instances
   * @returns {QualityGatesResult}
   */
  validateTimers(testName, timers) {
    const hasThresholds = this.hasQualityGates(timers);

    if (!hasThresholds) {
      return {
        passed: true,
        hasThresholds: false,
        steps: [],
        totalResult: null,
        violations: [],
        summary: {
          testName,
          message: 'No thresholds defined for any timer in this test',
        },
      };
    }

    const violations = [];
    const stepResults = [];
    let totalDurationMs = 0;
    let totalThresholdMs = 0;
    let allTimersHaveThresholds = true;

    // Validate each timer
    timers.forEach((timer, index) => {
      const duration = timer.getDuration() || 0;
      const threshold = timer.threshold;
      const baseThreshold = timer.baseThreshold;

      totalDurationMs += duration;
      if (threshold !== null) {
        totalThresholdMs += threshold;
      } else {
        allTimersHaveThresholds = false;
      }

      const passed = threshold === null || duration <= threshold;
      const exceeded = !passed ? duration - threshold : null;
      const percentOver =
        exceeded !== null ? ((exceeded / threshold) * 100).toFixed(1) : null;

      const stepResult = {
        index,
        name: timer.id,
        duration,
        threshold,
        baseThreshold,
        passed,
        exceeded,
        percentOver,
      };

      stepResults.push(stepResult);

      if (!passed) {
        violations.push({
          type: 'step',
          stepIndex: index,
          stepName: timer.id,
          actual: duration,
          threshold,
          baseThreshold,
          exceeded,
          percentOver,
          message: `Step ${index + 1} exceeded: ${duration}ms > ${threshold}ms (+${exceeded}ms / +${percentOver}%)`,
        });
      }
    });

    // Calculate total threshold only if all timers have thresholds
    let totalResult = null;
    if (allTimersHaveThresholds && totalThresholdMs > 0) {
      const totalPassed = totalDurationMs <= totalThresholdMs;
      const totalExceeded = !totalPassed
        ? totalDurationMs - totalThresholdMs
        : null;
      const totalPercentOver =
        totalExceeded !== null
          ? ((totalExceeded / totalThresholdMs) * 100).toFixed(1)
          : null;

      totalResult = {
        duration: totalDurationMs,
        threshold: totalThresholdMs,
        passed: totalPassed,
        exceeded: totalExceeded,
        percentOver: totalPercentOver,
      };

      if (!totalPassed) {
        violations.push({
          type: 'total',
          actual: totalDurationMs,
          threshold: totalThresholdMs,
          exceeded: totalExceeded,
          percentOver: totalPercentOver,
          message: `Total duration exceeded: ${totalDurationMs}ms > ${totalThresholdMs}ms (+${totalExceeded}ms / +${totalPercentOver}%)`,
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
        totalThreshold: allTimersHaveThresholds ? totalThresholdMs : null,
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
      const thresholdStr = step.threshold
        ? `${step.threshold}ms (base: ${step.baseThreshold}ms +10%)`
        : 'N/A';
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
        const thresholdStr = step.threshold
          ? `${step.threshold}ms<br><small style="color: #666;">(base: ${step.baseThreshold}ms)</small>`
          : 'N/A';
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
          <p style="margin: 5px 0 0 0; font-size: 0.85em; color: #666;">
            Thresholds include +10% margin
          </p>
        </div>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <th style="border: 1px solid #e0e0e0; padding: 12px; background-color: #607d8b; color: white;">Step</th>
            <th style="border: 1px solid #e0e0e0; padding: 12px; background-color: #607d8b; color: white;">Duration</th>
            <th style="border: 1px solid #e0e0e0; padding: 12px; background-color: #607d8b; color: white;">Threshold (+10%)</th>
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
   * Validate metrics from the reporter (steps already include thresholds)
   * @param {string} testName - The test title
   * @param {Array<Object>} steps - Array of step objects with name, duration, threshold, baseThreshold
   * @param {number} totalDuration - Total duration in seconds
   * @param {number|null} totalThreshold - Total threshold in ms (sum of all thresholds)
   * @returns {QualityGatesResult}
   */
  validateMetrics(testName, steps, totalDuration, totalThreshold) {
    const hasThresholds = steps.some((step) => step.threshold !== null);

    if (!hasThresholds) {
      return {
        passed: true,
        hasThresholds: false,
        steps: [],
        totalResult: null,
        violations: [],
        summary: {
          testName,
          message: 'No thresholds defined for any step in this test',
        },
      };
    }

    const violations = [];
    const stepResults = [];
    const totalDurationMs = totalDuration * 1000;

    // Validate each step
    steps.forEach((step, index) => {
      const { name, duration, threshold, baseThreshold } = step;

      const passed = threshold === null || duration <= threshold;
      const exceeded = !passed ? duration - threshold : null;
      const percentOver =
        exceeded !== null ? ((exceeded / threshold) * 100).toFixed(1) : null;

      const stepResult = {
        index,
        name,
        duration,
        threshold,
        baseThreshold,
        passed,
        exceeded,
        percentOver,
      };

      stepResults.push(stepResult);

      if (!passed) {
        violations.push({
          type: 'step',
          stepIndex: index,
          stepName: name,
          actual: duration,
          threshold,
          baseThreshold,
          exceeded,
          percentOver,
          message: `Step ${index + 1} exceeded: ${duration}ms > ${threshold}ms (+${exceeded}ms / +${percentOver}%)`,
        });
      }
    });

    // Validate total duration
    let totalResult = null;
    if (totalThreshold !== null) {
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

    rows.push('---,---,---,---,---');
    rows.push('QUALITY GATES VALIDATION,,,,');
    rows.push(
      `Status,${result.passed ? 'PASSED' : 'FAILED'},Steps Passed,${result.summary.passedSteps}/${result.summary.totalSteps},`,
    );
    rows.push(
      'Step,Duration (ms),Base Threshold (ms),Effective Threshold (+10%),Result',
    );

    for (const step of result.steps) {
      const resultStr = step.passed
        ? 'Pass'
        : `Fail (+${step.exceeded}ms / +${step.percentOver}%)`;
      rows.push(
        `"Step ${step.index + 1}: ${step.name}",${step.duration},${step.baseThreshold || 'N/A'},${step.threshold || 'N/A'},${resultStr}`,
      );
    }

    if (result.totalResult) {
      const totalResultStr = result.totalResult.passed
        ? 'Pass'
        : `Fail (+${result.totalResult.exceeded}ms / +${result.totalResult.percentOver}%)`;
      rows.push(
        `TOTAL,${result.totalResult.duration},-,${result.totalResult.threshold},${totalResultStr}`,
      );
    }

    return rows;
  }

  /**
   * Static method to validate timers directly from the fixture
   * Uses thresholds defined in each timer
   * @param {string} testName - The test title
   * @param {Array<Object>} timers - Array of TimerHelper instances
   * @throws {Error} If any threshold is exceeded
   */
  static assertThresholds(testName, timers) {
    const validator = new QualityGatesValidator();

    if (!validator.hasQualityGates(timers)) {
      console.log(`⚠️ No thresholds defined for any timer in: ${testName}`);
      return;
    }

    const result = validator.validateTimers(testName, timers);

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
 * Check if any timer has quality gates defined (standalone function for imports)
 * @param {Array<Object>} timers - Array of TimerHelper instances
 * @returns {boolean}
 */
export function hasQualityGates(timers) {
  const validator = new QualityGatesValidator();
  return validator.hasQualityGates(timers);
}

export default QualityGatesValidator;
