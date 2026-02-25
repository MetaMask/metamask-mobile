/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import path from 'path';
import { createLogger } from '../../framework/logger';
import type { ReportData, MetricsEntry, FailedTestsByTeam } from '../types';

const logger = createLogger({ name: 'JsonReportGenerator' });

/**
 * Generates JSON device reports and failed-tests-by-team report.
 */
export class JsonReportGenerator {
  /**
   * Generate device-specific JSON files and failed-tests-by-team.json.
   * Returns an array of file paths that were written.
   */
  generate(reportData: ReportData, reportsDir: string): string[] {
    const writtenFiles: string[] = [];

    // Generate device-specific JSON files
    const deviceFiles = this.generateDeviceReports(
      reportData.metrics,
      reportsDir,
    );
    writtenFiles.push(...deviceFiles);

    // Generate failed-tests-by-team report
    const failedTestsFile = this.generateFailedTestsByTeamReport(
      reportData.failedTestsByTeam,
      reportsDir,
    );
    if (failedTestsFile) {
      writtenFiles.push(failedTestsFile);
    }

    return writtenFiles;
  }

  private generateDeviceReports(
    metrics: MetricsEntry[],
    reportsDir: string,
  ): string[] {
    const writtenFiles: string[] = [];
    const testName = (metrics[0]?.testName ?? 'Unknown')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);

    // Group metrics by device
    const metricsByDevice: Record<
      string,
      { device: MetricsEntry['device']; metrics: MetricsEntry[] }
    > = {};

    metrics.forEach((metric) => {
      const deviceKey = `${metric.device.name}-${metric.device.osVersion}`;
      if (!metricsByDevice[deviceKey]) {
        metricsByDevice[deviceKey] = {
          device: metric.device,
          metrics: [],
        };
      }
      metricsByDevice[deviceKey].metrics.push(metric);
    });

    // Create separate JSON files for each device
    Object.entries(metricsByDevice).forEach(([, deviceData]) => {
      const safeDeviceName = deviceData.device.name.replace(
        /[^a-zA-Z0-9]/g,
        '_',
      );
      const jsonPath = path.join(
        reportsDir,
        `performance-metrics-${testName}-${safeDeviceName}-${deviceData.device.osVersion}.json`,
      );
      fs.writeFileSync(jsonPath, JSON.stringify(deviceData.metrics, null, 2));
      logger.info(`Device-specific report saved: ${jsonPath}`);
      writtenFiles.push(jsonPath);
    });

    return writtenFiles;
  }

  private generateFailedTestsByTeamReport(
    failedTestsByTeam: FailedTestsByTeam,
    reportsDir: string,
  ): string | null {
    if (Object.keys(failedTestsByTeam).length === 0) {
      logger.info('No failed tests to report by team');
      return null;
    }

    // Normalize failureReason: if test has failed quality gates, use quality_gates_exceeded
    for (const teamData of Object.values(failedTestsByTeam)) {
      for (const test of teamData.tests) {
        if (
          test.qualityGates &&
          test.qualityGates.hasThresholds &&
          !test.qualityGates.passed
        ) {
          test.failureReason = 'quality_gates_exceeded';
        }
      }
    }

    const failedTestsReport = {
      timestamp: new Date().toISOString(),
      totalFailedTests: Object.values(failedTestsByTeam).reduce(
        (acc, team) => acc + team.tests.length,
        0,
      ),
      teamsAffected: Object.keys(failedTestsByTeam).length,
      failedTestsByTeam,
    };

    const failedTestsPath = path.join(reportsDir, 'failed-tests-by-team.json');
    fs.writeFileSync(
      failedTestsPath,
      JSON.stringify(failedTestsReport, null, 2),
    );
    logger.info(`Failed tests by team report saved: ${failedTestsPath}`);
    logger.info(`   Total failed tests: ${failedTestsReport.totalFailedTests}`);
    logger.info(`   Teams affected: ${failedTestsReport.teamsAffected}`);

    // Log which teams have failed tests
    for (const [, teamData] of Object.entries(failedTestsByTeam)) {
      logger.info(
        `   - ${teamData.team.teamName}: ${teamData.tests.length} failed test(s)`,
      );
    }

    return failedTestsPath;
  }
}
