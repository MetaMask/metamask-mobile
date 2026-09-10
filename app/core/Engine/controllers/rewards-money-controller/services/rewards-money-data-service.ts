import type { Messenger } from '@metamask/messenger';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import { getVersion } from 'react-native-device-info';
import type {
  ClaimInitiateResultDto,
  EarningOriginType,
  ClaimHistoryPageDto,
  EarningsLedgerPageDto,
  EarningsSummaryDto,
  ReferralMeDto,
} from '../types';
import Logger from '../../../../../util/Logger';

const SERVICE_NAME = 'RewardsMoneyDataService';

/** Default timeout for all Rewards Money API requests. */
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

/** Set once the profile id has been logged for this app session (dev only). */
let hasLoggedProfileId = false;

/**
 * The Rewards Money bearer token's `sub` claim is the profile id. Decoded
 * locally (no verification) purely so a local test session can read it off
 * the Metro log without a separate debugger.
 */
function decodeJwtSub(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    const sub = (JSON.parse(json) as { sub?: string }).sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}

/** The ledger page size the client asks for. */
export const EARNINGS_LEDGER_PAGE_SIZE = 20;

/** The server clamps `limit` to 1..100; 20 matches the ledger's page size. */
export const CLAIM_HISTORY_PAGE_SIZE = 20;

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

export interface RewardsMoneyDataServiceGetClaimHistoryAction {
  type: `${typeof SERVICE_NAME}:getClaimHistory`;
  handler: RewardsMoneyDataService['getClaimHistory'];
}

export interface RewardsMoneyDataServiceInitiateClaimAction {
  type: `${typeof SERVICE_NAME}:initiateClaim`;
  handler: RewardsMoneyDataService['initiateClaim'];
}

export type RewardsMoneyDataServiceActions =
  | RewardsMoneyDataServiceGetReferralMeAction
  | RewardsMoneyDataServiceGetEarningsSummaryAction
  | RewardsMoneyDataServiceGetEarningsLedgerAction
  | RewardsMoneyDataServiceGetClaimHistoryAction
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
 * The Rewards Money API authenticates with a Hydra bearer token whose `sub`
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
 * Data service for the Rewards Money consumer API.
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
      `${SERVICE_NAME}:getClaimHistory`,
      this.getClaimHistory.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:initiateClaim`,
      this.initiateClaim.bind(this),
    );
  }

  /** The resolved Rewards Money base URL, exposed for diagnostics. */
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
  /**
   * The caller's claim history, newest first.
   *
   * Read-only and unfiltered: unlike the ledger there are no origin-type facets
   * to carry, so a cursor page needs nothing but the cursor.
   *
   * @param cursor - Opaque cursor from a previous page, or null for the first.
   * @param limit - Page size; the server clamps to 1..100.
   * @returns One page of claims.
   */
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
      throw new RewardsMoneyAuthorizationError(
        'No bearer token available for the Rewards Money API',
      );
    }
    headers.Authorization = `Bearer ${token}`;

    if (__DEV__ && !hasLoggedProfileId) {
      const profileId = decodeJwtSub(token);
      if (profileId) {
        hasLoggedProfileId = true;
        Logger.log('RewardsMoneyDataService: profile_id (JWT sub)', profileId);
      }
    }

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
