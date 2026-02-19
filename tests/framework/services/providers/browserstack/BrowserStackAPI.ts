import { createLogger } from '../../../logger.ts';

const logger = createLogger({ name: 'BrowserStackAPI' });
const API_BASE_URL = 'https://api-cloud.browserstack.com/app-automate';
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Custom error that preserves the HTTP status code from API responses.
 * Consumers can check `error.status` to handle specific HTTP errors (e.g. 404 retries).
 */
export class BrowserStackAPIError extends Error {
  status: number;
  body: string | null;

  constructor(message: string, status: number, body: string | null = null) {
    super(message);
    this.name = 'BrowserStackAPIError';
    this.status = status;
    this.body = body;
  }
}

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
  build_hashed_id: string;
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
  private username: string | null;
  private accessKey: string | null;

  constructor() {
    this.username = process.env.BROWSERSTACK_USERNAME || null;
    this.accessKey = process.env.BROWSERSTACK_ACCESS_KEY || null;

    if (!this.username || !this.accessKey) {
      logger.warn(
        'BROWSERSTACK_USERNAME and/or BROWSERSTACK_ACCESS_KEY environment variables are missing. API calls will return null.',
      );
    }
  }

  /**
   * Check if credentials are available. API methods use this internally
   * and return null when credentials are missing.
   */
  private hasCredentials(): boolean {
    return !!(this.username && this.accessKey);
  }

  /**
   * Get authorization header for API requests
   */
  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.username}:${this.accessKey}`).toString('base64')}`;
  }

  /**
   * Update session details (name, status, reason)
   */
  async updateSession(
    sessionId: string,
    details: {
      status?: string;
      reason?: string;
      name?: string;
    },
  ): Promise<unknown> {
    if (!this.hasCredentials()) {
      logger.warn('Skipping updateSession: missing BrowserStack credentials');
      return null;
    }

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
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BrowserStackAPIError(
        `Error updating BrowserStack session: ${response.statusText}`,
        response.status,
        errorBody,
      );
    }

    const responseData = await response.json();
    logger.info('Session updated successfully');
    return responseData;
  }

  /**
   * Get session details
   */
  async getSession(
    sessionId: string,
  ): Promise<BrowserStackSessionDetails | null> {
    if (!this.hasCredentials()) {
      logger.warn('Skipping getSession: missing BrowserStack credentials');
      return null;
    }

    logger.debug(`Fetching BrowserStack session details: ${sessionId}`);

    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}.json`, {
      method: 'GET',
      headers: {
        Authorization: this.getAuthHeader(),
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BrowserStackAPIError(
        `Error fetching BrowserStack session: ${response.statusText}`,
        response.status,
        errorBody,
      );
    }

    const data = (await response.json()) as {
      automation_session: BrowserStackSessionDetails;
    };
    return data.automation_session;
  }

  /**
   * Get app profiling data v2 for a specific session
   */
  async getAppProfilingData(
    buildId: string,
    sessionId: string,
  ): Promise<unknown> {
    if (!this.hasCredentials()) {
      logger.warn(
        'Skipping getAppProfilingData: missing BrowserStack credentials',
      );
      return null;
    }

    logger.debug(
      `Fetching app profiling data: build=${buildId}, session=${sessionId}`,
    );

    const response = await fetch(
      `${API_BASE_URL}/builds/${buildId}/sessions/${sessionId}/appprofiling/v2`,
      {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BrowserStackAPIError(
        `Error fetching app profiling data: ${response.statusText}`,
        response.status,
        errorBody,
      );
    }

    return await response.json();
  }

  /**
   * Fetch network logs (HAR) for a session
   */
  async getNetworkLogs(buildId: string, sessionId: string): Promise<unknown> {
    if (!this.hasCredentials()) {
      logger.warn('Skipping getNetworkLogs: missing BrowserStack credentials');
      return null;
    }

    logger.debug(
      `Fetching network logs: build=${buildId}, session=${sessionId}`,
    );

    const response = await fetch(
      `${API_BASE_URL}/builds/${buildId}/sessions/${sessionId}/networklogs`,
      {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BrowserStackAPIError(
        `Network logs API error: ${response.statusText}`,
        response.status,
        errorBody,
      );
    }

    return await response.json();
  }

  /**
   * Get app profiling data v2 for a specific session
   */
  async getAppProfilingData(
    buildId: string,
    sessionId: string,
  ): Promise<unknown> {
    if (!this.hasCredentials()) {
      logger.warn(
        'Skipping getAppProfilingData: missing BrowserStack credentials',
      );
      return null;
    }

    logger.debug(
      `Fetching app profiling data: build=${buildId}, session=${sessionId}`,
    );

    const response = await fetch(
      `${API_BASE_URL}/builds/${buildId}/sessions/${sessionId}/appprofiling/v2`,
      {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BrowserStackAPIError(
        `Error fetching app profiling data: ${response.statusText}`,
        response.status,
        errorBody,
      );
    }

    return await response.json();
  }

  /**
   * Fetch network logs (HAR) for a session
   */
  async getNetworkLogs(buildId: string, sessionId: string): Promise<unknown> {
    if (!this.hasCredentials()) {
      logger.warn('Skipping getNetworkLogs: missing BrowserStack credentials');
      return null;
    }

    logger.debug(
      `Fetching network logs: build=${buildId}, session=${sessionId}`,
    );

    const response = await fetch(
      `${API_BASE_URL}/builds/${buildId}/sessions/${sessionId}/networklogs`,
      {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BrowserStackAPIError(
        `Network logs API error: ${response.statusText}`,
        response.status,
        errorBody,
      );
    }

    return await response.json();
  }

  /**
   * Get the video/session URL for a session with retry mechanism.
   * BrowserStack sessions may not be immediately available after test completion,
   * so this method retries on 404 errors.
   * @returns The session URL or null if unavailable after all retries.
   */
  async getVideoURL(
    sessionId: string,
    maxRetries = 60,
    delayMs = 3000,
  ): Promise<string | null> {
    if (!this.hasCredentials()) {
      logger.warn('Skipping getVideoURL: missing BrowserStack credentials');
      return null;
    }

    logger.info(
      `Starting video URL fetch: ${maxRetries} retries, ${delayMs}ms delays`,
    );
    logger.info(`Max total time: ${(maxRetries * delayMs) / 1000} seconds`);

    // Initial delay to let BrowserStack process the session
    logger.info('Initial 5-second wait for BrowserStack session processing...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        logger.info(
          `=== ATTEMPT ${attempt}/${maxRetries} === Time: ${new Date().toISOString()}`,
        );

        const response = await this.getSession(sessionId);

        if (!response) {
          logger.error(
            'No response from BrowserStack API (missing credentials?)',
          );
          return null;
        }

        const buildId = response.build_hashed_id;

        if (buildId) {
          const videoURL = this.buildSessionURL(buildId, sessionId);
          logger.info(`SUCCESS ON ATTEMPT ${attempt}! Video URL: ${videoURL}`);
          return videoURL;
        }

        logger.info(
          `Build ID not found in session data for attempt ${attempt}`,
        );
      } catch (error: unknown) {
        const status =
          error instanceof BrowserStackAPIError ? error.status : undefined;
        const elapsedTime = (Date.now() - startTime) / 1000;
        const message = error instanceof Error ? error.message : String(error);

        logger.info(
          `ATTEMPT ${attempt}/${maxRetries} FAILED (${elapsedTime}s): status=${status}, message=${message}`,
        );

        // Only retry on 404 status and if we haven't reached max retries
        if (status === 404 && attempt < maxRetries) {
          const remaining = maxRetries - attempt;
          logger.info(
            `404 ERROR - WILL RETRY IN ${delayMs}ms... (${remaining} attempts remaining)`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        // For non-404 errors or last attempt, log and exit
        logger.error(
          `FINAL ERROR after ${attempt} attempts (${elapsedTime}s): ${message}`,
        );
        return null;
      }
    }

    logger.error(
      `ALL ${maxRetries} ATTEMPTS EXHAUSTED - NO VIDEO URL AVAILABLE`,
    );
    return null;
  }

  /**
   * Build the BrowserStack session URL from a build ID and session ID.
   * Derives the URL from API_BASE_URL so it stays consistent with the configured endpoint.
   * @param buildId - The build ID to build the session URL for.
   * @param sessionId - The session ID to build the session URL for.
   * @returns The session URL.
   */
  buildSessionURL(buildId: string, sessionId: string): string {
    return `${API_BASE_URL.replace('api-cloud.browserstack.com/app-automate', 'app-automate.browserstack.com')}/builds/${buildId}/sessions/${sessionId}`;
  }

  /**
   * Get session details including build ID.
   * Convenience wrapper that extracts common fields from getSession().
   * @returns Object with buildId and full sessionData, or null if unavailable.
   */
  async getSessionDetails(
    sessionId: string,
  ): Promise<{
    buildId: string;
    sessionData: BrowserStackSessionDetails;
  } | null> {
    const response = await this.getSession(sessionId);
    if (!response) return null;
    return {
      buildId: response.build_hashed_id,
      sessionData: response,
    };
  }
}
