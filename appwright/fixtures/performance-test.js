import { test as base } from 'appwright';
import { PerformanceTracker } from '../reporters/PerformanceTracker.js';

// Create a custom test fixture that handles performance tracking and cleanup
export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  performanceTracker: async ({}, use, testInfo) => {
    const performanceTracker = new PerformanceTracker();

    // Provide the tracker to the test
    await use(performanceTracker);

    // After test completes, handle session cleanup
    console.log('🔍 Looking for session ID...');

    let sessionId = null;

    if (testInfo && testInfo.annotations) {
      sessionId = testInfo.annotations.find(
        (annotation) => annotation.type === 'sessionId',
      )?.description;
      console.log(`📊 Session ID from annotations: ${sessionId}`);
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

      console.log('testInfo.project.name', testInfo.project.name);
      await performanceTracker.storeSessionData(sessionId, testInfo.title);
      console.log(`✅ Session data stored successfully: ${sessionId}`);
    } else {
      console.log('❌ No session ID found - video URL cannot be retrieved');
      console.log(
        'Available testInfo properties:',
        Object.keys(testInfo || {}),
      );
      if (testInfo?.annotations) {
        console.log(
          'Available annotations:',
          testInfo.annotations.map((a) => ({
            type: a.type,
            description: a.description?.substring(0, 50),
          })),
        );
      }
    }
  },
});

export { expect } from 'appwright';
