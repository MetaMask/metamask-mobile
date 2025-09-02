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
      '⏱️ Initial 45-second wait for BrowserStack session processing...',
    );
    await new Promise((resolve) => setTimeout(resolve, 45000));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        console.log(
          `🎯 === ATTEMPT ${attempt}/${maxRetries} === Time: ${new Date().toISOString()}`,
        );
        const response = await axios.get(
          `https://api.browserstack.com/automate/sessions/${sessionId}.json`,
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

  async attachMetricsOnly(testInfo) {
    console.log('Attaching performance metrics only (no video URL)');
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

  async getVideoURLAggressiveRetry(sessionId) {
    const BS_USERNAME = process.env.BROWSERSTACK_USERNAME;
    const BS_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;

    console.log('Starting aggressive retry strategy...');

    // Try immediate fetch first (session might already be ready)
    try {
      console.log(
        'Quick attempt - checking if session is immediately available...',
      );
      const response = await axios.get(
        `https://api.browserstack.com/automate/sessions/${sessionId}.json`,
        {
          auth: { username: BS_USERNAME, password: BS_ACCESS_KEY },
          timeout: 3000,
        },
      );
      const videoURL = response.data.automation_session.video_url;
      console.log('SUCCESS on immediate attempt:', videoURL);
      return videoURL;
    } catch (error) {
      console.log('Immediate attempt failed, starting progressive retry...');
    }

    // Progressive delays: start fast, then increase delay
    const delays = [5000, 10000, 15000, 20000]; // 5s, 10s, 15s, 20s

    for (let i = 0; i < delays.length; i++) {
      const delay = delays[i];
      console.log(`Waiting ${delay}ms before attempt ${i + 2}...`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Try multiple quick attempts after each delay
      for (let quickAttempt = 1; quickAttempt <= 10; quickAttempt++) {
        try {
          console.log(`Progressive attempt ${i + 2}.${quickAttempt}`);
          const response = await axios.get(
            `https://api.browserstack.com/automate/sessions/${sessionId}.json`,
            {
              auth: { username: BS_USERNAME, password: BS_ACCESS_KEY },
              timeout: 3000,
            },
          );
          const videoURL = response.data.automation_session.video_url;
          console.log(
            `SUCCESS on progressive attempt ${i + 2}.${quickAttempt}:`,
            videoURL,
          );
          return videoURL;
        } catch (error) {
          if (error.response?.status !== 404) {
            console.error('Non-404 error, aborting:', error.message);
            return null;
          }
          // Quick retry within this delay period
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    console.error('All progressive retry attempts failed');
    return null;
  }

  async getVideoURLWithBackgroundRetry(
    sessionId,
    maxRetries = 50,
    delayMs = 1000,
  ) {
    const BS_USERNAME = process.env.BROWSERSTACK_USERNAME;
    const BS_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;

    console.log(
      `Background video URL fetch: ${maxRetries} retries, ${delayMs}ms delay`,
    );

    // Initial delay to let BrowserStack session finalize
    await new Promise((resolve) => setTimeout(resolve, 10000));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Background attempt ${attempt}/${maxRetries}`);
        const response = await axios.get(
          `https://api.browserstack.com/automate/sessions/${sessionId}.json`,
          {
            auth: {
              username: BS_USERNAME,
              password: BS_ACCESS_KEY,
            },
            timeout: 5000, // Shorter timeout per request
          },
        );

        const videoURL = response.data.automation_session.video_url;
        console.log(`SUCCESS: Got video URL on attempt ${attempt}:`, videoURL);
        return videoURL;
      } catch (error) {
        const status = error.response?.status;

        if (status === 404 && attempt < maxRetries) {
          console.log(
            `Background retry ${attempt}/${maxRetries} - 404, waiting ${delayMs}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        console.error(
          `Background fetch failed after ${attempt} attempts:`,
          error.message,
        );
        return null;
      }
    }

    console.error(`Background fetch exhausted all ${maxRetries} attempts`);
    return null;
  }
}
