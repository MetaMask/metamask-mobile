import { createLogger } from '../../../logger';

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
   */
  async updateSession(
    sessionId: string,
    details: {
      status?: string;
      reason?: string;
      name?: string;
    },
  ): Promise<unknown> {
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
  async getSession(sessionId: string): Promise<BrowserStackSessionDetails> {
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
}
