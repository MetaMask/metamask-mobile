/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import path from 'path';
import { createLogger } from '../framework/logger';
import {
  QualityGatesValidator,
  QualityGatesReportFormatter,
  clearQualityGateFailures,
} from '../framework/quality-gates';
import { getTeamInfoFromTags } from '../teams-config.js';
import { DeviceInfoExtractor } from './utils/DeviceInfoExtractor';
import { BrowserStackEnricher } from './providers/browserstack/BrowserStackEnricher';
import { HtmlReportGenerator } from './generators/HtmlReportGenerator';
import { CsvReportGenerator } from './generators/CsvReportGenerator';
import { JsonReportGenerator } from './generators/JsonReportGenerator';
import type {
  MetricsEntry,
  SessionData,
  FailedTestsByTeam,
  TeamInfo,
  DeviceInfo,
  ReportData,
  ReportSummary,
} from './types';

const logger = createLogger({ name: 'PerformanceReporter' });

/** Minimal shape of a Playwright TestCase for the fields we access. */
interface PlaywrightTestCase {
  title: string;
  tags?: string[];
  location?: { file?: string };
  parent?: { project?: { name?: string; use?: { device?: DeviceInfo } } };
  project?: { use?: { device?: DeviceInfo } };
  use?: { device?: DeviceInfo };
}

/** Minimal shape of a Playwright TestResult for the fields we access. */
interface PlaywrightTestResult {
  status: string;
  duration: number;
  attachments: { name: string; body?: Buffer }[];
  annotations?: { type: string; description?: string }[];
}

/**
 * Main Playwright reporter for performance test runs.
 * Replaces the old custom-reporter.js with clean separation of concerns.
 */
class PerformanceReporter {
  private metrics: MetricsEntry[];
  private sessions: SessionData[];
  private processedTests: Set<string>;
  private qualityGatesValidator: QualityGatesValidator;
  private qualityGatesReportFormatter: QualityGatesReportFormatter;
  private failedTestsByTeam: FailedTestsByTeam;

  constructor() {
    this.metrics = [];
    this.sessions = [];
    this.processedTests = new Set();
    this.qualityGatesValidator = new QualityGatesValidator();
    this.qualityGatesReportFormatter = new QualityGatesReportFormatter();
    this.failedTestsByTeam = {};
  }

  onBegin(): void {
    logger.info(
      'Test suite starting: Clearing quality gate failures from previous runs...',
    );
    clearQualityGateFailures();
  }

  onTestEnd(test: PlaywrightTestCase, result: PlaywrightTestResult): void {
    const projectName: string = test?.parent?.project?.name || 'unknown';
    const testId = `${test.title}-${projectName}`;

    if (this.processedTests.has(testId)) {
      logger.warn(
        `Test already processed, skipping: ${test.title} (${projectName})`,
      );
      return;
    }
    this.processedTests.add(testId);

    // Get team info from test tags
    let testTags: string[] = test.tags || [];
    if (!Array.isArray(testTags)) {
      testTags = [];
    }

    const testFilePath: string = test?.location?.file || '';
    const teamInfo: TeamInfo = getTeamInfoFromTags(testTags) as TeamInfo;

    logger.info(`Processing test: ${test.title} (${result.status})`);
    logger.info(`Team: ${teamInfo.teamName} (${teamInfo.teamId})`);
    logger.info(
      `Tags: ${testTags.length > 0 ? testTags.join(', ') : 'none (using default team)'}`,
    );

    this.processSessionData(test, result, testFilePath, teamInfo);
    this.trackFailedTest(
      test,
      result,
      testFilePath,
      teamInfo,
      testTags,
      projectName,
    );
    this.processMetrics(
      test,
      result,
      testFilePath,
      teamInfo,
      testTags,
      projectName,
    );
  }

  async onEnd(): Promise<void> {
    logger.info(`Generating reports for ${this.metrics.length} tests`);

    const summary = this.calculateSummary();
    const isBrowserStackRun = this.detectBrowserStackRun();

    if (this.sessions.length > 0 && isBrowserStackRun) {
      await this.enrichSessionsWithProviderData();
    }

    // Clean up leftover environment variables
    delete process.env.TEMP_SESSION_ID;
    delete process.env.TEMP_TEST_TITLE;
    delete process.env.TEMP_PROJECT_NAME;

    // If we have no metrics, nothing to report
    if (this.metrics.length === 0) {
      logger.info('No metrics found');
      return;
    }

    await this.generateReports(summary);
  }

  // --- Private helpers ---

  private processSessionData(
    test: PlaywrightTestCase,
    result: PlaywrightTestResult,
    testFilePath: string,
    teamInfo: TeamInfo,
  ): void {
    const sessionAttachment = result.attachments.find(
      (att) => att.name === 'session-data',
    );

    if (sessionAttachment?.body) {
      try {
        const sessionData = JSON.parse(sessionAttachment.body.toString());
        this.sessions.push({
          ...sessionData,
          testStatus: result.status,
          testDuration: result.duration,
          team: sessionData.team || teamInfo,
        });
        logger.info(
          `[Pipeline] Session from attachment: sessionId=${sessionData.sessionId}, projectName=${sessionData.projectName ?? 'undefined'}, testTitle=${sessionData.testTitle}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error parsing session data: ${message}`);
      }
    }

    // Fallback: Try to capture session ID from test result annotations
    if (result.annotations) {
      const sessionIdAnnotation = result.annotations.find(
        (annotation) => annotation.type === 'sessionId',
      );
      if (sessionIdAnnotation?.description) {
        const sessionId: string = sessionIdAnnotation.description;

        // Only add if we didn't already capture it from attachments
        if (!this.sessions.find((s) => s.sessionId === sessionId)) {
          this.sessions.push({
            sessionId,
            testTitle: test.title,
            testFilePath,
            testStatus: result.status,
            testDuration: result.duration,
            timestamp: new Date().toISOString(),
            team: teamInfo,
          });
          logger.info(
            `[Pipeline] Session from annotations (no projectName): sessionId=${sessionId}, testTitle=${test.title}`,
          );
        }
      }
    }
  }

  private trackFailedTest(
    test: PlaywrightTestCase,
    result: PlaywrightTestResult,
    testFilePath: string,
    teamInfo: TeamInfo,
    testTags: string[],
    projectName: string,
  ): void {
    const isActualFailure =
      result.status === 'failed' || result.status === 'timedOut';
    if (!isActualFailure) return;

    const teamId = teamInfo.teamId;
    const sessionIdFromAnnotation = result.annotations?.find(
      (a) => a.type === 'sessionId',
    )?.description;

    if (!this.failedTestsByTeam[teamId]) {
      this.failedTestsByTeam[teamId] = {
        team: teamInfo,
        tests: [],
      };
    }
    this.failedTestsByTeam[teamId].tests.push({
      testName: test.title,
      testFilePath,
      tags: testTags,
      status: result.status,
      duration: result.duration,
      projectName,
      sessionId: sessionIdFromAnnotation || null,
      qualityGates: null,
      failureReason: null,
    });
  }

  private processMetrics(
    test: PlaywrightTestCase,
    result: PlaywrightTestResult,
    testFilePath: string,
    teamInfo: TeamInfo,
    testTags: string[],
    projectName: string,
  ): void {
    const metricsAttachment = result.attachments.find((att) =>
      att.name?.includes('performance-metrics'),
    );

    if (metricsAttachment?.body) {
      try {
        const metrics = JSON.parse(metricsAttachment.body.toString());

        const isFallbackMetrics =
          metricsAttachment.name.includes('fallback') ||
          metrics.message ===
            'Performance metrics could not be properly attached';

        logger.info(
          `Processing metrics for: ${test.title} ${isFallbackMetrics ? '(fallback)' : ''}`,
        );

        const metricsEntry: MetricsEntry = {
          testName: test.title,
          testFilePath,
          tags: testTags,
          ...metrics,
        };

        // Mark actual failures
        if (result.status === 'failed' || result.status === 'timedOut') {
          metricsEntry.testFailed = true;
          metricsEntry.failureReason = result.status;
        }

        // Ensure consistent device info
        const deviceInfo: DeviceInfo = DeviceInfoExtractor.extract(test);
        metricsEntry.device = deviceInfo;

        // Ensure team info is included
        if (!metricsEntry.team) {
          metricsEntry.team = teamInfo;
        }

        // For fallback metrics, ensure proper structure
        if (isFallbackMetrics) {
          if (!metricsEntry.total && metricsEntry.testDuration) {
            metricsEntry.total = metricsEntry.testDuration / 1000;
          }
          if (!metricsEntry.steps) {
            metricsEntry.steps = [];
          }
        }

        // Validate quality gates
        if (metricsEntry.steps && metricsEntry.steps.length > 0) {
          const qualityGatesResult = this.qualityGatesValidator.validateMetrics(
            test.title,
            metricsEntry.steps,
            metricsEntry.total || 0,
            metricsEntry.totalThreshold || null,
          );
          metricsEntry.qualityGates = qualityGatesResult;

          if (qualityGatesResult.hasThresholds) {
            logger.info(
              this.qualityGatesReportFormatter.formatConsoleReport(
                qualityGatesResult,
              ),
            );
          }

          // Update failed test entry with quality gates info
          if (metricsEntry.testFailed) {
            const updates: Record<string, unknown> = {
              qualityGates: qualityGatesResult,
            };
            if (
              qualityGatesResult.hasThresholds &&
              !qualityGatesResult.passed
            ) {
              updates.failureReason = 'quality_gates_exceeded';
              updates.qualityGatesViolations = qualityGatesResult.violations;
            } else {
              updates.failureReason =
                metricsEntry.failureReason || 'test_error';
            }
            this.updateFailedTestEntry(
              teamInfo.teamId,
              test.title,
              projectName,
              updates,
            );
          }
        }

        this.metrics.push(metricsEntry);
      } catch (error) {
        logger.error(`Error processing metrics: ${error}`);
      }
    } else if (result.status === 'failed' || result.status === 'timedOut') {
      // For actual failed tests without metrics, create a basic entry
      logger.warn('Test failed without metrics, creating basic entry');

      const deviceInfo: DeviceInfo = DeviceInfoExtractor.extract(test);

      const basicEntry: MetricsEntry = {
        testName: test.title,
        testFilePath,
        tags: testTags,
        total: result.duration / 1000,
        device: deviceInfo,
        steps: [],
        testFailed: true,
        failureReason: result.status,
        note: 'Test failed - no performance metrics collected',
        team: teamInfo,
      };

      this.metrics.push(basicEntry);

      this.updateFailedTestEntry(teamInfo.teamId, test.title, projectName, {
        failureReason: result.status,
      });
    }
  }

  private updateFailedTestEntry(
    teamId: string,
    testTitle: string,
    projectName: string,
    updates: Record<string, unknown>,
  ): void {
    if (!this.failedTestsByTeam[teamId]) return;

    const failedTest = this.failedTestsByTeam[teamId].tests.find(
      (t) => t.testName === testTitle && t.projectName === projectName,
    );
    if (failedTest) {
      Object.assign(failedTest, updates);
    }
  }

  private calculateSummary(): ReportSummary {
    return {
      totalTests: this.metrics.length,
      passedTests: this.metrics.filter((m) => !m.testFailed).length,
      failedTests: this.metrics.filter((m) => m.testFailed).length,
      testsWithSteps: this.metrics.filter((m) => m.steps && m.steps.length > 0)
        .length,
      testsWithFallbackData: this.metrics.filter(
        (m) =>
          m.note &&
          (m.note.includes('failed') ||
            m.note.includes('no performance metrics')),
      ).length,
    };
  }

  private detectBrowserStackRun(): boolean {
    const projectNames = this.sessions
      .map((s) => s.projectName)
      .filter(Boolean);
    const isBrowserStackRun =
      this.sessions.length > 0 &&
      projectNames.some((name) => (name ?? '').includes('browserstack-'));

    logger.info(
      `[Pipeline] Sessions: ${this.sessions.length}, projectNames: [${projectNames.join(', ') || 'none'}], isBrowserStackRun: ${isBrowserStackRun}`,
    );
    if (this.sessions.length > 0 && !isBrowserStackRun) {
      logger.info(
        '[Pipeline] Skipping BrowserStack fetch (video/profiling/network logs): project name does not include "browserstack-"',
      );
    }

    return isBrowserStackRun;
  }

  private async enrichSessionsWithProviderData(): Promise<void> {
    logger.info(
      `Fetching video URLs, profiling and network logs for ${this.sessions.length} sessions`,
    );

    const enricher = new BrowserStackEnricher();

    for (const session of this.sessions) {
      try {
        await enricher.enrichSession(session);
      } catch (error) {
        logger.error(`Error enriching session for ${session.testTitle}`);
      }
    }
  }

  private async generateReports(summary: ReportSummary): Promise<void> {
    const testName = (this.metrics[0]?.testName ?? 'Unknown')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-');

    try {
      // Ensure reports directory exists
      const reportsDir = path.join(__dirname, 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Merge session data into metrics (video URLs, profiling, network logs)
      const metricsWithSession = this.mergeSessionDataIntoMetrics();

      const reportData: ReportData = {
        metrics: metricsWithSession,
        sessions: this.sessions,
        failedTestsByTeam: this.failedTestsByTeam,
        summary,
      };

      // Generate HTML report
      logger.debug('Metrics are:', this.metrics);
      const htmlGenerator = new HtmlReportGenerator();
      const html = htmlGenerator.generate(reportData);
      const reportPath = path.join(
        reportsDir,
        `performance-report-${testName}-${timestamp}.html`,
      );
      fs.writeFileSync(reportPath, html);
      logger.info(`Performance report generated: ${reportPath}`);

      // Generate CSV report
      const csvGenerator = new CsvReportGenerator();
      const csv = csvGenerator.generate(reportData);
      const csvPath = path.join(
        reportsDir,
        `performance-report-${testName}-${timestamp}.csv`,
      );
      fs.writeFileSync(csvPath, csv);
      logger.info(`Performance CSV report saved: ${csvPath}`);

      // Generate JSON reports (device-specific + failed-tests-by-team)
      const jsonGenerator = new JsonReportGenerator();
      jsonGenerator.generate(reportData, reportsDir);
    } catch (error) {
      logger.error(`Error generating performance report: ${error}`);
    }

    // Final summary: where to find reports
    const reportsDir = path.join(__dirname, 'reports');
    const reportsDirAbs = path.resolve(reportsDir);
    logger.info(`Reports saved in: ${reportsDirAbs}`);
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir);
      if (files.length > 0) {
        logger.info(
          `   Files: ${files.slice(0, 15).join(', ')}${files.length > 15 ? ` (+${files.length - 15} more)` : ''}`,
        );
      }
    }
  }

  private mergeSessionDataIntoMetrics(): MetricsEntry[] {
    return this.metrics.map((metric) => {
      const matchingSession = this.sessions.find(
        (session) => session.testTitle === metric.testName,
      );
      const apiCalls =
        matchingSession?.networkLogsEntries != null
          ? matchingSession.networkLogsEntries
          : null;
      const apiCallsError = matchingSession?.networkLogsError || null;
      logger.debug(
        `[Pipeline] Metric "${metric.testName}": matchingSession=${!!matchingSession}, apiCalls=${Array.isArray(apiCalls) ? apiCalls.length : apiCalls}, apiCallsError=${apiCallsError ?? 'null'}`,
      );

      const deviceInfo = matchingSession?.deviceInfo || metric.device;

      return {
        ...metric,
        device: deviceInfo,
        videoURL: matchingSession?.videoURL || null,
        sessionId: matchingSession?.sessionId || null,
        profilingData: matchingSession?.profilingData || null,
        profilingSummary: matchingSession?.profilingSummary || null,
        apiCalls,
        apiCallsError,
      };
    });
  }
}

export default PerformanceReporter;
