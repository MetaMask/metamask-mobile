import type { Messenger } from '@metamask/messenger';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import { getVersion } from 'react-native-device-info';
import type {
  ClaimInitiateResultDto,
  EarningOriginType,
  EarningsLedgerPageDto,
  EarningsSummaryDto,
  ReferralMeDto,
} from '../types';
import Logger from '../../../../../util/Logger';

const SERVICE_NAME = 'RewardsMoneyDataService';

/** Default timeout for all referral-program API requests. */
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

/** The ledger page size the client asks for. */
export const EARNINGS_LEDGER_PAGE_SIZE = 20;

/**
 * The referral-program API rejected the Hydra bearer token, or none was
 * available. Distinct from a transport failure so the UI can prompt a sign-in
 * rather than a retry.
 */
export class ReferralProgramAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReferralProgramAuthorizationError';
  }
}

/**
 * An address may hold only one open claim. The server answers 409 while a
 * live voucher is outstanding.
 */
export class ClaimAlreadyOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaimAlreadyOpenError';
  }
}

// ─── Action types ─────────────────────────────────────────────────────────────

export interface RewardsMoneyDataServiceGetReferralMeAction {
  type: `${typeof SERVICE_NAME}:getReferralMe`;
  handler: RewardsMoneyDataService['getReferralMe'];
}

export interface RewardsMoneyDataServiceGetEarningsSummaryAction {
  type: `${typeof SERVICE_NAME}:getEarningsSummary`;
  handler: RewardsMoneyDataService['getEarningsSummary'];
}

export interface RewardsMoneyDataServiceGetEarningsLedgerAction {
  type: `${typeof SERVICE_NAME}:getEarningsLedger`;
  handler: RewardsMoneyDataService['getEarningsLedger'];
}

export interface RewardsMoneyDataServiceInitiateClaimAction {
  type: `${typeof SERVICE_NAME}:initiateClaim`;
  handler: RewardsMoneyDataService['initiateClaim'];
}

export type RewardsMoneyDataServiceActions =
  | RewardsMoneyDataServiceGetReferralMeAction
  | RewardsMoneyDataServiceGetEarningsSummaryAction
  | RewardsMoneyDataServiceGetEarningsLedgerAction
  | RewardsMoneyDataServiceInitiateClaimAction;

/**
 * Strips trailing slashes without a regex. `/\/+$/` backtracks super-linearly
 * on a long run of slashes, which Sonar flags as a ReDoS risk; a scan from the
 * end is linear and does the same job.
 *
 * @param url - The URL to trim.
 * @returns The URL with any trailing slashes removed.
 */
function trimTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') {
    end -= 1;
  }
  return url.slice(0, end);
}

/**
 * The referral-program API authenticates with a Hydra bearer token whose `sub`
 * is the profile id, so the data service is allowed to call the
 * AuthenticationController. It deliberately does NOT touch the rewards
 * subscription-token vault.
 */
type AllowedActions =
  AuthenticationController.AuthenticationControllerGetBearerTokenAction;

export type RewardsMoneyDataServiceMessenger = Messenger<
  typeof SERVICE_NAME,
  RewardsMoneyDataServiceActions | AllowedActions,
  never
>;

/**
 * Data service for the referral-program consumer API.
 *
 * Auth is a Hydra `Authorization: Bearer` token whose `sub` is the profile id.
 * This is deliberately NOT the rewards subscription-token vault — the two
 * services authenticate different identities.
 */
export class RewardsMoneyDataService {
  readonly name: typeof SERVICE_NAME = SERVICE_NAME;

  readonly state: null = null;

  readonly #messenger: RewardsMoneyDataServiceMessenger;

  readonly #fetch: typeof fetch;

  readonly #baseUrl: string;

  readonly #locale: string;

  readonly #appType: 'mobile' | 'extension';

  readonly #getBearerToken: () => Promise<string | undefined>;

  constructor({
    messenger,
    fetch: fetchFunction,
    baseUrl,
    getBearerToken,
    appType = 'mobile',
    locale = 'en-US',
  }: {
    messenger: RewardsMoneyDataServiceMessenger;
    fetch: typeof fetch;
    baseUrl: string;
    getBearerToken: () => Promise<string | undefined>;
    appType?: 'mobile' | 'extension';
    locale?: string;
  }) {
    this.#messenger = messenger;
    this.#fetch = fetchFunction;
    this.#baseUrl = trimTrailingSlashes(baseUrl);
    this.#getBearerToken = getBearerToken;
    this.#appType = appType;
    this.#locale = locale;

    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:getReferralMe`,
      this.getReferralMe.bind(this),
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
      `${SERVICE_NAME}:initiateClaim`,
      this.initiateClaim.bind(this),
    );
  }

  /** The resolved referral-program base URL, exposed for diagnostics. */
  getBaseUrl(): string {
    return this.#baseUrl;
  }

  /**
   * The bootstrap read. One call decides which screen renders, which rates it
   * shows, and whether there is a code to share.
   */
  async getReferralMe(): Promise<ReferralMeDto> {
    const response = await this.#makeRequest('/referral/me', { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Get referral me failed: ${response.status}`);
    }

    return (await response.json()) as ReferralMeDto;
  }

  /**
   * Totals and claimability, scoped to `originTypes`. An empty or omitted set
   * means all types.
   */
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

  /**
   * A keyset page of the ledger. The origin-type filter is folded into the
   * cursor server-side, so the filter is only sent on a first page — passing
   * both would risk a 400 for a cursor whose filter disagrees.
   */
  async getEarningsLedger(
    originTypes?: EarningOriginType[],
    cursor?: string | null,
    limit: number = EARNINGS_LEDGER_PAGE_SIZE,
  ): Promise<EarningsLedgerPageDto> {
    const params = new URLSearchParams();
    params.append('limit', String(limit));

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

  /**
   * Opens a claim and returns the signed EIP-3009 voucher. The voucher is
   * valid for 60 seconds, so the caller must be ready to submit immediately.
   */
  async initiateClaim(
    moneyAccountAddress: string,
    originTypes: EarningOriginType[],
  ): Promise<ClaimInitiateResultDto> {
    const response = await this.#makeRequest('/wr/earnings/claim', {
      method: 'POST',
      body: JSON.stringify({
        money_account_address: moneyAccountAddress,
        earning_origin_types: originTypes,
      }),
    });

    if (response.status === 409) {
      throw new ClaimAlreadyOpenError(
        'A claim is already open for this address',
      );
    }

    if (!response.ok) {
      throw new Error(`Initiate claim failed: ${response.status}`);
    }

    return (await response.json()) as ClaimInitiateResultDto;
  }

  async #makeRequest(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      headers['rewards-client-id'] = `${this.#appType}-${getVersion()}`;
    } catch (error) {
      // The client header is diagnostic; a missing app version must not block
      // the request.
      Logger.log(
        'RewardsMoneyDataService: failed to read app version',
        error instanceof Error ? error.message : String(error),
      );
    }

    const token = await this.#getBearerToken();
    if (!token) {
      throw new ReferralProgramAuthorizationError(
        'No bearer token available for the referral program API',
      );
    }
    headers.Authorization = `Bearer ${token}`;

    if (this.#locale) {
      headers['Accept-Language'] = this.#locale;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.#fetch(`${this.#baseUrl}${endpoint}`, {
        credentials: 'omit',
        ...options,
        headers: { ...headers, ...options.headers },
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new ReferralProgramAuthorizationError(
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
