import { createLogger } from '../../../logger';
import { type RawProfilingData, type SessionDetails } from './types';

const logger = createLogger({ name: 'BrowserStackAPI' });
const API_BASE_URL = 'https://api-cloud.browserstack.com/app-automate';

// Constants for the BrowserStack API
const INITIAL_DELAY_MS = 5000;

/**
 * BrowserStack only accepts 'passed' or 'failed' as valid status values.
 * Playwright's testInfo.status can be: 'passed', 'failed', 'timedOut', 'skipped', 'interrupted'
 * This map converts Playwright status values to BrowserStack-compatible values.
 */
const BROWSERSTACK_STATUS_MAP: Record<string, 'passed' | 'failed'> = {
  passed: 'passed',
  failed: 'failed',
  timedOut: 'failed',
  skipped: 'failed',
  interrupted: 'failed',
};

/**
 * BrowserStack session details type
 */
export interface BrowserStackSessionDetails {
  name: string;
  duration: number;
  os: string;
  os_version: string;
  device: string;
  status: string;
  reason: string;
  build_name: string;
  project_name: string;
  logs: string;
  public_url: string;
  appium_logs_url: string;
  video_url: string;
  device_logs_url: string;
  app_details: {
    app_url: string;
    app_name: string;
    app_version: string;
    app_custom_id: string;
    uploaded_at: string;
  };
}

/**
 * BrowserStack API client for session management
 */
export class BrowserStackAPI {
  private username: string;
  private accessKey: string;

  constructor() {
    const username = process.env.BROWSERSTACK_USERNAME;
    const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

    if (!username || !accessKey) {
      throw new Error(
        'BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables are required',
      );
    }

    this.username = username;
    this.accessKey = accessKey;
  }

  /**
   * Get authorization header for API requests
   */
  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.username}:${this.accessKey}`).toString('base64')}`;
  }

  /**
   * Update session details (name, status, reason)
   * @param {string} sessionId - The session ID to update
   * @param {Object} details - The details to update
   * @returns The updated session details as a JSON object
   */
  async updateSession(
    sessionId: string,
    details: {
      status?: string;
      reason?: string;
      name?: string;
    },
  ): Promise<BrowserStackSessionDetails> {
    logger.debug(`Updating BrowserStack session: ${sessionId}`);

    // Build request body with all provided fields
    const body: Record<string, string> = {};
    if (details.name) body.name = details.name;
    if (details.status) {
      // Map Playwright status to BrowserStack-compatible status
      const mappedStatus = BROWSERSTACK_STATUS_MAP[details.status];
      if (mappedStatus) {
        body.status = mappedStatus;
      } else {
        // Log warning for unknown status values and default to 'failed'
        logger.warn(
          `Unknown test status "${details.status}", defaulting to "failed"`,
        );
        body.status = 'failed';
      }
    }
    if (details.reason) body.reason = details.reason;

    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}.json`, {
      method: 'PUT',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `Error updating BrowserStack session: ${response.statusText}`,
      );
    }

    const responseData = await response.json();
    logger.info('Session updated successfully');
    return responseData;
  }

  /**
   * Get session details from BrowserStack API
   * @param {string} sessionId - The session ID
   * @returns {Promise<SessionDetails>} Session details including buildId and session data
   */
  async getSessionDetails(sessionId: string): Promise<SessionDetails> {
    try {
      const url = `${API_BASE_URL}/sessions/${sessionId}.json`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Error fetching session details: HTTP ${response.status}, body: ${errorBody}`,
        );
      }

      const sessionData = await response.json();

      // Map the raw API response to our SessionDetails interface
      // BrowserStack API returns build_hashed_id, but our interface uses buildId
      return {
        buildId: sessionData.build_hashed_id,
        sessionData,
        profilingData: null,
      };
    } catch (error) {
      logger.error('Error getting session details:', error);
      throw error;
    }
  }
  /**
   * Get app profiling data v2 for a specific session
   * @param {string} buildId - The build hashed ID (not the build name)
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object>} App profiling data
   */
  async getAppProfilingData(
    buildId: string,
    sessionId: string,
  ): Promise<RawProfilingData> {
    const url = `${API_BASE_URL}/builds/${buildId}/sessions/${sessionId}/appprofiling/v2`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
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

  /**
   * Get the video URL for a specific session with retry mechanism
   * @param sessionId - The session ID
   * @param maxRetries - Maximum number of retries (default: 60)
   * @param delayMs - Delay between retries in ms (default: 3000)
   * @returns The video URL or null if not found
   */
  async getVideoURL(
    sessionId: string,
    maxRetries = 60,
    delayMs = 3000,
  ): Promise<string | null> {
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    logger.info(
      `Fetching video URL for session ${sessionId} (max ${maxRetries} attempts)`,
    );

    // Initial delay for BrowserStack to process the session
    await delay(INITIAL_DELAY_MS);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Attempt ${attempt}/${maxRetries}`);

        const response = await fetch(
          `${API_BASE_URL}/sessions/${sessionId}.json`,
          {
            method: 'GET',
            headers: {
              Authorization: this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
          },
        );

        if (!response.ok) {
          // Retry on 404 (session not yet available)
          if (response.status === 404 && attempt < maxRetries) {
            logger.debug(`Session not ready, retrying in ${delayMs}ms...`);
            await delay(delayMs);
            continue;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const sessionData = await response.json();
        const buildId = sessionData.build_hashed_id;

        if (buildId) {
          const videoURL = `${API_BASE_URL}/builds/${buildId}/sessions/${sessionId}`;
          logger.info(`Video URL retrieved: ${videoURL}`);
          return videoURL;
        }

        // Build ID not available yet, retry
        logger.debug(`Build ID not found, retrying in ${delayMs}ms...`);
        await delay(delayMs);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Attempt ${attempt} failed: ${errorMessage}`);

        if (attempt === maxRetries) {
          logger.error(`All ${maxRetries} attempts exhausted`);
          return null;
        }

        await delay(delayMs);
      }
    }

    return null;
  }
}
