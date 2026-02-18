import { createLogger } from '../../../logger.ts';

const logger = createLogger({ name: 'BrowserStackAPI' });
const API_BASE_URL = 'https://api-cloud.browserstack.com/app-automate';

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
    });

    if (!response.ok) {
      throw new Error(
        `Error fetching BrowserStack session: ${response.statusText}`,
      );
    }

    return (await response.json()) as BrowserStackSessionDetails;
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
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Error fetching app profiling data: ${response.status}, body: ${errorBody}`,
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
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Network logs API error: ${response.status} ${text}`);
    }

    return await response.json();
  }
}
