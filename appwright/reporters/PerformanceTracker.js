import axios from 'axios';

export class PerformanceTracker {
  constructor() {
    this.timers = {};
  }

  addTimer(timer) {
    if (this.timers[timer.id]) {
      // eslint-disable-next-line no-console
      console.log('Timer already exists', timer.id);
      return;
    }
    this.timers[timer.id] = timer;
  }

  async storeSessionData(sessionId, testTitle) {
    // Store in process environment
    process.env.TEMP_SESSION_ID = sessionId;
    process.env.TEMP_TEST_TITLE = testTitle;

    console.log(`✅ Session data stored: ${sessionId}`);
  }

  async getVideoURL(sessionId, maxRetries = 60, delayMs = 3000) {
    const BS_USERNAME = process.env.BROWSERSTACK_USERNAME;
    const BS_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;

    console.log(
      `🔄 STARTING RETRY MECHANISM: ${maxRetries} retries, ${delayMs}ms delays`,
    );
    console.log(
      `📊 Estimated total time: ${(maxRetries * delayMs) / 1000} seconds`,
    );
    console.log(`🕐 Start time: ${new Date().toISOString()}`);

    // Initial delay to let BrowserStack process the session
    console.log(
      '⏱️ Initial 15-second wait for BrowserStack session processing...',
    );
    await new Promise((resolve) => setTimeout(resolve, 15000));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        console.log(
          `🎯 === ATTEMPT ${attempt}/${maxRetries} === Time: ${new Date().toISOString()}`,
        );
        const response = await axios.get(
          `https://api.browserstack.com/app-automate/sessions/${sessionId}.json`,
          {
            auth: {
              username: BS_USERNAME,
              password: BS_ACCESS_KEY,
            },
            timeout: 8000, // 8 second timeout per request
          },
        );

        const videoURL = response.data.automation_session.video_url;
        console.log(`✅ SUCCESS ON ATTEMPT ${attempt}! Video URL:`, videoURL);
        console.log(
          `🕐 Total time elapsed: ${(Date.now() - startTime) / 1000}s`,
        );
        return videoURL;
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

  async attachToTest(testInfo) {
    const metrics = {};
    let totalSeconds = 0;
    for (const [id, timer] of Object.entries(this.timers)) {
      metrics[id] = timer.getDuration();
      totalSeconds += timer.getDurationInSeconds();
    }
    metrics.total = totalSeconds;
    metrics.device = testInfo.project.use.device;

    await testInfo.attach(`performance-metrics-${testInfo.title}`, {
      body: JSON.stringify(metrics),
      contentType: 'application/json',
    });
    return metrics;
  }
}
