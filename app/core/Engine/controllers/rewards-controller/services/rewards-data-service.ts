import type { RestrictedMessenger } from '@metamask/base-controller';
import AppConstants from '../../../../AppConstants';
import type { LoginResponseDto } from '../types';
import { getSubscriptionToken } from '../utils/multi-subscription-token-vault';

const SERVICE_NAME = 'RewardsDataService';

// Default timeout for all API requests (10 seconds)
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

// Auth endpoint action types

export interface RewardsDataServiceLoginAction {
  type: `${typeof SERVICE_NAME}:login`;
  handler: RewardsDataService['login'];
}

export type RewardsDataServiceActions = RewardsDataServiceLoginAction;

type AllowedActions = never;

export type RewardsDataServiceEvents = never;

type AllowedEvents = never;

export type RewardsDataServiceMessenger = RestrictedMessenger<
  typeof SERVICE_NAME,
  RewardsDataServiceActions,
  RewardsDataServiceEvents,
  AllowedActions['type'],
  AllowedEvents['type']
>;

/**
 * Data service for rewards API endpoints
 */
export class RewardsDataService {
  readonly #messenger: RewardsDataServiceMessenger;

  readonly #fetch: typeof fetch;

  constructor({
    messenger,
    fetch: fetchFunction,
  }: {
    messenger: RewardsDataServiceMessenger;
    fetch: typeof fetch;
  }) {
    this.#messenger = messenger;
    this.#fetch = fetchFunction;

    // Register all action handlers
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:login`,
      this.login.bind(this),
    );
  }

  /**
   * Make a request to the rewards API
   * @param endpoint - The endpoint to request
   * @param options - The options for the request
   * @param subscriptionId - The subscription ID to use for the request, used for authenticated requests
   * @param timeoutMs - Custom timeout in milliseconds, defaults to DEFAULT_REQUEST_TIMEOUT_MS
   * @returns The response from the request
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
    subscriptionId?: string,
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add bearer token for authenticated requests
    try {
      if (subscriptionId) {
        const tokenResult = await getSubscriptionToken(subscriptionId);
        if (tokenResult.success && tokenResult.token) {
          headers['rewards-api-key'] = tokenResult.token;
        }
      }
    } catch (error) {
      // Continue without bearer token if retrieval fails
      console.warn('Failed to retrieve bearer token:', error);
    }

    const url = `${AppConstants.REWARDS_API_URL}${endpoint}`;

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await this.#fetch(url, {
        credentials: 'omit',
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Check if the error is due to timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }

      throw error;
    }
  }

  /**
   * Perform login via signature for the current account.
   * @param body - The login request body containing account, timestamp, and signature.
   * @returns The login response DTO.
   */
  async login(body: {
    account: string;
    timestamp: number;
    signature: string;
  }): Promise<LoginResponseDto> {
    // For now, we're using the mobile-login endpoint for these types of login requests.
    // Our previous login endpoint had a slightly different flow as it was not based around silent auth.
    const response = await this.makeRequest('/auth/mobile-login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    return (await response.json()) as LoginResponseDto;
  }
}
