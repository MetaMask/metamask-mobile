/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';
import { createLogger } from '../../framework/logger';
import type {
  ReportData,
  MetricsEntry,
  FailedTestsByTeam,
  AppProfilingArtifact,
} from '../types';

const logger = createLogger({ name: 'JsonReportGenerator' });

/**
 * Generates JSON device reports, per-scenario app profiling artifacts,
 * and failed-tests-by-team report.
 */
export class JsonReportGenerator {
  /**
   * Generate device-specific JSON files, per-scenario app profiling files,
   * and failed-tests-by-team.json.
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

    // Generate one app-profiling file per scenario (profiling + API calls)
    const profilingFiles = this.generateAppProfilingReports(
      reportData.metrics,
      reportsDir,
    );
    writtenFiles.push(...profilingFiles);

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

  /**
   * Sanitize a string for use in artifact filenames.
   */
  private sanitizeFileSegment(value: string, maxLength: number): string {
    return value.replace(/[^a-zA-Z0-9]/g, '_').substring(0, maxLength);
  }

  /**
   * Write one JSON file per scenario containing app profiling data and API calls.
   * Files land under `reports/app-profiling/` so CI artifacts include them
   * alongside the existing HTML/CSV/metrics reports.
   */
  private generateAppProfilingReports(
    metrics: MetricsEntry[],
    reportsDir: string,
  ): string[] {
    const writtenFiles: string[] = [];
    const profilingDir = path.join(reportsDir, 'app-profiling');

    if (!fs.existsSync(profilingDir)) {
      fs.mkdirSync(profilingDir, { recursive: true });
    }

    const usedFileNames = new Map<string, number>();

    metrics.forEach((metric) => {
      const hasProfiling =
        metric.profilingData != null || metric.profilingSummary != null;
      const hasApiCalls =
        metric.apiCalls != null || metric.apiCallsError != null;

      // Skip scenarios that never received BrowserStack enrichment data
      if (!hasProfiling && !hasApiCalls) {
        return;
      }

      const safeTestName = this.sanitizeFileSegment(metric.testName, 60);
      const safeDeviceName = this.sanitizeFileSegment(metric.device.name, 40);
      const projectSuffix = metric.projectName
        ? `-${this.sanitizeFileSegment(metric.projectName, 40)}`
        : '';

      let baseName = `app-profiling-${safeTestName}-${safeDeviceName}-${metric.device.osVersion}${projectSuffix}`;
      const collisionCount = usedFileNames.get(baseName) ?? 0;
      usedFileNames.set(baseName, collisionCount + 1);
      if (collisionCount > 0) {
        baseName = `${baseName}-${collisionCount + 1}`;
      }

      const profilingPath = path.join(profilingDir, `${baseName}.json`);
      const artifact: AppProfilingArtifact = {
        testName: metric.testName,
        projectName: metric.projectName ?? null,
        sessionId: metric.sessionId ?? null,
        device: metric.device,
        timestamp: metric.timestamp ?? new Date().toISOString(),
        profilingSummary: metric.profilingSummary ?? null,
        profilingData: metric.profilingData ?? null,
        apiCalls: metric.apiCalls ?? null,
        apiCallsError: metric.apiCallsError ?? null,
      };

      fs.writeFileSync(profilingPath, JSON.stringify(artifact, null, 2));
      logger.info(`App profiling report saved: ${profilingPath}`);
      writtenFiles.push(profilingPath);
    });

    if (writtenFiles.length > 0) {
      logger.info(
        `Wrote ${writtenFiles.length} per-scenario app profiling artifact(s) to ${profilingDir}`,
      );
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
