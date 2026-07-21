import { createLogger } from '../../../logger.ts';

const logger = createLogger({ name: 'TestMuAIAPI' });
const API_BASE_URL =
  'https://mobile-api.lambdatest.com/mobile-automation/api/v1';
const DEFAULT_TIMEOUT_MS = 8000;

export class TestMuAIAPIError extends Error {
  status: number;
  body: string | null;

  constructor(message: string, status: number, body: string | null = null) {
    super(message);
    this.name = 'TestMuAIAPIError';
    this.status = status;
    this.body = body;
  }
}

const TESTMU_STATUS_MAP: Record<string, 'passed' | 'failed'> = {
  passed: 'passed',
  failed: 'failed',
  timedOut: 'failed',
  interrupted: 'failed',
};

export interface TestMuAISessionDetails {
  session_id?: string;
  name?: string;
  status?: string;
  build_name?: string;
  build_id?: string;
  device_name?: string;
  platform_version?: string;
  platform_name?: string;
  video_url?: string;
  app?: string;
}

/**
 * TestMu AI (LambdaTest) API client for mobile app automation sessions.
 */
export class TestMuAIAPI {
  private username: string | null;
  private accessKey: string | null;

  constructor() {
    this.username = process.env.LT_USERNAME || null;
    this.accessKey = process.env.LT_ACCESS_KEY || null;

    if (!this.username || !this.accessKey) {
      logger.warn(
        'LT_USERNAME and/or LT_ACCESS_KEY environment variables are missing. API calls will return null.',
      );
    }
  }

  private hasCredentials(): boolean {
    return !!(this.username && this.accessKey);
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.username}:${this.accessKey}`).toString('base64')}`;
  }

  async getSession(sessionId: string): Promise<TestMuAISessionDetails | null> {
    if (!this.hasCredentials()) {
      logger.warn('Skipping getSession: missing TestMu AI credentials');
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        Authorization: this.getAuthHeader(),
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new TestMuAIAPIError(
        `Error fetching TestMu AI session: ${response.statusText}`,
        response.status,
        errorBody,
      );
    }

    const data = (await response.json()) as {
      data?: TestMuAISessionDetails;
    } & TestMuAISessionDetails;

    return data.data ?? data;
  }

  async getAppMetrics(sessionId: string): Promise<unknown> {
    if (!this.hasCredentials()) {
      logger.warn('Skipping getAppMetrics: missing TestMu AI credentials');
      return null;
    }

    const response = await fetch(
      `${API_BASE_URL}/sessions/${sessionId}/log/appmetrics`,
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
      throw new TestMuAIAPIError(
        `Error fetching TestMu AI app metrics: ${response.statusText}`,
        response.status,
        errorBody,
      );
    }

    return await response.json();
  }

  async getVideoURL(
    sessionId: string,
    maxRetries = 60,
    delayMs = 3000,
  ): Promise<string | null> {
    if (!this.hasCredentials()) {
      logger.warn('Skipping getVideoURL: missing TestMu AI credentials');
      return null;
    }

    logger.info(
      `Starting TestMu AI video URL fetch: ${maxRetries} retries, ${delayMs}ms delays`,
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const session = await this.getSession(sessionId);
        if (session?.video_url) {
          logger.info(`TestMu AI video URL found on attempt ${attempt}`);
          return session.video_url;
        }

        const dashboardUrl = this.buildSessionURL(sessionId);
        if (attempt === maxRetries) {
          return dashboardUrl;
        }
      } catch (error: unknown) {
        const status =
          error instanceof TestMuAIAPIError ? error.status : undefined;
        const message = error instanceof Error ? error.message : String(error);

        if (status === 404 && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        logger.error(
          `TestMu AI video URL fetch failed after ${attempt} attempts: ${message}`,
        );
        return null;
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return this.buildSessionURL(sessionId);
  }

  buildSessionURL(sessionId: string): string {
    return `https://appautomation.lambdatest.com/test?sessionID=${sessionId}`;
  }

  async getSessionDetails(sessionId: string): Promise<{
    buildId: string | null;
    sessionData: TestMuAISessionDetails;
  } | null> {
    const response = await this.getSession(sessionId);
    if (!response) return null;
    return {
      buildId: response.build_id ?? null,
      sessionData: response,
    };
  }

  async updateSession(
    sessionId: string,
    details: {
      status?: string;
      reason?: string;
      name?: string;
    },
  ): Promise<unknown> {
    if (!this.hasCredentials()) {
      logger.warn('Skipping updateSession: missing TestMu AI credentials');
      return null;
    }

    const body: Record<string, string> = {};
    if (details.name) body.name = details.name;
    if (details.status) {
      const mappedStatus = TESTMU_STATUS_MAP[details.status];
      if (mappedStatus) {
        body.status_ind = mappedStatus;
      } else if (details.status !== 'skipped') {
        logger.warn(
          `Unknown test status "${details.status}", defaulting to "failed"`,
        );
        body.status_ind = 'failed';
      }
    }
    if (details.reason) body.reason = details.reason;

    if (Object.keys(body).length === 0) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new TestMuAIAPIError(
        `Error updating TestMu AI session: ${response.statusText}`,
        response.status,
        errorBody,
      );
    }

    return await response.json();
  }
}
