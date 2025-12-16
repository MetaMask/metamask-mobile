import axios from 'axios';
import { BrowserStackCredentials } from '../utils/BrowserStackCredentials.js';

export class PerformanceTracker {
  constructor() {
    this.timers = [];
  }

  addTimers(...timers) {
    timers.forEach((timer) => {
      this.addTimer(timer);
    });
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
        const credentials = BrowserStackCredentials.getCredentials();
        const response = await axios.get(
          `https://api-cloud.browserstack.com/app-automate/sessions/${sessionId}.json`,
          {
            auth: {
              username: credentials.username,
              password: credentials.accessKey,
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

  async attachToTest(testInfo) {
    const THRESHOLD_MARGIN_PERCENT = 10;
    const metrics = {
      steps: [],
      timestamp: new Date().toISOString(),
      thresholdMarginPercent: THRESHOLD_MARGIN_PERCENT,
    };
    let totalSeconds = 0;
    let totalThresholdMs = 0;
    let allHaveThresholds = true;

    for (const timer of this.timers) {
      const duration = timer.getDuration();
      const durationInSeconds = timer.getDurationInSeconds();

      if (duration !== null && !isNaN(duration) && duration > 0) {
        const hasThreshold = timer.threshold !== null;
        const passed = !hasThreshold || duration <= timer.threshold;
        const exceeded =
          hasThreshold && !passed ? duration - timer.threshold : null;
        const percentOver =
          exceeded !== null
            ? ((exceeded / timer.threshold) * 100).toFixed(1)
            : null;

        // Create a step object with timer info including thresholds and validation
        const stepObject = {
          name: timer.id,
          duration,
          baseThreshold: timer.baseThreshold,
          threshold: timer.threshold, // Includes +10% margin
          validation: hasThreshold
            ? {
                passed,
                exceeded,
                percentOver: percentOver ? `${percentOver}%` : null,
              }
            : null,
        };
        metrics.steps.push(stepObject);

        totalSeconds += durationInSeconds;

        if (timer.threshold !== null) {
          totalThresholdMs += timer.threshold;
        } else {
          allHaveThresholds = false;
        }
      }
    }

    metrics.total = totalSeconds;
    metrics.totalThreshold = allHaveThresholds ? totalThresholdMs : null;
    metrics.hasThresholds = this.timers.some((t) => t.hasThreshold());

    // Add total validation if all steps have thresholds
    if (allHaveThresholds && totalThresholdMs > 0) {
      const totalDurationMs = totalSeconds * 1000;
      const totalPassed = totalDurationMs <= totalThresholdMs;
      const totalExceeded = !totalPassed
        ? totalDurationMs - totalThresholdMs
        : null;
      const totalPercentOver =
        totalExceeded !== null
          ? ((totalExceeded / totalThresholdMs) * 100).toFixed(1)
          : null;

      metrics.totalValidation = {
        passed: totalPassed,
        exceeded: totalExceeded,
        percentOver: totalPercentOver ? `${totalPercentOver}%` : null,
      };
    } else {
      metrics.totalValidation = null;
    }

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
