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
  SubscriptionReferralDetailsDto,
  GenerateChallengeDto,
  ChallengeResponseDto,
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
    Logger.log('RewardsDataService: getPointsEvents', params);
    const { cursor } = params;

    if (!cursor) {
      return {
        results: [
          {
            id: '59144-0xb204d894578dc20f72880b3e9acbe20d9f10cde061e05cbdc1c66bbf5ce37b5d',
            timestamp: new Date('2025-09-09T09:09:33.000Z'),
            type: 'SWAP',
            payload: {
              srcAsset: {
                amount: '1153602',
                type: 'eip155:59144/erc20:0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
                decimals: 6,
                name: 'USD Coin',
                symbol: 'USDC',
              },
              destAsset: {
                amount: '261268688837964',
                type: 'eip155:59144/slip44:60',
                decimals: 18,
                name: 'Ether',
                symbol: 'ETH',
              },
              txHash:
                '0xb204d894578dc20f72880b3e9acbe20d9f10cde061e05cbdc1c66bbf5ce37b5d',
            },
            value: 2,
            bonus: {
              bips: 10000,
              bonuses: ['cb3a0161-ee12-49f4-a336-31063c90347e'],
            },
            accountAddress: '0x334d7bA8922c9F45422882B495b403644311Eaea',
          },
          {
            id: '59144-0xdf05bc9f3ac8bf7b315ebb8851818bae4a9f7b451054870f056b23e69c348e57',
            timestamp: new Date('2025-09-03T11:05:12.000Z'),
            type: 'SWAP',
            payload: {
              srcAsset: {
                amount: '30728750000000000',
                type: 'eip155:59144/slip44:60',
                decimals: 18,
                name: 'Ether',
                symbol: 'ETH',
              },
              destAsset: {
                type: 'eip155:42161/slip44:60',
                decimals: 18,
                name: 'Ether',
                symbol: 'ETH',
              },
              txHash:
                '0xdf05bc9f3ac8bf7b315ebb8851818bae4a9f7b451054870f056b23e69c348e57',
            },
            value: 270,
            bonus: {
              bips: 5000,
              bonuses: ['bc66e509-d9e1-488c-be8f-382902d85dd5'],
            },
            accountAddress: '0xb2a0536b4af0fd5CF60025a4918285C554fc1220',
          },
          {
            id: '5Qg1sjvsN6ptDrYhoJDDS514ddg4XHGs7LyS3MNv8neaAkKHYDP4YkK7924XJUjPmDVHm2m9JZaoGSDs5fkRGVDi',
            timestamp: new Date('2025-09-05T21:17:05.000Z'),
            type: 'SWAP',
            payload: {
              srcAsset: {
                amount: '11845437500',
                type: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:So11111111111111111111111111111111111111112',
                decimals: 9,
                name: 'Wrapped SOL',
                symbol: 'wSOL',
              },
              destAsset: {
                amount: '120202993227',
                type: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:AUuCEHQ7sm2i5GmaHrpE961voWcTY8U6mgrkhcV7pump',
                decimals: 6,
                name: 'QuStream',
                symbol: 'QST',
              },
              txHash:
                '5Qg1sjvsN6ptDrYhoJDDS514ddg4XHGs7LyS3MNv8neaAkKHYDP4YkK7924XJUjPmDVHm2m9JZaoGSDs5fkRGVDi',
            },
            value: 2449,
            bonus: {},
            accountAddress: '52ELTRhi3UjvkqbovAUNRtUZMZayLE7dA8pqFUvGQ7vY',
          },
          {
            id: 'sb-0198f907-f293-7592-ba7d-41e245f96a51',
            timestamp: new Date('2025-08-30T03:31:44.444Z'),
            type: 'SIGN_UP_BONUS',
            value: 250,
            bonus: {},
            accountAddress: '0x069060A475c76C77427CcC8CbD7eCB0B293f5beD',
            payload: null,
          },
          {
            id: '59144-0x7d75d4a6fc24667857147753486491b52fc93e1f35574cfe7cb8887f48a81b3a-referral',
            timestamp: new Date('2025-09-04T21:38:10.433Z'),
            type: 'REFERRAL',
            value: 10,
            bonus: null,
            accountAddress: null,
            payload: null,
          },
          {
            id: 'lb-0x069060A475c76C77427CcC8CbD7eCB0B293f5beD-2',
            timestamp: new Date('2025-08-30T03:31:44.453Z'),
            type: 'ONE_TIME_BONUS',
            value: 123,
            bonus: {},
            accountAddress: '0x069060A475c76C77427CcC8CbD7eCB0B293f5beD',
            payload: null,
          },
          {
            id: '0b15b967547b08923c088317914c7539fa1a536e8fdc7581060bc7be809bd9e7',
            timestamp: new Date('2025-08-18T03:01:46.727Z'),
            type: 'PERPS',
            payload: {
              type: 'OPEN_POSITION',
              direction: 'SHORT',
              token: {
                chainId: 1000000000,
                address: 'BIO',
                decimals: 0,
                name: 'BIO',
                symbol: 'BIO',
                iconUrl: 'https://app.hyperliquid.xyz/coins/BIO.svg',
                amount: '287',
              },
            },
            value: 1,
            bonus: {},
            accountAddress: '0xeb74cd5273ca3ECd9C30b66A1Fd14A29F754f27b',
          },
          {
            id: 'ec86ed8589c697e071afa7bfaf8349da5210d61dd8b4c6287b7e56a28cc38051',
            timestamp: new Date('2025-08-17T20:26:55.647Z'),
            type: 'PERPS',
            payload: {
              type: 'CLOSE_POSITION',
              direction: 'LONG',
              token: {
                chainId: 1000000000,
                address: 'SOL',
                decimals: 2,
                name: 'SOL',
                symbol: 'SOL',
                iconUrl: 'https://app.hyperliquid.xyz/coins/SOL.svg',
                amount: '371',
              },
            },
            value: 35,
            bonus: {},
            accountAddress: '0xdf02017a02FaCd13D2E2185f0a2139A2fE54EC82',
          },
          {
            id: '05e6ae8da3bc6faa3722daa8e2f3615d58e56a12a68b0587550875d43e4c9931',
            timestamp: new Date('2025-08-17T20:28:39.145Z'),
            type: 'PERPS',
            payload: {
              type: 'TAKE_PROFIT',
              direction: 'SHORT',
              token: {
                chainId: 1000000000,
                address: 'SOL',
                decimals: 2,
                name: 'SOL',
                symbol: 'SOL',
                iconUrl: 'https://app.hyperliquid.xyz/coins/SOL.svg',
                amount: '483',
              },
            },
            value: 46,
            bonus: {},
            accountAddress: '0x69EAd39431f772Ef6d35A7B712b089e0aEAbB37e',
          },
          {
            id: '40b6ae724da21d9d86701e057f2f6724df308ba143b4346875be8e7fe07c731a',
            timestamp: new Date('2025-08-17T19:35:37.821Z'),
            type: 'PERPS',
            payload: {
              type: 'STOP_LOSS',
              direction: 'LONG',
              token: {
                chainId: 1000000000,
                address: 'SOL',
                decimals: 2,
                name: 'SOL',
                symbol: 'SOL',
                iconUrl: 'https://app.hyperliquid.xyz/coins/SOL.svg',
                amount: '1180',
              },
            },
            value: 113,
            bonus: {},
            accountAddress: '0xd39401Ef877354599285fdb88E301e305E4C173F',
          },
        ],
        has_more: true,
        cursor:
          '59144-0x9e8ebe1f8881cedcc618daf526502571e1159d9bee6e0526ea0ebcacf7fb62f5',
        total_results: 7,
      };
    }
    return {
      results: [
        /* Add events here to test infinite scroll */
      ],
      has_more: false,
      cursor: null,
      total_results: 12,
    };

    /* let url = `/seasons/${seasonId}/points-events`;
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

    return (await response.json()) as PaginatedPointsEventsDto; */
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
