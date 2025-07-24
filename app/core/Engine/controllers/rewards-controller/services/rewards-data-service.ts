import type { RestrictedMessenger } from '@metamask/base-controller';
import AppConstants from '../../../../AppConstants';
import type { LoginResponseDto, RewardsControllerState } from '../types';
import { getSubscriptionToken } from '../utils/multi-subscription-token-vault';

const SERVICE_NAME = 'RewardsDataService';

// Auth endpoint action types

export interface RewardsDataServiceMobileLoginAction {
  type: `${typeof SERVICE_NAME}:mobileLogin`;
  handler: RewardsDataService['mobileLogin'];
}

export type RewardsDataServiceActions = RewardsDataServiceMobileLoginAction;

interface AllowedActions {
  type: 'RewardsController:getState';
  handler: () => RewardsControllerState;
}

export type RewardsDataServiceEvents = never;

type AllowedEvents = never;

export type RewardsDataServiceMessenger = RestrictedMessenger<
  typeof SERVICE_NAME,
  RewardsDataServiceActions | AllowedActions,
  RewardsDataServiceEvents | AllowedEvents,
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
      `${SERVICE_NAME}:mobileLogin`,
      this.mobileLogin.bind(this),
    );
  }

  /**
   * Make an authenticated request to the rewards API
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add bearer token for authenticated requests
    try {
      const rewardsState = await this.#messenger.call(
        'RewardsController:getState',
      );
      const subscriptionId = rewardsState.subscription?.id;

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

    return this.#fetch(url, {
      credentials: 'omit',
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
  }

  /**
   * Perform mobile login for the current account.
   * @param body - The login request body containing account, timestamp, and signature.
   * @returns The login response DTO.
   */
  async mobileLogin(body: {
    account: string;
    timestamp: number;
    signature: string;
  }): Promise<LoginResponseDto> {
    const response = await this.makeRequest('/auth/mobile-login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Mobile login failed: ${response.status}`);
    }

    return (await response.json()) as LoginResponseDto;
  }
}
