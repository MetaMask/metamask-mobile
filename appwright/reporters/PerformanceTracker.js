import axios from 'axios';
// Assuming BrowserStackCredentials.js exports a static class or object
import { BrowserStackCredentials } from '../utils/BrowserStackCredentials.js';

/**
 * Interface representing a performance timer object.
 * Assumed to have methods for retrieving timing data.
 * @typedef {Object} PerformanceTimer
 * @property {string} id - Unique identifier for the timer.
 * @property {function(): (number|null)} getDuration - Returns duration in milliseconds or null.
 * @property {function(): number} getDurationInSeconds - Returns duration in seconds.
 */

/**
 * PerformanceTracker class handles collecting performance metrics,
 * managing timers, and fetching session-related data (like video URLs) 
 * from external services (BrowserStack).
 */
export class PerformanceTracker {
  /**
   * @type {PerformanceTimer[]}
   */
  timers;
  /**
   * @type {string | null}
   */
  sessionId;
  /**
   * @type {string | null}
   */
  testTitle;

  constructor() {
    this.timers = [];
    this.sessionId = null;
    this.testTitle = null;
  }

  /**
   * Adds a new timer to the tracker if a timer with the same ID does not already exist.
   * @param {PerformanceTimer} timer - The timer object to add.
   */
  addTimer(timer) {
    // Use .some() for better semantics when checking for existence.
    if (this.timers.some((existingTimer) => existingTimer.id === timer.id)) {
      return;
    }

    this.timers.push(timer);
  }

  /**
   * Stores session metadata internally within the class instance.
   * This is a critical fix to prevent parallel test runs from overwriting 
   * global process.env variables.
   * @param {string} sessionId - The unique ID of the running session (e.g., BrowserStack session ID).
   * @param {string} testTitle - The title of the test case.
   */
  async storeSessionData(sessionId, testTitle) {
    this.sessionId = sessionId;
    this.testTitle = testTitle;
    console.log(`[INFO] Stored session data internally: ${sessionId} | ${testTitle}`);
  }

  /**
   * Attempts to retrieve the video URL for a given session ID using a retry mechanism.
   * @param {string} sessionId - The ID of the session to query.
   * @param {number} [maxRetries=60] - Maximum number of retries.
   * @param {number} [delayMs=3000] - Delay between retries in milliseconds.
   * @returns {Promise<string|null>} The video URL string or null if exhausted/failed.
   */
  async getVideoURL(sessionId, maxRetries = 60, delayMs = 3000) {
    console.log(
      `[RETRY] Starting retrieval mechanism: ${maxRetries} attempts, ${delayMs}ms delay. Max total time: ${(maxRetries * delayMs) / 1000}s`,
    );

    // Use async await for non-blocking delay instead of mixing blocking setTimeout.
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log('[INFO] Initial 5-second wait completed.');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        console.log(`[ATTEMPT] ${attempt}/${maxRetries} - Querying session data...`);
        
        // Credentials must be retrieved dynamically for each attempt for robustness.
        const credentials = BrowserStackCredentials.getCredentials();
        
        const response = await axios.get(
          `https://api-cloud.browserstack.com/app-automate/sessions/${sessionId}.json`,
          {
            auth: {
              username: credentials.username,
              password: credentials.accessKey,
            },
            timeout: 8000,
          },
        );

        const sessionData = response.data.automation_session;
        // Check for session status completion or required data presence
        if (sessionData.build_hashed_id) {
          const videoURL = `https://app-automate.browserstack.com/builds/${sessionData.build_hashed_id}/sessions/${sessionId}`;
          console.log(`[SUCCESS] Video URL found: ${videoURL}`);
          return videoURL;
        }

        console.log(`[WAITING] Build ID not available yet. Session status: ${sessionData.status || 'unknown'}`);

      } catch (error) {
        const status = error.response?.status;
        const elapsedTime = (Date.now() - startTime) / 1000;

        if (status === 404 && attempt < maxRetries) {
          console.warn(`[RETRY] Attempt ${attempt} failed (404 Not Found, Session still processing). Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        // Handle other errors (e.g., 401, 5xx, network timeouts) or maximum retries reached
        console.error(
          `[ERROR] Final failure on attempt ${attempt} (${elapsedTime}s). Status: ${status || 'Network Error'}`,
          error.message,
        );
        return null;
      }
    }

    console.error(`[FAILURE] Exhausted all ${maxRetries} attempts.`);
    return null;
  }

  /**
   * Aggregates collected performance metrics and attaches them to the test report via testInfo.attach.
   * @param {object} testInfo - The Playwright test information object.
   * @returns {Promise<object>} The metrics object.
   */
  async attachToTest(testInfo) {
    const metrics = {
      steps: [],
      // Ensure total is correctly initialized as a number
      total: 0, 
    };

    for (const timer of this.timers) {
      // Assuming getDuration() returns ms and getDurationInSeconds() returns seconds
      const durationMs = timer.getDuration();
      
      if (durationMs !== null && !isNaN(durationMs) && durationMs > 0) {
        const durationInSeconds = durationMs / 1000; // Calculate once for consistency
        
        // Create a step object keyed by the timer ID
        const stepObject = {};
        stepObject[timer.id] = durationMs; // Storing duration in milliseconds is typical for precision

        metrics.steps.push(stepObject);
        metrics.total += durationInSeconds; // Total duration in seconds
      }
    }

    // Safely retrieve and set device info with robust fallbacks
    const deviceInfo = testInfo?.project?.use?.device || { 
      name: 'Unknown', 
      osVersion: 'Unknown', 
      provider: 'unknown' 
    };
    
    // Ensure the metric object is standardized and clean
    metrics.device = deviceInfo;
    metrics.testTitle = this.testTitle || testInfo.title;
    metrics.sessionId = this.sessionId || 'N/A';


    try {
      // Use the internal test title for naming the attachment
      await testInfo.attach(`performance-metrics-${this.testTitle || testInfo.title}`, {
        body: JSON.stringify(metrics, null, 2), // Use formatting for readability
        contentType: 'application/json',
      });
      console.log(`[SUCCESS] Attached performance metrics for ${metrics.testTitle}.`);
    } catch (error) {
      console.error(`[ERROR] Failed to attach performance metrics:`, error.message);
      // Re-throw the error to ensure the calling process is aware of the failure
      throw error; 
    }

    return metrics;
  }
}
