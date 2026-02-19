import type {
  ReportData,
  MetricsEntry,
  ProfilingSummary,
  ProfilingData,
} from '../types';
import { QualityGatesReportFormatter } from '../../framework/quality-gates';

/**
 * Generates a CSV performance report from report data.
 */
export class CsvReportGenerator {
  private qualityGatesReportFormatter: QualityGatesReportFormatter;

  constructor() {
    this.qualityGatesReportFormatter = new QualityGatesReportFormatter();
  }

  generate(reportData: ReportData): string {
    const { metrics, sessions } = reportData;
    const csvRows: string[] = [];

    for (let i = 0; i < metrics.length; i++) {
      const test = metrics[i];

      // Add scenario/test name as a header
      csvRows.push(`Test: ${test.testName}`);
      if (test.device) {
        csvRows.push(
          `Device: ${test.device.name} - OS: ${test.device.osVersion}`,
        );
      }
      if (sessions.length > 0) {
        csvRows.push('Video Recordings:');
        sessions.forEach((session, index) => {
          csvRows.push(`  ${index + 1}. ${session.testTitle}`);
          csvRows.push(`     Session ID: ${session.sessionId}`);
          if (session.videoURL) {
            csvRows.push(`     Video: ${session.videoURL}`);
          } else {
            csvRows.push(`     Video: Not available`);
          }
        });
      }
      csvRows.push(''); // Blank line for readability

      // Add column headers
      csvRows.push(
        'Step,Time (ms),CPU Avg (%),Memory Avg (MB),Battery (mAh),Issues',
      );

      // Get profiling data for this test
      const matchingSession = sessions.find(
        (session) => session.testTitle === test.testName,
      );
      const profilingSummary = matchingSession?.profilingSummary;
      const profilingData = matchingSession?.profilingData;

      // Add each step
      this.addStepRows(csvRows, test, profilingSummary);

      // Add total time
      csvRows.push('---,---,---,---,---,---');
      csvRows.push(`TOTAL TIME (s),${test.total},,,,`);

      // Add profiling summary if available
      if (
        this.isValidProfilingData(profilingData, profilingSummary) &&
        profilingSummary
      ) {
        this.addProfilingSummaryRows(csvRows, profilingSummary);
      }

      // Add failure information
      if (test.testFailed) {
        csvRows.push('---,---,---,---,---,---');
        csvRows.push(`TEST STATUS,FAILED,,,,`);
        if (test.failureReason) {
          csvRows.push(`FAILURE REASON,"${test.failureReason}",,,,`);
        }
        if (test.note) {
          csvRows.push(`NOTE,"${test.note}",,,,`);
        }
      }

      // Add quality gates information
      if (test.qualityGates) {
        const qgRows = this.qualityGatesReportFormatter.generateCsvRows(
          test.qualityGates as unknown as Parameters<
            QualityGatesReportFormatter['generateCsvRows']
          >[0],
        );
        csvRows.push(...qgRows);
      }

      // Add spacing between tables
      if (i < metrics.length - 1) {
        csvRows.push('');
        csvRows.push('');
        csvRows.push('');
      }
    }

    // Add generation timestamp at the end
    csvRows.push('');
    csvRows.push('');
    csvRows.push(`Generated: ${new Date().toLocaleString()}`);

    return csvRows.join('\n');
  }

  private addStepRows(
    csvRows: string[],
    test: MetricsEntry,
    profilingSummary: ProfilingSummary | null | undefined,
  ): void {
    if (test.steps && Array.isArray(test.steps)) {
      test.steps.forEach((stepObject) => {
        // Handle new format with named properties
        if (stepObject.name !== undefined) {
          const { name, duration } = stepObject;
          const cpuAvg = this.getNestedProperty(
            profilingSummary,
            'cpu.avg',
            'N/A',
          );
          const memoryAvg = this.getNestedProperty(
            profilingSummary,
            'memory.avg',
            'N/A',
          );
          const battery = this.getNestedProperty(
            profilingSummary,
            'battery.total',
            'N/A',
          );
          const issues = this.getNestedProperty(
            profilingSummary,
            'issues',
            'N/A',
          );
          csvRows.push(
            `"${name}","${duration}","${cpuAvg}","${memoryAvg}","${battery}","${issues}"`,
          );
          return;
        }
        // Handle old format {stepName: duration}
        const [stepName, duration] = Object.entries(stepObject)[0];
        const cpuAvg = this.getNestedProperty(
          profilingSummary,
          'cpu.avg',
          'N/A',
        );
        const memoryAvg = this.getNestedProperty(
          profilingSummary,
          'memory.avg',
          'N/A',
        );
        const battery = this.getNestedProperty(
          profilingSummary,
          'battery.total',
          'N/A',
        );
        const issues = this.getNestedProperty(
          profilingSummary,
          'issues',
          'N/A',
        );
        csvRows.push(
          `"${stepName}","${duration}","${cpuAvg}","${memoryAvg}","${battery}","${issues}"`,
        );
      });
    } else if (test.steps && typeof test.steps === 'object') {
      // Backward compatibility for old object structure
      Object.entries(test.steps).forEach(([stepName, duration]) => {
        const cpuAvg = this.getNestedProperty(
          profilingSummary,
          'cpu.avg',
          'N/A',
        );
        const memoryAvg = this.getNestedProperty(
          profilingSummary,
          'memory.avg',
          'N/A',
        );
        const battery = this.getNestedProperty(
          profilingSummary,
          'battery.total',
          'N/A',
        );
        const issues = this.getNestedProperty(
          profilingSummary,
          'issues',
          'N/A',
        );
        csvRows.push(
          `"${stepName}","${duration}","${cpuAvg}","${memoryAvg}","${battery}","${issues}"`,
        );
      });
    } else {
      // Fallback to old format (excluding specific keys)
      Object.entries(test).forEach(([key, value]) => {
        if (
          key !== 'testName' &&
          key !== 'device' &&
          key !== 'videoURL' &&
          key !== 'sessionId' &&
          key !== 'testFailed' &&
          key !== 'failureReason' &&
          key !== 'note' &&
          key !== 'total'
        ) {
          const cpuAvg = (profilingSummary as Record<string, unknown>)?.cpu
            ? ((profilingSummary as Record<string, Record<string, unknown>>).cpu
                .avg ?? 'N/A')
            : 'N/A';
          const memoryAvg = (profilingSummary as Record<string, unknown>)
            ?.memory
            ? ((profilingSummary as Record<string, Record<string, unknown>>)
                .memory.avg ?? 'N/A')
            : 'N/A';
          const battery = (profilingSummary as Record<string, unknown>)?.battery
            ? ((profilingSummary as Record<string, Record<string, unknown>>)
                .battery.total ?? 'N/A')
            : 'N/A';
          const issues =
            (profilingSummary as Record<string, unknown>)?.issues ?? 'N/A';
          csvRows.push(
            `"${key}","${value}","${cpuAvg}","${memoryAvg}","${battery}","${issues}"`,
          );
        }
      });
    }
  }

  private addProfilingSummaryRows(
    csvRows: string[],
    profilingSummary: ProfilingSummary,
  ): void {
    csvRows.push('---,---,---,---,---,---');
    csvRows.push('PROFILING SUMMARY,,,,,');
    csvRows.push(
      `CPU Avg,${this.getNestedProperty(profilingSummary, 'cpu.avg', 'N/A')}%,,,,`,
    );
    csvRows.push(
      `CPU Max,${this.getNestedProperty(profilingSummary, 'cpu.max', 'N/A')}%,,,,`,
    );
    csvRows.push(
      `Memory Avg,${this.getNestedProperty(profilingSummary, 'memory.avg', 'N/A')} MB,,,,`,
    );
    csvRows.push(
      `Memory Max,${this.getNestedProperty(profilingSummary, 'memory.max', 'N/A')} MB,,,,`,
    );
    csvRows.push(
      `Battery Usage,${this.getNestedProperty(profilingSummary, 'battery.total', 'N/A')} mAh,,,,`,
    );
    csvRows.push(
      `Battery %,${(Number(this.getNestedProperty(profilingSummary, 'battery.percentage', 0)) * 100).toFixed(1)}%,,,,`,
    );
    csvRows.push(
      `Slow Frames,${this.getNestedProperty(profilingSummary, 'uiRendering.slowFrames', 'N/A')}%,,,,`,
    );
    csvRows.push(
      `ANRs,${this.getNestedProperty(profilingSummary, 'uiRendering.anrs', 'N/A')},,,,`,
    );
    csvRows.push(
      `Disk Reads,${this.getNestedProperty(profilingSummary, 'diskIO.reads', 'N/A')} KB,,,,`,
    );
    csvRows.push(
      `Disk Writes,${this.getNestedProperty(profilingSummary, 'diskIO.writes', 'N/A')} KB,,,,`,
    );
    csvRows.push(
      `Network Upload,${this.getNestedProperty(profilingSummary, 'networkIO.upload', 'N/A')} KB,,,,`,
    );
    csvRows.push(
      `Network Download,${this.getNestedProperty(profilingSummary, 'networkIO.download', 'N/A')} KB,,,,`,
    );
    csvRows.push(
      `Performance Issues,${this.getNestedProperty(profilingSummary, 'issues', 'N/A')},,,,`,
    );
    csvRows.push(
      `Critical Issues,${this.getNestedProperty(profilingSummary, 'criticalIssues', 'N/A')},,,,`,
    );
  }

  private isValidProfilingData(
    profilingData: ProfilingData | null | undefined,
    profilingSummary: ProfilingSummary | null | undefined,
  ): boolean {
    return !!(
      profilingData &&
      !profilingData.error &&
      profilingSummary &&
      !profilingSummary.error &&
      typeof profilingSummary === 'object'
    );
  }

  private getNestedProperty(
    obj: unknown,
    path: string,
    defaultValue: string | number = 'N/A',
  ): string | number {
    if (!obj || typeof obj !== 'object') return defaultValue;

    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (
        current === null ||
        current === undefined ||
        typeof current !== 'object'
      ) {
        return defaultValue;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current !== undefined && current !== null
      ? (current as string | number)
      : defaultValue;
  }
}
