/* eslint-disable @metamask/design-tokens/color-no-hex */
/**
 * Quality Gates Report Formatter
 *
 * Transforms QualityGatesResult data into human-readable output
 * across multiple formats: console, HTML, and CSV.
 */

import type { QualityGatesResult } from './types';

class QualityGatesReportFormatter {
  /**
   * Format validation result as a console report
   */
  formatConsoleReport(result: QualityGatesResult): string {
    if (!result.hasThresholds) {
      return `⚠️ No quality gates defined for: ${result.summary.testName}`;
    }

    const lines: string[] = [];
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
   */
  generateHtmlSection(result: QualityGatesResult): string {
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
        const rowStyle = step.passed ? '' : 'background-color: #ffebee;';
        const thresholdStr = step.threshold
          ? `${step.threshold}ms<br><small style="color: #666;">(base: ${step.baseThreshold}ms)</small>`
          : 'N/A';
        const exceededStr =
          step.exceeded !== null
            ? `<br><small style="color: #dc3545;">+${step.exceeded}ms (+${step.percentOver}%)</small>`
            : '';
        const stepStatus = step.passed ? '✅' : '❌';

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
   * Generate CSV rows for quality gates result
   */
  generateCsvRows(result: QualityGatesResult): string[] {
    const rows: string[] = [];

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
}

export default QualityGatesReportFormatter;
