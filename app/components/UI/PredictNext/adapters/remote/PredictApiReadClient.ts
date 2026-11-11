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
  PredictEntityId,
  PredictFeedId,
  PredictMarketHistoryRange,
  PredictReadOptions,
  PredictVenueId,
} from '../../types';
import {
  sendSigned,
  sendSignedRead,
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
}

type PredictApiReadQueryParams = FetchFeedParams &
  Partial<FetchSearchParams> & {
    range?: PredictMarketHistoryRange;
    status?: string;
    sort?: FetchPositionsParams['sort'];
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

  constructor(status: number, bodyCode?: string) {
    super(`Predict API request failed with status ${status}.`);
    this.name = 'PredictHttpError';
    this.status = status;
    this.bodyCode = bodyCode;
  }
}

/**
 * The phone refused or could not sign the call, so it was never sent. The
 * synthetic 400 maps to the generic invalid-response error rather than to a
 * region block.
 */
export class PredictRequestNotSentError extends PredictHttpError {
  constructor(bodyCode: string) {
    super(400, bodyCode);
    this.name = 'PredictRequestNotSentError';
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
      if (error instanceof VenueSigningRefusedError) {
        throw new PredictRequestNotSentError(
          `venue_signing_refused_${error.rule}`,
        );
      }
      if (error instanceof VenueSigningUnavailableError) {
        throw new PredictRequestNotSentError('venue_signing_unavailable');
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
    body: FetchOrderPreviewParams | FetchOrderCommitParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    const bearerToken = await this.#resolveBearerToken();
    // A write aborted while its token resolved must not go out: the token
    // may already belong to whoever replaced the Predict User.
    if (options?.signal?.aborted) {
      const aborted = new Error('The request was aborted.');
      aborted.name = 'AbortError';
      throw aborted;
    }
    return this.#parseBody(
      await this.#post(segments, body, bearerToken, options),
    );
  }

  async #post(
    segments: readonly string[],
    body: FetchOrderPreviewParams | FetchOrderCommitParams,
    bearerToken: string,
    options?: PredictReadOptions,
  ): Promise<Response> {
    const url = new URL(
      segments.map(encodeURIComponent).join('/'),
      this.#baseUrlWithTrailingSlash(),
    );
    return this.#fetch(url.toString(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-metamask-clientproduct': 'metamask-mobile',
        'x-metamask-clientversion': this.#clientVersion,
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });
  }

  /**
   * One signed POST. The envelope covers the exact body bytes: the signer
   * returns them and this sends them verbatim.
   */
  async #postSigned(
    intent: VenueIntentName,
    segments: readonly string[],
    options: PredictReadOptions | undefined,
    signing: SignOperationInput,
  ): Promise<unknown> {
    const signOperation = this.#signOperation;
    if (!signOperation) {
      throw new PredictRequestNotSentError('venue_signing_unavailable');
    }
    const bearerToken = await this.#resolveBearerToken();
    if (options?.signal?.aborted) {
      const aborted = new Error('The request was aborted.');
      aborted.name = 'AbortError';
      throw aborted;
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
        // The signature's `content-digest` component pins these bytes: the
        // body goes out exactly as signed, never re-stringified.
        body: signed.body,
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
        async (response) => ({
          status: response.status,
          code: response.ok
            ? undefined
            : await this.#extractErrorCode(response.clone()),
        }),
      );
      return await this.#parseBody(response);
    } catch (error) {
      if (error instanceof VenueSigningRefusedError) {
        throw new PredictRequestNotSentError(
          `venue_signing_refused_${error.rule}`,
        );
      }
      if (error instanceof VenueSigningUnavailableError) {
        throw new PredictRequestNotSentError('venue_signing_unavailable');
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
