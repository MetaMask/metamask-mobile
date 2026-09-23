import type { Messenger } from '@metamask/messenger';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import { getVersion } from 'react-native-device-info';
import type {
  ClaimDto,
  ClaimHistoryPageDto,
  CommissionsPageDto,
  EarningOriginType,
  EarningsLedgerPageDto,
  EarningsSummaryDto,
  OwnReferralCodesDto,
  ReferralFunnelDto,
  ReferralMeDto,
  ReferrerOriginType,
} from '../types';
import {
  canChangeRewardsMoneyEnvUrl,
  getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv,
} from '../utils/rewards-money-api-url';
import Logger from '../../../../../util/Logger';

const SERVICE_NAME = 'RewardsMoneyDataService';

/** Default timeout for all Rewards Money API requests. */
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

/** The ledger page size the client asks for. */
export const EARNINGS_LEDGER_PAGE_SIZE = 20;

/** The server clamps `limit` to 1..100; 20 matches the ledger's page size. */
export const CLAIM_HISTORY_PAGE_SIZE = 20;

/** The server clamps `limit` to 1..100; 20 matches the ledger's page size. */
export const COMMISSIONS_PAGE_SIZE = 20;

/**
 * The Rewards Money API rejected the Hydra bearer token, or none was
 * available. Distinct from a transport failure so the UI can prompt a sign-in
 * rather than a retry.
 */
export class RewardsMoneyAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RewardsMoneyAuthorizationError';
  }
}

// ─── Action types ─────────────────────────────────────────────────────────────

export interface RewardsMoneyDataServiceGetReferralMeAction {
  type: `${typeof SERVICE_NAME}:getReferralMe`;
  handler: RewardsMoneyDataService['getReferralMe'];
}

export interface RewardsMoneyDataServiceGetReferralFunnelAction {
  type: `${typeof SERVICE_NAME}:getReferralFunnel`;
  handler: RewardsMoneyDataService['getReferralFunnel'];
}

export interface RewardsMoneyDataServiceGetReferralCodesAction {
  type: `${typeof SERVICE_NAME}:getReferralCodes`;
  handler: RewardsMoneyDataService['getReferralCodes'];
}

export interface RewardsMoneyDataServiceValidateReferralCodeAction {
  type: `${typeof SERVICE_NAME}:validateReferralCode`;
  handler: RewardsMoneyDataService['validateReferralCode'];
}

export interface RewardsMoneyDataServiceGetEarningsSummaryAction {
  type: `${typeof SERVICE_NAME}:getEarningsSummary`;
  handler: RewardsMoneyDataService['getEarningsSummary'];
}

export interface RewardsMoneyDataServiceGetEarningsLedgerAction {
  type: `${typeof SERVICE_NAME}:getEarningsLedger`;
  handler: RewardsMoneyDataService['getEarningsLedger'];
}

export interface RewardsMoneyDataServiceGetClaimHistoryAction {
  type: `${typeof SERVICE_NAME}:getClaimHistory`;
  handler: RewardsMoneyDataService['getClaimHistory'];
}

export interface RewardsMoneyDataServiceGetCommissionsAction {
  type: `${typeof SERVICE_NAME}:getCommissions`;
  handler: RewardsMoneyDataService['getCommissions'];
}

export interface RewardsMoneyDataServiceGetClaimByIdAction {
  type: `${typeof SERVICE_NAME}:getClaimById`;
  handler: RewardsMoneyDataService['getClaimById'];
}

export interface RewardsMoneyDataServiceGetRewardsMoneyEnvUrlAction {
  type: `${typeof SERVICE_NAME}:getRewardsMoneyEnvUrl`;
  handler: RewardsMoneyDataService['getRewardsMoneyEnvUrl'];
}

export interface RewardsMoneyDataServiceCanChangeRewardsMoneyEnvUrlAction {
  type: `${typeof SERVICE_NAME}:canChangeRewardsMoneyEnvUrl`;
  handler: RewardsMoneyDataService['canChangeRewardsMoneyEnvUrl'];
}

export interface RewardsMoneyDataServiceSetRewardsMoneyEnvUrlAction {
  type: `${typeof SERVICE_NAME}:setRewardsMoneyEnvUrl`;
  handler: RewardsMoneyDataService['setRewardsMoneyEnvUrl'];
}

export interface RewardsMoneyDataServiceGetDefaultRewardsMoneyEnvUrlAction {
  type: `${typeof SERVICE_NAME}:getDefaultRewardsMoneyEnvUrl`;
  handler: RewardsMoneyDataService['getDefaultRewardsMoneyEnvUrl'];
}

export type RewardsMoneyDataServiceActions =
  | RewardsMoneyDataServiceGetReferralMeAction
  | RewardsMoneyDataServiceGetReferralFunnelAction
  | RewardsMoneyDataServiceGetReferralCodesAction
  | RewardsMoneyDataServiceValidateReferralCodeAction
  | RewardsMoneyDataServiceGetEarningsSummaryAction
  | RewardsMoneyDataServiceGetEarningsLedgerAction
  | RewardsMoneyDataServiceGetClaimHistoryAction
  | RewardsMoneyDataServiceGetCommissionsAction
  | RewardsMoneyDataServiceGetClaimByIdAction
  | RewardsMoneyDataServiceGetRewardsMoneyEnvUrlAction
  | RewardsMoneyDataServiceCanChangeRewardsMoneyEnvUrlAction
  | RewardsMoneyDataServiceSetRewardsMoneyEnvUrlAction
  | RewardsMoneyDataServiceGetDefaultRewardsMoneyEnvUrlAction;

type AllowedActions =
  AuthenticationController.AuthenticationControllerGetBearerTokenAction;

export type RewardsMoneyDataServiceMessenger = Messenger<
  typeof SERVICE_NAME,
  RewardsMoneyDataServiceActions | AllowedActions,
  never
>;

/**
 * Strips trailing slashes without a regex. `/\/+$/` backtracks super-linearly
 * on a long run of slashes; a scan from the end is linear.
 */
function trimTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') {
    end -= 1;
  }
  return url.slice(0, end);
}

/**
 * Data service for the Rewards Money consumer API.
 *
 * Auth is a Hydra `Authorization: Bearer` token whose `sub` is the profile id.
 * This is deliberately NOT the rewards subscription-token vault.
 */
export class RewardsMoneyDataService {
  readonly name: typeof SERVICE_NAME = SERVICE_NAME;

  readonly state: null = null;

  readonly #messenger: RewardsMoneyDataServiceMessenger;

  readonly #fetch: typeof fetch;

  readonly #locale: string;

  readonly #appType: 'mobile' | 'extension';

  readonly #getBearerToken: () => Promise<string | undefined>;

  #rewardsMoneyApiUrl: string | null = null;

  constructor({
    messenger,
    fetch: fetchFunction,
    getBearerToken,
    appType = 'mobile',
    locale = 'en-US',
  }: {
    messenger: RewardsMoneyDataServiceMessenger;
    fetch: typeof fetch;
    getBearerToken: () => Promise<string | undefined>;
    appType?: 'mobile' | 'extension';
    locale?: string;
  }) {
    this.#messenger = messenger;
    this.#fetch = fetchFunction;
    this.#getBearerToken = getBearerToken;
    this.#appType = appType;
    this.#locale = locale;

    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getReferralMe`,
      this.getReferralMe.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getReferralFunnel`,
      this.getReferralFunnel.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getReferralCodes`,
      this.getReferralCodes.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:validateReferralCode`,
      this.validateReferralCode.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getEarningsSummary`,
      this.getEarningsSummary.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getEarningsLedger`,
      this.getEarningsLedger.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getClaimHistory`,
      this.getClaimHistory.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getCommissions`,
      this.getCommissions.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getClaimById`,
      this.getClaimById.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getRewardsMoneyEnvUrl`,
      this.getRewardsMoneyEnvUrl.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:canChangeRewardsMoneyEnvUrl`,
      this.canChangeRewardsMoneyEnvUrl.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:setRewardsMoneyEnvUrl`,
      this.setRewardsMoneyEnvUrl.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getDefaultRewardsMoneyEnvUrl`,
      this.getDefaultRewardsMoneyEnvUrl.bind(this),
    );
  }

  getRewardsMoneyEnvUrl(): string {
    const [defaultUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv(
        process.env.METAMASK_ENVIRONMENT,
      );
    if (!canChange) {
      return defaultUrl;
    }
    return this.#rewardsMoneyApiUrl ?? defaultUrl;
  }

  canChangeRewardsMoneyEnvUrl(): boolean {
    return canChangeRewardsMoneyEnvUrl(process.env.METAMASK_ENVIRONMENT);
  }

  setRewardsMoneyEnvUrl(url: string): void {
    if (this.canChangeRewardsMoneyEnvUrl()) {
      this.#rewardsMoneyApiUrl = url;
      Logger.log(`RewardsMoneyDataService: env switched to ${url}`);
    } else {
      this.#rewardsMoneyApiUrl = null;
    }
  }

  getDefaultRewardsMoneyEnvUrl(): string {
    const [defaultUrl] = getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv(
      process.env.METAMASK_ENVIRONMENT,
    );
    return defaultUrl;
  }

  async getReferralMe(): Promise<ReferralMeDto> {
    const response = await this.#makeRequest('/referral/me', { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Get referral me failed: ${response.status}`);
    }

    return (await response.json()) as ReferralMeDto;
  }

  async getReferralFunnel(): Promise<ReferralFunnelDto> {
    const response = await this.#makeRequest('/referral/me/funnel', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Get referral funnel failed: ${response.status}`);
    }

    return (await response.json()) as ReferralFunnelDto;
  }

  async getReferralCodes(): Promise<OwnReferralCodesDto> {
    const response = await this.#makeRequest('/referral/me/referral-code', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Get referral codes failed: ${response.status}`);
    }

    return (await response.json()) as OwnReferralCodesDto;
  }

  /**
   * Public code check — never attaches Authorization.
   */
  async validateReferralCode(code: string): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    params.append('code', code);

    const response = await this.#makeRequest(
      `/referral/validate?${params.toString()}`,
      { method: 'GET' },
      DEFAULT_REQUEST_TIMEOUT_MS,
      false,
    );

    if (!response.ok) {
      throw new Error(`Validate referral code failed: ${response.status}`);
    }

    return (await response.json()) as { success: boolean };
  }

  async getEarningsSummary(
    originTypes?: EarningOriginType[],
  ): Promise<EarningsSummaryDto> {
    const query = buildOriginTypeQuery(originTypes);
    const response = await this.#makeRequest(`/earnings/summary${query}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Get earnings summary failed: ${response.status}`);
    }

    return (await response.json()) as EarningsSummaryDto;
  }

  async getEarningsLedger(
    originTypes?: EarningOriginType[],
    cursor?: string | null,
    limit: number = EARNINGS_LEDGER_PAGE_SIZE,
    includeClaims: boolean = true,
  ): Promise<EarningsLedgerPageDto> {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    // Not encoded in the cursor — must be sent on every page of a walk.
    params.append('include_claims', includeClaims ? 'true' : 'false');

    if (cursor) {
      params.append('cursor', cursor);
    } else {
      for (const originType of originTypes ?? []) {
        params.append('earning_origin_type', originType);
      }
    }

    const response = await this.#makeRequest(
      `/earnings/ledger?${params.toString()}`,
      { method: 'GET' },
    );

    if (!response.ok) {
      throw new Error(`Get earnings ledger failed: ${response.status}`);
    }

    return (await response.json()) as EarningsLedgerPageDto;
  }

  async getCommissions(
    originType?: ReferrerOriginType,
    cursor?: string | null,
    limit: number = COMMISSIONS_PAGE_SIZE,
    fromDay?: string,
  ): Promise<CommissionsPageDto> {
    const params = new URLSearchParams();
    params.append('limit', String(limit));

    // Unlike the ledger, the commissions cursor stamps the filter AND is checked
    // against the request: paging with the cursor but without the original
    // `earning_origin_type` is a 400, so the filter is resent on every page.
    if (originType) {
      params.append('earning_origin_type', originType);
    }

    if (cursor) {
      // The cursor's own `from_day` wins server-side; resending it is noise.
      params.append('cursor', cursor);
    } else if (fromDay) {
      params.append('from_day', fromDay);
    }

    const response = await this.#makeRequest(
      `/referral/me/commissions?${params.toString()}`,
      { method: 'GET' },
    );

    if (!response.ok) {
      throw new Error(`Get commissions failed: ${response.status}`);
    }

    return (await response.json()) as CommissionsPageDto;
  }

  async getClaimHistory(
    cursor?: string | null,
    limit: number = CLAIM_HISTORY_PAGE_SIZE,
  ): Promise<ClaimHistoryPageDto> {
    const params = new URLSearchParams();
    params.append('limit', String(limit));

    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await this.#makeRequest(
      `/earnings/claim/me?${params.toString()}`,
      { method: 'GET' },
    );

    if (!response.ok) {
      throw new Error(`Get claim history failed: ${response.status}`);
    }

    return (await response.json()) as ClaimHistoryPageDto;
  }

  async getClaimById(claimId: string): Promise<ClaimDto> {
    const response = await this.#makeRequest(`/earnings/claim/${claimId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Get claim by id failed: ${response.status}`);
    }

    return (await response.json()) as ClaimDto;
  }

  async #makeRequest(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
    authenticated: boolean = true,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      headers['rewards-client-id'] = `${this.#appType}-${getVersion()}`;
    } catch (error) {
      Logger.log(
        'RewardsMoneyDataService: failed to read app version',
        error instanceof Error ? error.message : String(error),
      );
    }

    if (authenticated) {
      const token = await this.#getBearerToken();
      if (!token) {
        throw new RewardsMoneyAuthorizationError(
          'No bearer token available for the Rewards Money API',
        );
      }
      headers.Authorization = `Bearer ${token}`;
    }

    if (this.#locale) {
      headers['Accept-Language'] = this.#locale;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const baseUrl = trimTrailingSlashes(this.getRewardsMoneyEnvUrl());

    try {
      const response = await this.#fetch(`${baseUrl}${endpoint}`, {
        credentials: 'omit',
        ...options,
        headers: { ...headers, ...options.headers },
        signal: controller.signal,
      });

      if (
        authenticated &&
        (response.status === 401 || response.status === 403)
      ) {
        throw new RewardsMoneyAuthorizationError(
          `Authorization failed: ${response.status}`,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Builds the repeatable `?earning_origin_type=` query. Returns an empty string
 * for an empty or omitted set, which the server reads as "all types".
 */
export function buildOriginTypeQuery(
  originTypes?: EarningOriginType[],
): string {
  if (!originTypes || originTypes.length === 0) {
    return '';
  }
  const params = new URLSearchParams();
  for (const originType of originTypes) {
    params.append('earning_origin_type', originType);
  }
  return `?${params.toString()}`;
}
