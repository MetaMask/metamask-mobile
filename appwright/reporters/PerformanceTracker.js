import axios from 'axios';

export class PerformanceTracker {
  constructor() {
    this.timers = [];
  }

  addTimer(timer) {
    if (this.timers.find((existingTimer) => existingTimer.id === timer.id)) {
      return;
    }

    this.timers.push(timer);
  }

  async storeSessionData(sessionId, testTitle) {
    // Store in process environment
    process.env.TEMP_SESSION_ID = sessionId;
    process.env.TEMP_TEST_TITLE = testTitle;
  }

  async getVideoURL(sessionId, maxRetries = 60, delayMs = 3000) {
    const BS_USERNAME = process.env.BROWSERSTACK_USERNAME;
    const BS_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;

    console.log(
      `🔄 STARTING RETRY MECHANISM: ${maxRetries} retries, ${delayMs}ms delays`,
    );
    console.log(`📊 Max total time: ${(maxRetries * delayMs) / 1000} seconds`);
    // Initial delay to let BrowserStack process the session
    console.log(
      '⏱️ Initial 5-second wait for BrowserStack session processing...',
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        console.log(
          `🎯 === ATTEMPT ${attempt}/${maxRetries} === Time: ${new Date().toISOString()}`,
        );
        const response = await axios.get(
          `https://api-cloud.browserstack.com/app-automate/sessions/${sessionId}.json`,
          {
            auth: {
              username: BS_USERNAME,
              password: BS_ACCESS_KEY,
            },
            timeout: 8000, // 8 second timeout per request
          },
        );

        const sessionData = response.data.automation_session;
        const buildId = sessionData.build_hashed_id;

        if (buildId) {
          // Construct the route to the session video without using the auth token
          const videoURL = `https://app-automate.browserstack.com/builds/${buildId}/sessions/${sessionId}`;
          console.log(`✅ SUCCESS ON ATTEMPT ${attempt}! Video URL:`, videoURL);
          console.log(
            `🕐 Total time elapsed: ${(Date.now() - startTime) / 1000}s`,
          );
          return videoURL;
        }

        console.log(
          `Build ID not found in session data for attempt ${attempt}`,
        );
      } catch (error) {
        const status = error.response?.status;
        const elapsedTime = (Date.now() - startTime) / 1000;

        console.log(
          `❌ ATTEMPT ${attempt}/${maxRetries} FAILED (${elapsedTime}s):`,
          {
            status,
            message: error.message,
            data: error.response?.data,
          },
        );

        // Only retry on 404 status and if we haven't reached max retries
        if (status === 404 && attempt < maxRetries) {
          const remaining = maxRetries - attempt;
          console.log(
            `🔄 404 ERROR - WILL RETRY IN ${delayMs}ms... (${remaining} attempts remaining)`,
          );
          console.log(`⏰ Starting delay at: ${new Date().toISOString()}`);

          await new Promise((resolve) => setTimeout(resolve, delayMs));

          console.log(`⏰ Delay completed at: ${new Date().toISOString()}`);
          console.log(`➡️ Proceeding to attempt ${attempt + 1}/${maxRetries}`);
          continue;
        }

        // For non-404 errors or last attempt, log and exit
        console.error(
          `🚫 FINAL ERROR after ${attempt} attempts (${elapsedTime}s):`,
          error.response?.data || error.message,
        );
        return null;
      }
    }

    // This should never be reached, but adding for safety
    console.error(
      `💥 ALL ${maxRetries} ATTEMPTS EXHAUSTED - NO VIDEO URL AVAILABLE`,
    );
    console.log(`🕐 End time: ${new Date().toISOString()}`);
    return null;
  }

  async getSessionDetails(sessionId) {
    const BS_USERNAME = process.env.BROWSERSTACK_USERNAME;
    const BS_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;

    try {
      const url = `https://api-cloud.browserstack.com/app-automate/sessions/${sessionId}.json`;

      const response = await axios.get(url, {
        auth: {
          username: BS_USERNAME,
          password: BS_ACCESS_KEY,
        },
        timeout: 8000,
      });

      const sessionData = response.data.automation_session;

      const result = {
        buildId: sessionData.build_hashed_id,
        sessionData,
        profilingData: sessionData.app_profiling || null,
      };
      return result;
    } catch (error) {
      console.error('❌ Error getting session details:', error);
      return null;
    }
  }

  async getBuildIdFromSession(sessionId) {
    const sessionDetails = await this.getSessionDetails(sessionId);
    return sessionDetails?.buildId || null;
  }

  /**
   * Get app profiling data v2 for a specific session
   * @param {string} buildId - The build hashed ID (not the build name)
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object>} App profiling data
   */
  async getAppProfilingData(buildId, sessionId) {
    const BS_USERNAME = process.env.BROWSERSTACK_USERNAME;
    const BS_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;

    // eslint-disable-next-line no-undef
    const authHeader = Buffer.from(`${BS_USERNAME}:${BS_ACCESS_KEY}`).toString(
      'base64',
    );

    const url = `https://api-cloud.browserstack.com/app-automate/builds/${buildId}/sessions/${sessionId}/appprofiling/v2`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorBody}`,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting app profiling data v2:', error);
      throw error;
    }
  }

  async attachToTest(testInfo) {
    const metrics = {
      steps: [],
    };
    let totalSeconds = 0;

    for (const timer of this.timers) {
      const duration = timer.getDuration();
      const durationInSeconds = timer.getDurationInSeconds();

      if (duration !== null && !isNaN(duration) && duration > 0) {
        // Create a step object with the timer id as key and duration as value
        const stepObject = {};
        stepObject[timer.id] = duration;
        metrics.steps.push(stepObject);

        totalSeconds += durationInSeconds;
      }
    }

    metrics.total = totalSeconds;

    // Safely get device info with fallbacks
    const deviceInfo = testInfo?.project?.use?.device;
    if (deviceInfo) {
      metrics.device = deviceInfo;
    } else {
      metrics.device = {
        name: 'Unknown',
        osVersion: 'Unknown',
        provider: 'unknown',
      };
    }

    try {
      await testInfo.attach(`performance-metrics-${testInfo.title}`, {
        body: JSON.stringify(metrics),
        contentType: 'application/json',
      });
    } catch (error) {
      console.error(`❌ Failed to attach performance metrics:`, error.message);
      throw error;
    }

    return metrics;
  }
}
