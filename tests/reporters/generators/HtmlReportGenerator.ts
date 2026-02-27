/* eslint-disable @metamask/design-tokens/color-no-hex */
import type {
  ReportData,
  MetricsEntry,
  SessionData,
  ProfilingIssue,
} from '../types';
import { QualityGatesReportFormatter } from '../../framework/quality-gates';
import { getNestedProperty } from '../utils/getNestedProperty';

/**
 * Generates an HTML performance report from report data.
 */
export class HtmlReportGenerator {
  private qualityGatesReportFormatter: QualityGatesReportFormatter;

  constructor() {
    this.qualityGatesReportFormatter = new QualityGatesReportFormatter();
  }

  generate(reportData: ReportData): string {
    const { metrics, sessions, summary } = reportData;
    const testName = metrics[0]?.testName ?? 'Unknown';
    const deviceInfo = metrics[0]?.device;

    /* eslint-disable */
    return `<!DOCTYPE html>
<html>
<head>
  <title>Performance Metrics: ${testName} - ${deviceInfo?.name ?? 'Unknown'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e0e0e0; padding: 12px; text-align: left; }
    th { background-color: #2e7d32; color: white; }
    tr:nth-child(even) { background-color: #f5f5f5; }
    .total { font-weight: bold; background-color: #e8f5e8; }
  </style>
</head>
<body>
  <h1>Performance Report - ${deviceInfo?.name ?? 'Unknown'} - OS version: ${deviceInfo?.osVersion ?? 'Unknown'}</h1>
  ${this.generateSummarySection(summary)}
  ${this.generateTestSections(metrics)}
  <p><small>Generated: ${new Date().toLocaleString()}</small></p>
  ${this.generateVideoSection(sessions)}
  ${this.generateProfilingSection(sessions)}
</body>
</html>`;
    /* eslint-enable */
  }

  private generateSummarySection(summary: ReportData['summary']): string {
    const failureNote =
      summary.failedTests > 0
        ? 'Failed tests are included in this report with available performance data collected until failure.'
        : 'All tests completed successfully with full performance metrics.';

    return `<div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h3>📊 Test Suite Summary</h3>
      <p><strong>Total Tests:</strong> ${summary.totalTests}</p>
      <p><strong>Passed:</strong> ${summary.passedTests} | <strong>Failed:</strong> ${summary.failedTests}</p>
      <p><strong>With Performance Data:</strong> ${summary.testsWithSteps} | <strong>Fallback Data:</strong> ${summary.testsWithFallbackData}</p>
      <p style="font-style: italic; color: #555;">${failureNote}</p>
    </div>`;
  }

  private generateTestSections(metrics: MetricsEntry[]): string {
    return metrics
      .map(
        (test) => `
      <h2>${test.testName}</h2>
      <table>
        <tr>
          <th>Steps</th>
          <th>Duration</th>
          <th>Threshold</th>
          <th>Status</th>
        </tr>
        ${this.generateStepRows(test)}
        <tr class="total">
          <td>TOTAL TIME</td>
          <td>${test.total} s</td>
          <td>${test.totalThreshold ? `${(test.totalThreshold / 1000).toFixed(2)} s` : '—'}</td>
          <td>${test.totalThreshold ? (test.total * 1000 <= test.totalThreshold ? '✅' : '❌') : '—'}</td>
        </tr>
        ${this.generateFailureRows(test)}
      </table>
      ${test.qualityGates ? this.qualityGatesReportFormatter.generateHtmlSection(test.qualityGates as unknown as Parameters<QualityGatesReportFormatter['generateHtmlSection']>[0]) : ''}`,
      )
      .join('');
  }

  private generateStepRows(test: MetricsEntry): string {
    if (test.steps && Array.isArray(test.steps)) {
      return test.steps
        .map((stepObject) => {
          // Handle new format with threshold info
          if (stepObject.name !== undefined) {
            const { name, duration, threshold, baseThreshold } = stepObject;
            const hasThreshold = threshold !== null && threshold !== undefined;
            const passed = !hasThreshold || duration <= (threshold ?? 0);
            const statusIcon = hasThreshold ? (passed ? '✅' : '❌') : '—';
            const rowStyle =
              hasThreshold && !passed ? 'background-color: #ffebee;' : '';
            const thresholdStr = hasThreshold
              ? `${threshold}ms<br><small style="color: #666;">(base: ${baseThreshold}ms)</small>`
              : '—';
            return `<tr style="${rowStyle}">
              <td>${name}</td>
              <td>${duration} ms</td>
              <td>${thresholdStr}</td>
              <td>${statusIcon}</td>
            </tr>`;
          }
          // Handle old format {stepName: duration}
          const [stepName, duration] = Object.entries(stepObject)[0];
          return `<tr>
            <td>${stepName}</td>
            <td>${duration} ms</td>
            <td>—</td>
            <td>—</td>
          </tr>`;
        })
        .join('');
    }

    if (test.steps && typeof test.steps === 'object') {
      // Backward compatibility for old object structure
      return Object.entries(test.steps)
        .map(
          ([stepName, duration]) => `<tr>
          <td>${stepName}</td>
          <td>${duration} ms</td>
          <td>—</td>
          <td>—</td>
        </tr>`,
        )
        .join('');
    }

    // Fallback to old structure
    return Object.entries(test)
      .filter(
        ([key]) =>
          key !== 'testName' &&
          key !== 'device' &&
          key !== 'videoURL' &&
          key !== 'sessionId' &&
          key !== 'testFailed' &&
          key !== 'failureReason' &&
          key !== 'note' &&
          key !== 'total',
      )
      .map(
        ([key, value]) => `<tr>
        <td>${key}</td>
        <td>${value} ms</td>
        <td>—</td>
        <td>—</td>
      </tr>`,
      )
      .join('');
  }

  private generateFailureRows(test: MetricsEntry): string {
    if (!test.testFailed) return '';

    let rows = `<tr style="background-color: #ffebee; color: #c62828;">
      <td><strong>TEST STATUS</strong></td>
      <td><strong>FAILED</strong></td>
    </tr>`;

    if (test.failureReason) {
      rows += `<tr style="background-color: #ffebee;">
        <td>Failure Reason</td>
        <td>${test.failureReason}</td>
      </tr>`;
    }

    if (test.note) {
      rows += `<tr style="background-color: #ffebee;">
        <td>Note</td>
        <td>${test.note}</td>
      </tr>`;
    }

    return rows;
  }

  private generateVideoSection(sessions: SessionData[]): string {
    if (sessions.length === 0) {
      return '<p>No video recordings available</p>';
    }

    return `<div>
      <h3>📹 Video Recordings</h3>
      ${sessions
        .map(
          (session) =>
            `<p><strong>${session.testTitle}:</strong> ${
              session.videoURL
                ? `<a href="${session.videoURL}" target="_blank">View Recording</a> (${session.sessionId})`
                : `No video available (${session.sessionId})`
            }</p>`,
        )
        .join('')}
    </div>`;
  }

  private generateProfilingSection(sessions: SessionData[]): string {
    const hasValidProfilingData =
      sessions.length > 0 &&
      sessions.some((s) => s.profilingData && !s.profilingData.error);
    const hasProfilingErrors =
      sessions.length > 0 && sessions.some((s) => s.profilingData?.error);

    if (hasValidProfilingData) {
      return `<div style="margin-top: 30px;">
        <h3>📊 App Profiling Analysis</h3>
        ${sessions
          .filter(
            (session) => session.profilingData && !session.profilingData.error,
          )
          .map((session) => this.generateProfilingCard(session))
          .join('')}
      </div>`;
    }

    if (hasProfilingErrors) {
      return `<div style="margin-top: 30px;">
        <h3>📊 App Profiling Analysis</h3>
        <div style="padding: 15px; background-color: #f8d7da; border-radius: 6px; border-left: 4px solid #dc3545;">
          <strong style="color: #721c24;">⚠️ Profiling Data Unavailable</strong>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #721c24;">Some sessions encountered errors while fetching profiling data.</p>
        </div>
      </div>`;
    }

    return '';
  }

  private generateProfilingCard(session: SessionData): string {
    const summary = session.profilingSummary;

    return `<div style="border: 1px solid #ddd; margin: 15px 0; padding: 20px; border-radius: 8px; background-color: #f9f9f9;">
      <h4 style="margin-top: 0; color: #2e7d32;">${session.testTitle}</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px;">
        <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #2196f3;">
          <strong style="color: #2196f3;">CPU Usage</strong><br>
          <span style="font-size: 14px;">Avg: ${getNestedProperty(summary, 'cpu.avg', 'N/A')}% | Max: ${getNestedProperty(summary, 'cpu.max', 'N/A')}%</span>
        </div>
        <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #4caf50;">
          <strong style="color: #4caf50;">Memory</strong><br>
          <span style="font-size: 14px;">Avg: ${getNestedProperty(summary, 'memory.avg', 'N/A')} MB | Max: ${getNestedProperty(summary, 'memory.max', 'N/A')} MB</span>
        </div>
        <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #ff9800;">
          <strong style="color: #ff9800;">Battery</strong><br>
          <span style="font-size: 14px;">${getNestedProperty(summary, 'battery.total', 'N/A')} mAh (${(Number(getNestedProperty(summary, 'battery.percentage', 0)) * 100).toFixed(1)}%)</span>
        </div>
        <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #9c27b0;">
          <strong style="color: #9c27b0;">UI Performance</strong><br>
          <span style="font-size: 14px;">Slow Frames: ${getNestedProperty(summary, 'uiRendering.slowFrames', 'N/A')}% | ANRs: ${getNestedProperty(summary, 'uiRendering.anrs', 'N/A')}</span>
        </div>
        <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #607d8b;">
          <strong style="color: #607d8b;">Disk I/O</strong><br>
          <span style="font-size: 14px;">Reads: ${getNestedProperty(summary, 'diskIO.reads', 'N/A')} KB | Writes: ${getNestedProperty(summary, 'diskIO.writes', 'N/A')} KB</span>
        </div>
        <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #795548;">
          <strong style="color: #795548;">Network I/O</strong><br>
          <span style="font-size: 14px;">Upload: ${getNestedProperty(summary, 'networkIO.upload', 'N/A')} KB | Download: ${getNestedProperty(summary, 'networkIO.download', 'N/A')} KB</span>
        </div>
      </div>
      ${this.generateProfilingIssues(session)}
    </div>`;
  }

  private generateProfilingIssues(session: SessionData): string {
    const issueCount = getNestedProperty(session.profilingSummary, 'issues', 0);

    if (Number(issueCount) > 0) {
      const detectedIssues: ProfilingIssue[] =
        (session.profilingData?.data?.['io.metamask']
          ?.detected_issues as ProfilingIssue[]) ?? [];

      const issueItems = Array.isArray(detectedIssues)
        ? detectedIssues
            .map(
              (issue) => `<li style="margin-bottom: 10px;">
              <strong style="color: #856404;">${getNestedProperty(issue, 'title', 'Unknown Issue')}</strong><br>
              <span style="font-size: 14px; color: #6c757d;">${getNestedProperty(issue, 'subtitle', 'No description available')}</span><br>
              <span style="font-size: 13px; color: #dc3545;">Current: ${getNestedProperty(issue, 'current', 'N/A')} ${getNestedProperty(issue, 'unit', '')} | Recommended: ${getNestedProperty(issue, 'recommended', 'N/A')} ${getNestedProperty(issue, 'unit', '')}</span>
              ${getNestedProperty(issue, 'link') ? `<br><a href="${getNestedProperty(issue, 'link')}" target="_blank" style="font-size: 12px; color: #007bff;">Learn more</a>` : ''}
            </li>`,
            )
            .join('')
        : '';

      return `<div style="margin-top: 15px; padding: 15px; background-color: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
        <strong style="color: #856404;">⚠️ Performance Issues Detected (${issueCount})</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${issueItems}
        </ul>
      </div>`;
    }

    return `<div style="margin-top: 15px; padding: 15px; background-color: #d4edda; border-radius: 6px; border-left: 4px solid #28a745;">
      <strong style="color: #155724;">✅ No Performance Issues Detected</strong>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #155724;">All metrics are within recommended thresholds.</p>
    </div>`;
  }
}
