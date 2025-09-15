import type { RestrictedMessenger } from '@metamask/base-controller';
import { getVersion } from 'react-native-device-info';
import AppConstants from '../../../../AppConstants';
import type {
  LoginResponseDto,
  EstimatePointsDto,
  EstimatedPointsDto,
  GetPerpsDiscountDto,
  PerpsDiscountData,
  LoginDto,
  SeasonStatusDto,
  GenerateChallengeDto,
  ChallengeResponseDto,
  SubscriptionReferralDetailsDto,
  PaginatedPointsEventsDto,
  GetPointsEventsDto,
} from '../types';
import { getSubscriptionToken } from '../utils/multi-subscription-token-vault';
import Logger from '../../../../../util/Logger';
import { successfulFetch } from '@metamask/controller-utils';

const SERVICE_NAME = 'RewardsDataService';

// Default timeout for all API requests (10 seconds)
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

// Geolocation URLs for different environments
const GEOLOCATION_URLS = {
  DEV: 'https://on-ramp.dev-api.cx.metamask.io/geolocation',
  PROD: 'https://on-ramp.api.cx.metamask.io/geolocation',
};

// Auth endpoint action types

export interface RewardsDataServiceLoginAction {
  type: `${typeof SERVICE_NAME}:login`;
  handler: RewardsDataService['login'];
}

export interface RewardsDataServiceGetPointsEventsAction {
  type: `${typeof SERVICE_NAME}:getPointsEvents`;
  handler: RewardsDataService['getPointsEvents'];
}

export interface RewardsDataServiceEstimatePointsAction {
  type: `${typeof SERVICE_NAME}:estimatePoints`;
  handler: RewardsDataService['estimatePoints'];
}

export interface RewardsDataServiceGetPerpsDiscountAction {
  type: `${typeof SERVICE_NAME}:getPerpsDiscount`;
  handler: RewardsDataService['getPerpsDiscount'];
}
export interface RewardsDataServiceOptinAction {
  type: `${typeof SERVICE_NAME}:optin`;
  handler: RewardsDataService['optin'];
}

export interface RewardsDataServiceLogoutAction {
  type: `${typeof SERVICE_NAME}:logout`;
  handler: RewardsDataService['logout'];
}

export interface RewardsDataServiceGenerateChallengeAction {
  type: `${typeof SERVICE_NAME}:generateChallenge`;
  handler: RewardsDataService['generateChallenge'];
}

export interface RewardsDataServiceGetSeasonStatusAction {
  type: `${typeof SERVICE_NAME}:getSeasonStatus`;
  handler: RewardsDataService['getSeasonStatus'];
}

export interface RewardsDataServiceGetReferralDetailsAction {
  type: `${typeof SERVICE_NAME}:getReferralDetails`;
  handler: RewardsDataService['getReferralDetails'];
}

export interface RewardsDataServiceFetchGeoLocationAction {
  type: `${typeof SERVICE_NAME}:fetchGeoLocation`;
  handler: RewardsDataService['fetchGeoLocation'];
}

export interface RewardsDataServiceValidateReferralCodeAction {
  type: `${typeof SERVICE_NAME}:validateReferralCode`;
  handler: RewardsDataService['validateReferralCode'];
}

export type RewardsDataServiceActions =
  | RewardsDataServiceLoginAction
  | RewardsDataServiceGetPointsEventsAction
  | RewardsDataServiceEstimatePointsAction
  | RewardsDataServiceGetPerpsDiscountAction
  | RewardsDataServiceGetSeasonStatusAction
  | RewardsDataServiceGetReferralDetailsAction
  | RewardsDataServiceOptinAction
  | RewardsDataServiceLogoutAction
  | RewardsDataServiceGenerateChallengeAction
  | RewardsDataServiceFetchGeoLocationAction
  | RewardsDataServiceValidateReferralCodeAction;

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

  readonly #appType: 'mobile' | 'extension';

  readonly #locale: string;

  constructor({
    messenger,
    fetch: fetchFunction,
    appType = 'mobile',
    locale = 'en-US',
  }: {
    messenger: RewardsDataServiceMessenger;
    fetch: typeof fetch;
    appType?: 'mobile' | 'extension';
    locale?: string;
  }) {
    this.#messenger = messenger;
    this.#fetch = fetchFunction;
    this.#appType = appType;
    this.#locale = locale;
    // Register all action handlers
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:login`,
      this.login.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getPointsEvents`,
      this.getPointsEvents.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:estimatePoints`,
      this.estimatePoints.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getPerpsDiscount`,
      this.getPerpsDiscount.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:optin`,
      this.optin.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:logout`,
      this.logout.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:generateChallenge`,
      this.generateChallenge.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getSeasonStatus`,
      this.getSeasonStatus.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getReferralDetails`,
      this.getReferralDetails.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:fetchGeoLocation`,
      this.fetchGeoLocation.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:validateReferralCode`,
      this.validateReferralCode.bind(this),
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

    // Add client identification header (matches web3_clientVersion format)
    try {
      const appVersion = getVersion();
      headers['rewards-client-id'] = `${this.#appType}-${appVersion}`;
    } catch (error) {
      // Continue without client header if version retrieval fails
      console.warn('Failed to retrieve app version for client header:', error);
    }

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

    // Add locale header for internationalization
    if (this.#locale) {
      headers['Accept-Language'] = this.#locale;
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

  /**
   * Get a list of points events for the season
   * @param params - The request parameters containing
   * @returns The list of points events DTO.
   */
  async getPointsEvents(
    params: GetPointsEventsDto,
  ): Promise<PaginatedPointsEventsDto> {
    const { seasonId, subscriptionId, cursor } = params;

    let url = `/seasons/${seasonId}/points-events`;
    if (cursor) url += `?cursor=${encodeURIComponent(cursor)}`;

    const response = await this.makeRequest(
      url,
      {
        method: 'GET',
      },
      subscriptionId,
    );

    if (!response.ok) {
      throw new Error(`Get points events failed: ${response.status}`);
    }

    return (await response.json()) as PaginatedPointsEventsDto;
  }

  /**
   * Estimate points for a given activity.
   * @param body - The estimate points request body.
   * @returns The estimated points response DTO.
   */
  async estimatePoints(body: EstimatePointsDto): Promise<EstimatedPointsDto> {
    const response = await this.makeRequest('/points-estimation', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Points estimation failed: ${response.status}`);
    }

    return (await response.json()) as EstimatedPointsDto;
  }

  /**
   * Get Perps fee discount for a given address.
   * @param params - The request parameters containing the CAIP-10 address.
   * @returns The parsed Perps discount data containing opt-in status and discount percentage.
   */
  async getPerpsDiscount(
    params: GetPerpsDiscountDto,
  ): Promise<PerpsDiscountData> {
    const response = await this.makeRequest(
      `/public/rewards/perps-fee-discount/${params.account}`,
      {
        method: 'GET',
      },
    );

    if (!response.ok) {
      throw new Error(`Get Perps discount failed: ${response.status}`);
    }

    const responseText = await response.text();

    // Parse the X,Y format where X is opt-in status (0 or 1) and Y is discount
    const parts = responseText.split(',');
    if (parts.length !== 2) {
      throw new Error(
        `Invalid perps discount response format: ${responseText}`,
      );
    }

    const optInStatus = parseInt(parts[0]);
    const discount = parseFloat(parts[1]);

    if (isNaN(optInStatus) || isNaN(discount)) {
      throw new Error(
        `Invalid perps discount values: optIn=${parts[0]}, discount=${parts[1]}`,
      );
    }

    if (optInStatus !== 0 && optInStatus !== 1) {
      throw new Error(
        `Invalid opt-in status: ${optInStatus}. Expected 0 or 1.`,
      );
    }

    return {
      hasOptedIn: optInStatus === 1,
      discount,
    };
  }

  /**
   * Generate a challenge for authentication.
   * @param body - The challenge request body containing the address.
   * @returns The challenge response DTO.
   */
  async generateChallenge(
    body: GenerateChallengeDto,
  ): Promise<ChallengeResponseDto> {
    const response = await this.makeRequest('/auth/challenge/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Generate challenge failed: ${response.status}`);
    }

    return (await response.json()) as ChallengeResponseDto;
  }

  /**
   * Perform optin (login) via challenge and signature.
   * @param body - The login request body containing challengeId, signature, and optional referralCode.
   * @returns The login response DTO.
   */
  async optin(body: LoginDto): Promise<LoginResponseDto> {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Optin failed: ${response.status}`);
    }

    return (await response.json()) as LoginResponseDto;
  }

  /**
   * Perform logout for the current authenticated session.
   * @param subscriptionId - The subscription ID to use for the authenticated request.
   * @returns Promise that resolves when logout is complete.
   */
  async logout(subscriptionId?: string): Promise<void> {
    const response = await this.makeRequest(
      '/auth/logout',
      {
        method: 'POST',
      },
      subscriptionId,
    );

    if (!response.ok) {
      throw new Error(`Logout failed: ${response.status}`);
    }
  }

  /**
   * Get season status for a specific season.
   * @param seasonId - The ID of the season to get status for.
   * @param subscriptionId - The subscription ID for authentication.
   * @returns The season status DTO.
   */
  async getSeasonStatus(
    seasonId: string,
    subscriptionId: string,
  ): Promise<SeasonStatusDto> {
    const response = await this.makeRequest(
      `/seasons/${seasonId}/status`,
      {
        method: 'GET',
      },
      subscriptionId,
    );

    if (!response.ok) {
      throw new Error(`Get season status failed: ${response.status}`);
    }

    const data = await response.json();

    // Convert date strings to Date objects
    if (data.balance?.updatedAt) {
      data.balance.updatedAt = new Date(data.balance.updatedAt);
    }
    if (data.season) {
      if (data.season.startDate) {
        data.season.startDate = new Date(data.season.startDate);
      }
      if (data.season.endDate) {
        data.season.endDate = new Date(data.season.endDate);
      }
    }

    return data as SeasonStatusDto;
  }

  /**
   * Get referral details for a specific subscription.
   * @param subscriptionId - The subscription ID for authentication.
   * @returns The referral details DTO.
   */
  async getReferralDetails(
    subscriptionId: string,
  ): Promise<SubscriptionReferralDetailsDto> {
    const response = await this.makeRequest(
      '/subscriptions/referral-details',
      {
        method: 'GET',
      },
      subscriptionId,
    );

    if (!response.ok) {
      throw new Error(`Get referral details failed: ${response.status}`);
    }

    return (await response.json()) as SubscriptionReferralDetailsDto;
  }

  /**
   * Fetch geolocation information from MetaMask's geolocation service.
   * Returns location in Country or Country-Region format (e.g., 'US', 'CA-ON', 'FR').
   * @returns Promise<string> - The geolocation string or 'UNKNOWN' on failure.
   */
  async fetchGeoLocation(): Promise<string> {
    let location = 'UNKNOWN';

    try {
      const environment = AppConstants.IS_DEV ? 'DEV' : 'PROD';
      const response = await successfulFetch(GEOLOCATION_URLS[environment]);

      if (!response.ok) {
        return location;
      }
      location = await response?.text();
      return location;
    } catch (e) {
      Logger.log('RewardsDataService: Failed to fetch geoloaction', e);
      return location;
    }
  }

  /**
   * Validate a referral code.
   * @param code - The referral code to validate.
   * @returns Promise<{valid: boolean}> - Object indicating if the code is valid.
   */
  async validateReferralCode(code: string): Promise<{ valid: boolean }> {
    const response = await this.makeRequest(
      `/referral/validate?code=${encodeURIComponent(code)}`,
      {
        method: 'GET',
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to validate referral code. Please try again shortly.`,
      );
    }

    return (await response.json()) as { valid: boolean };
  }
}
