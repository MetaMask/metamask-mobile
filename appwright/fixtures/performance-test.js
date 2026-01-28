import { test as base } from 'appwright';
import { PerformanceTracker } from '../reporters/PerformanceTracker.js';
import QualityGatesValidator from '../utils/QualityGatesValidator.js';
import { getTeamInfoFromTags } from '../config/teams-config.js';

// Create a custom test fixture that handles performance tracking and cleanup
export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  performanceTracker: async ({}, use, testInfo) => {
    const performanceTracker = new PerformanceTracker();

    // Get team info from test tags (e.g., { tag: '@swap-bridge-dev-team' })
    const testTags = testInfo.tags || [];
    const teamInfo = getTeamInfoFromTags(testTags);
    performanceTracker.setTeamInfo(teamInfo);

    console.log(
      `👥 Test assigned to team: ${teamInfo.teamName} (${teamInfo.teamId})`,
    );

    // Provide the tracker to the test
    await use(performanceTracker);

    // After test completes, handle performance metrics and session cleanup
    console.log('🔍 Post-test cleanup: attaching performance metrics...');
    console.log(
      `📊 Found ${performanceTracker.timers.length} timers in tracker`,
    );

    if (performanceTracker.timers.length === 0) {
      console.log('⚠️ No timers found in performance tracker');
    }

    // Always try to attach performance metrics, even if test failed
    try {
      const metrics = await performanceTracker.attachToTest(testInfo);
      console.log(
        `✅ Performance metrics attached: ${
          metrics.steps.length
        } steps, ${metrics.total.toFixed(2)}s total`,
      );
    } catch (error) {
      console.error('❌ Failed to attach performance metrics:', error.message);
    }

    // Validate quality gates if any timer has thresholds defined
    const hasThresholds = performanceTracker.timers.some((t) =>
      t.hasThreshold(),
    );
    if (hasThresholds) {
      console.log('🔍 Validating quality gates...');
      QualityGatesValidator.assertThresholds(
        testInfo.title,
        performanceTracker.timers,
      );
      console.log('✅ Quality gates PASSED');
    }

    console.log('🔍 Looking for session ID...');

    let sessionId = null;

    if (testInfo && testInfo.annotations) {
      sessionId = testInfo.annotations.find(
        (annotation) => annotation.type === 'sessionId',
      )?.description;
    }

    if (sessionId) {
      // Store session data as a test attachment for the reporter to find
      // Include team info and tags in session data
      await testInfo.attach('session-data', {
        body: JSON.stringify({
          sessionId,
          testTitle: testInfo.title,
          testFilePath: testInfo.file || '',
          tags: testTags,
          projectName: testInfo.project.name,
          timestamp: new Date().toISOString(),
          team: teamInfo,
        }),
        contentType: 'application/json',
      });

      await performanceTracker.storeSessionData(sessionId, testInfo.title);
      console.log(`✅ Session data stored: ${sessionId}`);
    } else {
      console.log('⚠️ No session ID found - video URL cannot be retrieved');
    }
  },
});

export { expect } from 'appwright';
