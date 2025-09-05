import { test as base } from 'appwright';
import { PerformanceTracker } from '../reporters/PerformanceTracker.js';

// Create a custom test fixture that handles performance tracking and cleanup
export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  performanceTracker: async ({}, use, testInfo) => {
    const performanceTracker = new PerformanceTracker();

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

    // Enhanced timer recovery: capture any timers that weren't added to the tracker
    try {
      const Timers = await import('../utils/Timers.js').then((m) => m.default);
      const allGlobalTimers = Timers.getAllTimers();

      // Check for timers that exist globally but weren't added to the tracker
      for (const globalTimer of allGlobalTimers) {
        const existsInTracker = performanceTracker.timers.some(
          (t) => t.id === globalTimer.id,
        );

        if (!existsInTracker) {
          console.log(`🔄 Recovering orphaned timer: "${globalTimer.id}"`);

          try {
            const { default: TimerHelper } = await import(
              '../utils/TimersHelper.js'
            );
            const recoveredTimer = new TimerHelper(globalTimer.id);

            if (globalTimer.start !== null && globalTimer.duration === null) {
              recoveredTimer.stop();
            }

            performanceTracker.addTimer(recoveredTimer);
          } catch (error) {
            console.log(`⚠️ Failed to recover timer ${globalTimer.id}`);
          }
        }
      }
    } catch (importError) {
      console.log(`⚠️ Timer recovery failed: ${importError.message}`);
    }

    // Stop any running timers in the tracker
    for (const timer of performanceTracker.timers) {
      try {
        const isRunning = timer.isRunning ? timer.isRunning() : false;
        const isCompleted = timer.isCompleted ? timer.isCompleted() : false;

        if (isRunning && !isCompleted) {
          timer.stop();
        }
      } catch (error) {
        console.log(`⚠️ Error checking timer ${timer.id}`);
      }
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

      // Create fallback metrics for failed tests
      try {
        const fallbackMetrics = {
          testFailed: true,
          failureReason: testInfo?.status || 'unknown',
          testDuration: testInfo?.duration || 0,
          message: 'Performance metrics could not be properly attached',
          timersFound: performanceTracker.timers.length,
          device: testInfo?.project?.use?.device || {
            name: 'Unknown',
            osVersion: 'Unknown',
          },
        };

        await testInfo.attach(
          `performance-metrics-fallback-${testInfo.title}`,
          {
            body: JSON.stringify(fallbackMetrics),
            contentType: 'application/json',
          },
        );
        console.log(`✅ Fallback metrics attached`);
      } catch (fallbackError) {
        console.error('❌ Fallback metrics attachment failed');
      }
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
      await testInfo.attach('session-data', {
        body: JSON.stringify({
          sessionId,
          testTitle: testInfo.title,
          projectName: testInfo.project.name,
          timestamp: new Date().toISOString(),
        }),
        contentType: 'application/json',
      });

      await performanceTracker.storeSessionData(sessionId, testInfo.title);
      console.log(`✅ Session data stored: ${sessionId}`);
    } else {
      console.log('⚠️ No session ID found - video URL cannot be retrieved');
    }

    // Clean up global timers to prevent interference between tests
    try {
      const Timers = await import('../utils/Timers.js').then((m) => m.default);
      Timers.resetTimers();
    } catch (error) {
      console.log(`⚠️ Failed to clean up global timers: ${error.message}`);
    }
  },
});

export { expect } from 'appwright';
