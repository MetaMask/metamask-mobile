/**
 * Quality Gates Validator
 *
 * Validates performance metrics against thresholds defined in TimerHelper instances.
 * Each timer can have its own threshold (base + 10% margin).
 */

import QualityGateError from './QualityGateError';
import QualityGatesReportFormatter from './QualityGatesReportFormatter';
import type {
  TimerLike,
  StepResult,
  TotalResult,
  Violation,
  MetricStep,
  QualityGatesResult,
} from './types';

class QualityGatesValidator {
  /**
   * Check if any timer has quality gates defined
   */
  hasQualityGates(timers: TimerLike[]): boolean {
    return timers.some((timer) => timer.hasThreshold());
  }

  /**
   * Validate timers against their defined thresholds
   */
  validateTimers(testName: string, timers: TimerLike[]): QualityGatesResult {
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

    const violations: Violation[] = [];
    const stepResults: StepResult[] = [];
    let totalDurationMs = 0;
    let totalThresholdMs = 0;
    let allTimersHaveThresholds = true;

    timers.forEach((timer, index) => {
      const duration = timer.getDuration() || 0;
      const { threshold, baseThreshold } = timer;

      totalDurationMs += duration;
      if (threshold !== null) {
        totalThresholdMs += threshold;
      } else {
        allTimersHaveThresholds = false;
      }

      const passed = threshold === null || duration <= threshold;
      const exceeded =
        !passed && threshold !== null ? duration - threshold : null;
      const percentOver =
        exceeded !== null && threshold !== null
          ? ((exceeded / threshold) * 100).toFixed(1)
          : null;

      const stepResult: StepResult = {
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

      if (
        !passed &&
        exceeded !== null &&
        percentOver !== null &&
        threshold !== null
      ) {
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

    let totalResult: TotalResult | null = null;
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

      if (!totalPassed && totalExceeded !== null && totalPercentOver !== null) {
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
   * Validate metrics from the reporter (steps already include thresholds)
   * @param testName - The test title
   * @param steps - Array of step objects with name, duration, threshold, baseThreshold
   * @param totalDuration - Total duration in seconds
   * @param totalThreshold - Total threshold in ms (sum of all thresholds)
   */
  validateMetrics(
    testName: string,
    steps: MetricStep[],
    totalDuration: number,
    totalThreshold: number | null,
  ): QualityGatesResult {
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

    const violations: Violation[] = [];
    const stepResults: StepResult[] = [];
    const totalDurationMs = totalDuration * 1000;

    steps.forEach((step, index) => {
      const { name, duration, threshold, baseThreshold } = step;

      const passed = threshold === null || duration <= threshold;
      const exceeded =
        !passed && threshold !== null ? duration - threshold : null;
      const percentOver =
        exceeded !== null && threshold !== null
          ? ((exceeded / threshold) * 100).toFixed(1)
          : null;

      const stepResult: StepResult = {
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

      if (
        !passed &&
        exceeded !== null &&
        percentOver !== null &&
        threshold !== null
      ) {
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

    let totalResult: TotalResult | null = null;
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

      if (!totalPassed && totalExceeded !== null && totalPercentOver !== null) {
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
   * Static method to validate timers directly from the fixture.
   * Uses thresholds defined in each timer.
   * @throws {QualityGateError} If any threshold is exceeded
   */
  static assertThresholds(testName: string, timers: TimerLike[]): void {
    const validator = new QualityGatesValidator();
    const formatter = new QualityGatesReportFormatter();

    if (!validator.hasQualityGates(timers)) {
      console.log(`⚠️ No thresholds defined for any timer in: ${testName}`);
      return;
    }

    const result = validator.validateTimers(testName, timers);

    console.log(formatter.formatConsoleReport(result));

    if (!result.passed) {
      const violationMessages = result.violations
        .map((v) => v.message)
        .join('\n  • ');

      throw new QualityGateError(
        `Quality Gates FAILED for "${testName}":\n  • ${violationMessages}`,
      );
    }
  }
}

/**
 * Check if any timer has quality gates defined (standalone function for imports)
 */
export function hasQualityGates(timers: TimerLike[]): boolean {
  const validator = new QualityGatesValidator();
  return validator.hasQualityGates(timers);
}

export default QualityGatesValidator;
