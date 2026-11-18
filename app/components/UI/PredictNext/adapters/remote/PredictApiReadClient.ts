import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import type {
  DeviceAuthHeader,
  SignOperationInput,
  SignedOperation,
} from '../../auth/signing/signOperationTypes';
import {
  VENUE_READ_HEADER,
  type VenueIntentName,
} from '../../auth/venueSigningProfiles';
import type {
  FetchFeedParams,
  FetchOrderCommitParams,
  FetchOrderPreviewParams,
  FetchPortfolioPageParams,
  FetchPositionsParams,
  FetchSearchParams,
  PredictDepositParams,
  PredictDepositTransferParams,
  PredictEntityId,
  PredictFeedId,
  PredictMarketHistoryRange,
  PredictAmount,
  PredictReadOptions,
  PredictVenueId,
} from '../../types';
import {
  sendSigned,
  sendSignedRead,
  VenueReadBudgetExhaustedError,
  VenueSigningRefusedError,
  VenueSigningUnavailableError,
  type ProposedRead,
  type SignOperation,
  type SignRead,
} from './signedVenueCall';

export interface PredictApiReadTransport {
  fetchVenueStatus(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  /** The deployment's catalog for the Venue, including which product actions
   * it actually serves. Bearer-only: it is client configuration, not account
   * data. */
  fetchVenueCatalog(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchBalance(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchPositions(
    venueId: PredictVenueId,
    params: FetchPositionsParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchPortfolioSummary(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchActivity(
    venueId: PredictVenueId,
    params: FetchPortfolioPageParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchFeed(
    venueId: PredictVenueId,
    feedId: PredictFeedId,
    params: FetchFeedParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchEvent(
    venueId: PredictVenueId,
    eventId: PredictEntityId,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchMarketHistory(
    venueId: PredictVenueId,
    marketId: PredictEntityId,
    range: PredictMarketHistoryRange,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  searchEvents(
    venueId: PredictVenueId,
    params: FetchSearchParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchOrderPreview(
    venueId: PredictVenueId,
    params: FetchOrderPreviewParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  commitOrder(
    venueId: PredictVenueId,
    params: FetchOrderCommitParams,
    options?: PredictReadOptions,
    signing?: SignOperationInput,
  ): Promise<unknown>;
  /** The operation's receipt for an approved Preview. Device-signs the
   * venue order scan the backend proposes while it reconciles. */
  observeOrder(
    venueId: PredictVenueId,
    params: FetchOrderCommitParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  listUnresolvedOrders(
    venueId: PredictVenueId,
    params: FetchPortfolioPageParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchWithdrawPreview(
    venueId: PredictVenueId,
    params: FetchWithdrawPreviewBody,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  commitWithdraw(
    venueId: PredictVenueId,
    previewId: string,
    options?: PredictReadOptions,
    onDispatch?: () => void,
  ): Promise<unknown>;
  observeWithdraw(
    venueId: PredictVenueId,
    previewId: string,
    options?: PredictReadOptions,
  ): Promise<unknown>;

  /** Starts a deposit without a signature. The route stores nothing and
   * answers the values to sign, or the deposit a repeated key created. */
  startDeposit(
    venueId: PredictVenueId,
    params: PredictDepositParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  /** Creates the deposit: signs `funding.deposit` from `signing` and sends
   * the rendered bytes as `signedBody`. */
  createDeposit(
    venueId: PredictVenueId,
    params: PredictDepositParams,
    options?: PredictReadOptions,
    signing?: SignOperationInput,
  ): Promise<unknown>;
  getDeposit(
    venueId: PredictVenueId,
    operationId: string,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  listOpenDeposits(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  reportDepositTransfer(
    venueId: PredictVenueId,
    operationId: string,
    params: PredictDepositTransferParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  cancelDeposit(
    venueId: PredictVenueId,
    operationId: string,
    options?: PredictReadOptions,
  ): Promise<unknown>;
}

/** Wire shape of a Withdraw Preview request: exactly one of a fixed amount or
 * a sweep. The backend's strict schema rejects any other key, so a client
 * identity, destination, or idempotency key can never be smuggled in. */
export type FetchWithdrawPreviewBody =
  | { amount: PredictAmount }
  | { sweepAll: true };

/** A JSON body this client posts. Undefined posts no body at all. */
type PredictApiPostBody =
  | FetchOrderPreviewParams
  | FetchOrderCommitParams
  | FetchWithdrawPreviewBody
  | PredictDepositParams
  | PredictDepositTransferParams
  | Record<string, never>
  | undefined;

type PredictApiReadQueryParams = FetchFeedParams &
  Partial<FetchSearchParams> & {
    range?: PredictMarketHistoryRange;
    status?: string;
    sort?: FetchPositionsParams['sort'];
    state?: 'unresolved' | 'open';
  };

export interface PredictApiReadClientOptions {
  baseUrl?: string;
  clientVersion: string;
  fetch?: typeof fetch;
  getBearerToken: () => Promise<string | undefined>;
  /**
   * Renders and signs a canonical intent from the verified signing profile
   * and returns the `Venue-Authorization` header. Throws `TemplateError`
   * when the profile does not allow the request, and returns undefined when
   * signing is unavailable. Without it, device-signed commits cannot be
   * sent.
   */
  signOperation?: SignOperation;
  /**
   * Signs one server-proposed read; the Engine checks it against the
   * profile's allowlist. Returns undefined when signing is unavailable.
   */
  signRead?: SignRead;
  /** Drops the cached A2T after `venue_authorization_invalid`. */
  invalidateSigningSession?: () => void;
}

/** A caller-visible cancellation, never a venue or transport failure. */
const abortedError = (): Error => {
  const aborted = new Error('The request was aborted.');
  aborted.name = 'AbortError';
  return aborted;
};

const parseBaseUrl = (baseUrl?: string): URL | undefined => {
  if (!baseUrl) {
    return undefined;
  }
  try {
    return new URL(baseUrl);
  } catch {
    return undefined;
  }
};

export class PredictHttpError extends Error {
  readonly status: number;
  /** Canonical error code from the response body, when the backend sends one. */
  readonly bodyCode?: string;
  /** Dispatch evidence for local transport failures; absent for HTTP errors. */
  readonly requestSent?: boolean;

  constructor(status: number, bodyCode?: string) {
    super(`Predict API request failed with status ${status}.`);
    this.name = 'PredictHttpError';
    this.status = status;
    this.bodyCode = bodyCode;
  }
}

/** No fetch was dispatched by this invocation. This says nothing about
 * an earlier invocation or a different route (in particular, a mutation
 * whose result is now being observed). */
export class PredictRequestNotSentError extends PredictHttpError {
  readonly requestSent = false;
  readonly cause?: VenueSigningRefusedError | VenueSigningUnavailableError;

  constructor(
    bodyCode: string,
    cause?: VenueSigningRefusedError | VenueSigningUnavailableError,
  ) {
    super(400, bodyCode);
    this.name = 'PredictRequestNotSentError';
    this.cause = cause;
  }
}

/** Signing failed after this exchange had already dispatched a request. */
export class PredictSigningError extends PredictHttpError {
  readonly requestSent = true;
  readonly cause: VenueSigningRefusedError | VenueSigningUnavailableError;

  constructor(cause: VenueSigningRefusedError | VenueSigningUnavailableError) {
    super(
      400,
      cause instanceof VenueSigningRefusedError
        ? 'venue_signing_refused'
        : 'venue_signing_unavailable',
    );
    this.name = 'PredictSigningError';
    this.cause = cause;
  }
}

/** Bounded signed read work was sent, but needs a later observe/read call.
 * The backend retains its challenge and cursor; never restart a mutation. */
export class PredictReadBudgetExhaustedError extends PredictHttpError {
  readonly requestSent = true;
  readonly cause: VenueReadBudgetExhaustedError;

  constructor(cause: VenueReadBudgetExhaustedError) {
    super(503, 'venue_read_budget_exhausted');
    this.name = 'PredictReadBudgetExhaustedError';
    this.cause = cause;
  }
}

export class PredictApiReadClient implements PredictApiReadTransport {
  readonly #baseUrl?: URL;
  readonly #clientVersion: string;
  readonly #fetch: typeof fetch;
  readonly #getBearerToken: () => Promise<string | undefined>;
  readonly #signOperation?: SignOperation;
  readonly #signRead?: SignRead;
  readonly #invalidateSigningSession?: () => void;

  constructor({
    baseUrl,
    clientVersion,
    fetch: fetchFn = global.fetch,
    getBearerToken,
    signOperation,
    signRead,
    invalidateSigningSession,
  }: PredictApiReadClientOptions) {
    this.#baseUrl = parseBaseUrl(baseUrl);
    this.#clientVersion = clientVersion;
    this.#fetch = fetchFn;
    this.#getBearerToken = getBearerToken;
    this.#signOperation = signOperation;
    this.#signRead = signRead;
    this.#invalidateSigningSession = invalidateSigningSession;
  }

  fetchVenueStatus(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(['v1', 'venues', venueId, 'status'], undefined, options);
  }

  fetchVenueCatalog(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(['v1', 'venues', venueId, 'catalog'], undefined, options);
  }

  fetchBalance(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    // The balance is the user's own venue balance, so it is device-signed.
    return this.#getSigned(
      ['v1', 'venues', venueId, 'balance'],
      undefined,
      options,
    );
  }

  fetchPositions(
    venueId: PredictVenueId,
    { status, ...params }: FetchPositionsParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#getSigned(
      ['v1', 'venues', venueId, 'positions'],
      // The route takes the status filter as a comma-separated list.
      { ...params, status: status?.length ? status.join(',') : undefined },
      options,
    );
  }

  fetchPortfolioSummary(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#getSigned(
      ['v1', 'venues', venueId, 'portfolio', 'summary'],
      undefined,
      options,
    );
  }

  fetchActivity(
    venueId: PredictVenueId,
    params: FetchPortfolioPageParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#getSigned(
      ['v1', 'venues', venueId, 'activity'],
      params,
      options,
    );
  }

  fetchFeed(
    venueId: PredictVenueId,
    feedId: PredictFeedId,
    params: FetchFeedParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(
      ['v1', 'venues', venueId, 'feeds', feedId],
      params,
      options,
    );
  }

  fetchEvent(
    venueId: PredictVenueId,
    eventId: PredictEntityId,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(
      ['v1', 'venues', venueId, 'events', eventId],
      undefined,
      options,
    );
  }

  fetchMarketHistory(
    venueId: PredictVenueId,
    marketId: PredictEntityId,
    range: PredictMarketHistoryRange,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(
      ['v1', 'venues', venueId, 'markets', marketId, 'history'],
      { range },
      options,
    );
  }

  searchEvents(
    venueId: PredictVenueId,
    params: FetchSearchParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(['v1', 'venues', venueId, 'search'], params, options);
  }

  /**
   * Quotes one Order Preview. Bearer-only: the quote prices a hypothetical
   * order and signs nothing, so the envelope is not on it. The preview
   * stores the phone-generated `idempotencyKey` as `client_order_id`.
   */
  fetchOrderPreview(
    venueId: PredictVenueId,
    params: FetchOrderPreviewParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#postAuthenticated(
      ['v1', 'venues', venueId, 'orders', 'preview'],
      params,
      options,
    );
  }

  /**
   * Commits an approved Order Preview. The Preview reference rides in the
   * path; the body is exactly the `create_order` bytes the phone rendered
   * and signed from `signing`, which the backend relays to the venue
   * unchanged.
   */
  async commitOrder(
    venueId: PredictVenueId,
    params: FetchOrderCommitParams,
    options?: PredictReadOptions,
    signing?: SignOperationInput,
  ): Promise<unknown> {
    if (!signing) {
      throw new PredictRequestNotSentError('venue_signing_unavailable');
    }
    return this.#postSigned(
      'order.place',
      ['v1', 'venues', venueId, 'orders', params.previewId, 'commit'],
      options,
      signing,
    );
  }

  /**
   * The operation's receipt for an approved Preview: bearer-only while the
   * outcome is known, a device-signed venue order scan while the backend
   * reconciles an ambiguous submission. Never submits anything.
   */
  observeOrder(
    venueId: PredictVenueId,
    params: FetchOrderCommitParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#getSigned(
      ['v1', 'venues', venueId, 'orders', params.previewId],
      undefined,
      options,
    );
  }

  /** Discovery never asks for a venue signature or submits an Order. */
  listUnresolvedOrders(
    venueId: PredictVenueId,
    params: FetchPortfolioPageParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(
      ['v1', 'venues', venueId, 'orders'],
      { ...params, state: 'unresolved' },
      options,
    );
  }

  /**
   * Quotes one Withdraw Preview. Bearer-only: the backend resolves the payout
   * destination and owns the idempotency key, so the phone sends the amount
   * shape and nothing else.
   */
  fetchWithdrawPreview(
    venueId: PredictVenueId,
    params: FetchWithdrawPreviewBody,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#postAuthenticated(
      ['v1', 'venues', venueId, 'withdrawals', 'preview'],
      params,
      options,
    );
  }

  /**
   * The first deposit call: bearer-only, with no signature. The route
   * stores nothing and calls nothing. It answers the `sign_request` step,
   * or the stored deposit when `clientOperationId` was used before.
   */
  startDeposit(
    venueId: PredictVenueId,
    params: PredictDepositParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#postAuthenticated(
      ['v1', 'venues', venueId, 'deposits'],
      { amount: params.amount, clientOperationId: params.clientOperationId },
      options,
    );
  }

  /**
   * Commits a Withdraw Preview by reference only. The body is `{}`: every
   * executable detail comes from the stored, expiring Preview the
   * authenticated profile owns.
   */
  commitWithdraw(
    venueId: PredictVenueId,
    previewId: string,
    options?: PredictReadOptions,
    onDispatch?: () => void,
  ): Promise<unknown> {
    return this.#postAuthenticated(
      ['v1', 'venues', venueId, 'withdrawals', previewId, 'commit'],
      {},
      options,
      onDispatch,
    );
  }

  /**
   * The second deposit call. The Engine renders and signs the
   * `funding.deposit` address request from `signing`; the body carries the
   * exact rendered bytes as `signedBody`, which the backend relays to the
   * venue unchanged.
   */
  async createDeposit(
    venueId: PredictVenueId,
    params: PredictDepositParams,
    options?: PredictReadOptions,
    signing?: SignOperationInput,
  ): Promise<unknown> {
    if (!signing) {
      throw new PredictRequestNotSentError('venue_signing_unavailable');
    }
    return this.#postSigned(
      'funding.deposit',
      ['v1', 'venues', venueId, 'deposits'],
      options,
      signing,
      (signed) =>
        JSON.stringify({
          amount: params.amount,
          clientOperationId: params.clientOperationId,
          signedBody: signed.body,
        }),
    );
  }

  /** One deposit of the Predict User. Reads the backend's records only. */
  getDeposit(
    venueId: PredictVenueId,
    operationId: string,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(
      ['v1', 'venues', venueId, 'deposits', operationId],
      undefined,
      options,
    );
  }

  /** The withdrawal's receipt. Never submits: a `pending` or `processing`
   * operation is resolved from the backend's own venue reads. */
  observeWithdraw(
    venueId: PredictVenueId,
    previewId: string,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(
      ['v1', 'venues', venueId, 'withdrawals', previewId],
      undefined,
      options,
    );
  }

  /** The Predict User's deposits that are not final yet, oldest first. */
  listOpenDeposits(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(
      ['v1', 'venues', venueId, 'deposits'],
      { state: 'open' },
      options,
    );
  }

  /** Reports the hash of the transfer the Predict User's wallet sent. */
  reportDepositTransfer(
    venueId: PredictVenueId,
    operationId: string,
    params: PredictDepositTransferParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#postAuthenticated(
      ['v1', 'venues', venueId, 'deposits', operationId, 'transfer'],
      { txHash: params.txHash, chainId: params.chainId },
      options,
    );
  }

  /** Cancels a deposit that waits for a transfer. The route takes no body. */
  cancelDeposit(
    venueId: PredictVenueId,
    operationId: string,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#postAuthenticated(
      ['v1', 'venues', venueId, 'deposits', operationId, 'cancel'],
      undefined,
      options,
    );
  }

  /**
   * Every predict-api route requires a bearer token, so one is resolved for
   * each request rather than per endpoint.
   */
  async #resolveBearerToken(): Promise<string> {
    // A missing or failing token provider is an authentication failure, not a
    // malformed response. The provider's error never reaches the caller. It is
    // logged instead, so a locked wallet or a broken provider can be told apart
    // from a provider that returned no token.
    const token = await this.#getBearerToken().catch((error: unknown) => {
      Logger.error(
        ensureError(error, 'PredictApiReadClient.resolveBearerToken'),
        'PredictNext: failed to get the Predict API bearer token',
      );
      return undefined;
    });
    if (!token?.trim()) {
      throw new PredictHttpError(401);
    }
    return token;
  }

  /**
   * Two-phase signed read (ADR-0004): the first GET is bearer-only; a 200
   * `sign_required` body names the one venue GET the route needs, which the
   * Engine checks against the profile's read allowlist and signs. The phone
   * re-calls the SAME route URL with the envelope and the signed GET's
   * coordinates. Pagination is the route's own cursor: every page is a new
   * read that goes through the same check.
   */
  async #getSigned(
    segments: readonly string[],
    params: PredictApiReadQueryParams | undefined,
    options: PredictReadOptions | undefined,
  ): Promise<unknown> {
    const bearerToken = await this.#resolveBearerToken();
    const response = await this.#getSignedOnce((deviceAuth, signed) =>
      this.#fetchRead(
        segments,
        params,
        options,
        bearerToken,
        deviceAuth,
        signed,
      ),
    );
    return this.#parseBody(response);
  }

  async #get(
    segments: readonly string[],
    params?: PredictApiReadQueryParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    const bearerToken = await this.#resolveBearerToken();
    const response = await this.#fetchRead(
      segments,
      params,
      options,
      bearerToken,
    );
    return this.#parseBody(response);
  }

  /** One GET to a read route, with the envelope and the signed venue GET
   * when signed. */
  #fetchRead(
    segments: readonly string[],
    params: PredictApiReadQueryParams | undefined,
    options: PredictReadOptions | undefined,
    bearerToken: string,
    deviceAuth?: DeviceAuthHeader,
    signed?: ProposedRead,
  ): Promise<Response> {
    // A read aborted while its token or signature resolved must not go out
    // either: an observation can replay a stored submission.
    if (options?.signal?.aborted) {
      throw abortedError();
    }
    const url = new URL(
      segments.map(encodeURIComponent).join('/'),
      this.#baseUrlWithTrailingSlash(),
    );
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    return this.#fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-metamask-clientproduct': 'metamask-mobile',
        'x-metamask-clientversion': this.#clientVersion,
        Authorization: `Bearer ${bearerToken}`,
        ...(deviceAuth ? { [deviceAuth.name]: deviceAuth.value } : {}),
        ...(deviceAuth && signed
          ? {
              [VENUE_READ_HEADER]: signed.query
                ? `${signed.path}?${signed.query}`
                : signed.path,
            }
          : {}),
      },
      signal: options?.signal,
    });
  }

  /**
   * The two-phase exchange of one read: send bearer-only; when the 200 body
   * proposes a venue GET, have the Engine check and sign it, and re-call the
   * SAME route URL with the envelope and the signed GET. A response that
   * says the signature or the A2T is stale is proposed and signed again
   * once; a second failure is the caller's error. Anything the proposal flow
   * does not describe — an error status, an unexpected body — is returned
   * as-is, and never a 4XX acts as signing control flow.
   */
  async #getSignedOnce(
    send: (
      deviceAuth?: DeviceAuthHeader,
      signed?: ProposedRead,
    ) => Promise<Response>,
  ): Promise<Response> {
    const signRead = this.#signRead;
    if (!signRead) {
      throw new PredictRequestNotSentError('venue_signing_unavailable');
    }
    try {
      return await sendSignedRead(
        {
          signRead,
          invalidateSigningSession: () => this.#invalidateSigningSession?.(),
        },
        send,
        async (response) => ({
          status: response.status,
          code: response.ok
            ? undefined
            : await this.#extractErrorCode(response.clone()),
          signRequired: response.ok
            ? await this.#describeProposal(response)
            : null,
        }),
      );
    } catch (error) {
      if (error instanceof VenueReadBudgetExhaustedError) {
        throw new PredictReadBudgetExhaustedError(error);
      }
      if (
        error instanceof VenueSigningRefusedError ||
        error instanceof VenueSigningUnavailableError
      ) {
        // A bearer GET already went out, even if the first proposal could
        // not be signed. Renewal must not reset that dispatch evidence.
        throw new PredictSigningError(error);
      }
      throw error;
    }
  }

  /** Reads a `sign_required` proposal from a 200 body, if it is one. */
  async #describeProposal(
    response: Response,
  ): Promise<{ request: ProposedRead } | undefined> {
    let body: unknown;
    try {
      body = await response.clone().json();
    } catch {
      return undefined;
    }
    if (typeof body !== 'object' || body === null) {
      return undefined;
    }
    const record = body as Record<string, unknown>;
    if (record.kind !== 'sign_required') {
      return undefined;
    }
    const request = record.request;
    if (typeof request !== 'object' || request === null) {
      return undefined;
    }
    const described = request as Record<string, unknown>;
    if (
      described.method !== 'GET' ||
      typeof described.path !== 'string' ||
      typeof described.query !== 'string' ||
      (described.requestId !== undefined &&
        (typeof described.requestId !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
            described.requestId,
          )))
    ) {
      return undefined;
    }
    return {
      request: {
        method: 'GET',
        path: described.path,
        query: described.query,
        ...(described.requestId !== undefined && {
          requestId: described.requestId as string,
        }),
      },
    };
  }

  async #postAuthenticated(
    segments: readonly string[],
    body: PredictApiPostBody,
    options?: PredictReadOptions,
    onDispatch?: () => void,
  ): Promise<unknown> {
    const bearerToken = await this.#resolveBearerToken();
    // A write aborted while its token resolved must not go out: the token
    // may already belong to whoever replaced the Predict User.
    if (options?.signal?.aborted) {
      throw abortedError();
    }
    return this.#parseBody(
      await this.#post(segments, body, bearerToken, options, onDispatch),
    );
  }

  async #post(
    segments: readonly string[],
    body: PredictApiPostBody,
    bearerToken: string,
    options?: PredictReadOptions,
    onDispatch?: () => void,
  ): Promise<Response> {
    // A read aborted while its token or signature resolved must not go out
    // either: an observation can replay a stored submission.
    if (options?.signal?.aborted) {
      throw abortedError();
    }
    const url = new URL(
      segments.map(encodeURIComponent).join('/'),
      this.#baseUrlWithTrailingSlash(),
    );
    const request: RequestInit = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        'x-metamask-clientproduct': 'metamask-mobile',
        'x-metamask-clientversion': this.#clientVersion,
        Authorization: `Bearer ${bearerToken}`,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: options?.signal,
    };
    onDispatch?.();
    return this.#fetch(url.toString(), request);
  }

  /**
   * One signed POST. The envelope covers the exact body bytes: the signer
   * returns them, and by default this sends them verbatim. A route that
   * relays the signed bytes as a field (`signedBody`) builds its own body
   * around them, unchanged.
   */
  async #postSigned(
    intent: VenueIntentName,
    segments: readonly string[],
    options: PredictReadOptions | undefined,
    signing: SignOperationInput,
    buildBody: (signed: SignedOperation) => string = (signed) => signed.body,
  ): Promise<unknown> {
    const signOperation = this.#signOperation;
    if (!signOperation) {
      throw new PredictRequestNotSentError('venue_signing_unavailable');
    }
    const bearerToken = await this.#resolveBearerToken();
    if (options?.signal?.aborted) {
      throw abortedError();
    }
    const url = new URL(
      segments.map(encodeURIComponent).join('/'),
      this.#baseUrlWithTrailingSlash(),
    );
    const send = (signed: SignedOperation): Promise<Response> =>
      this.#fetch(url.toString(), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-metamask-clientproduct': 'metamask-mobile',
          'x-metamask-clientversion': this.#clientVersion,
          Authorization: `Bearer ${bearerToken}`,
          [signed.header.name]: signed.header.value,
        },
        // The signature's `content-digest` component pins the signed bytes:
        // they go out exactly as signed, never re-stringified.
        body: buildBody(signed),
        signal: options?.signal,
      });
    try {
      const response = await sendSigned(
        {
          signOperation,
          invalidateSigningSession: () => this.#invalidateSigningSession?.(),
        },
        intent,
        signing,
        send,
        async (sent) => ({
          status: sent.status,
          code: sent.ok
            ? undefined
            : await this.#extractErrorCode(sent.clone()),
        }),
      );
      return await this.#parseBody(response);
    } catch (error) {
      if (
        error instanceof VenueSigningRefusedError ||
        error instanceof VenueSigningUnavailableError
      ) {
        if (error.requestSent) {
          throw new PredictSigningError(error);
        }
        throw new PredictRequestNotSentError(
          error instanceof VenueSigningRefusedError
            ? 'venue_signing_refused'
            : 'venue_signing_unavailable',
          error,
        );
      }
      throw error;
    }
  }

  /** Errors to PredictHttpError; successes to the parsed JSON body. */
  async #parseBody(response: Response): Promise<unknown> {
    if (!response.ok) {
      const bodyCode = await this.#extractErrorCode(response);
      throw new PredictHttpError(response.status, bodyCode);
    }
    try {
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      throw new PredictHttpError(response.status);
    }
  }

  /** Reads the canonical error code from an error response body, if any. */
  async #extractErrorCode(response: Response): Promise<string | undefined> {
    try {
      const body = (await response.json()) as { code?: unknown };
      return typeof body.code === 'string' ? body.code : undefined;
    } catch {
      return undefined;
    }
  }

  #baseUrlWithTrailingSlash(): URL {
    if (!this.#baseUrl) {
      throw new PredictHttpError(503);
    }
    const url = new URL(this.#baseUrl.toString());
    url.pathname = `${url.pathname.replace(/\/$/u, '')}/`;
    return url;
  }
}
