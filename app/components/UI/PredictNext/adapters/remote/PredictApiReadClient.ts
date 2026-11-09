import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import type {
  DeviceAuthHeader,
  SignOperationInput,
  SignedOperation,
} from '../../auth/signing/signOperationTypes';
import {
  loadVenueProfile,
  readAllowed,
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
import type { VenueIntentName } from '../../auth/venueSigningProfiles';

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
}

type PredictApiReadQueryParams = FetchFeedParams &
  Partial<FetchSearchParams> & {
    range?: PredictMarketHistoryRange;
    status?: string;
    sort?: FetchPositionsParams['sort'];
    next?: string;
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
   * Signs one server-proposed read after the phone's allowlist check.
   * Returns undefined when signing is unavailable.
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

/** Signed calls one paged read may make, follow-up pages included. */
const MAX_SIGNED_PAGE_CALLS = 25;

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
      (body) => body.balance !== undefined,
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
      (body) => body.positions !== undefined,
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
      (body) => body.availableBalance !== undefined,
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
      (body) => body.activity !== undefined,
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
   * Commits an approved Order Preview. The body carries the Preview
   * reference only; `signing` is the intent the phone renders and signs.
   * The envelope covers the exact body bytes.
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
      ['v1', 'venues', venueId, 'orders', 'commit'],
      params,
      options,
      signing,
      { previewId: params.previewId },
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
   * `sign_required` body proposes the upstream bytes, which the phone checks
   * against the profile's read allowlist and signs before re-calling the
   * SAME route URL with the envelope and the proposal token. A result page
   * may name the `next` proposal token for its follow-up; the follow-up
   * repeats phase one with `?next=` on the same path, which runs the full
   * allowlist check again.
   *
   * When the follow-up cap trips, what the read gathered so far is returned
   * and the trailing `next` token is dropped: the UI renders the pages it
   * has, without an error, and a later refresh continues.
   */
  async #getSigned(
    segments: readonly string[],
    params: PredictApiReadQueryParams | undefined,
    options: PredictReadOptions | undefined,
    ready: (body: Record<string, unknown>) => boolean,
  ): Promise<unknown> {
    const bearerToken = await this.#resolveBearerToken();
    for (let calls = 0; calls < MAX_SIGNED_PAGE_CALLS; calls += 1) {
      const response = await this.#getSignedOnce((deviceAuth, proposal) =>
        this.#fetchRead(
          segments,
          params,
          options,
          bearerToken,
          deviceAuth,
          proposal,
        ),
      );
      const body = await this.#parseBody(response);
      if (typeof body !== 'object' || body === null) {
        return body;
      }
      const record = body as Record<string, unknown>;
      if (ready(record)) {
        return body;
      }
      // The route proposed the next page instead of answering with one.
      if (typeof record.next !== 'string' || record.next.length === 0) {
        return body;
      }
      if (calls === MAX_SIGNED_PAGE_CALLS - 1) {
        // Cap reached: give the UI what accumulated so far. Dropping
        // `next` marks the page list as truncated without an error.
        const { next: _dropped, ...partial } = record;
        return partial;
      }
      params = { ...params, next: record.next };
    }
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

  /** One GET to a read route, with the envelope and proposal when signed. */
  #fetchRead(
    segments: readonly string[],
    params: PredictApiReadQueryParams | undefined,
    options: PredictReadOptions | undefined,
    bearerToken: string,
    deviceAuth?: DeviceAuthHeader,
    proposal?: string,
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
        ...(deviceAuth && proposal ? { 'venue-proposal': proposal } : {}),
      },
      signal: options?.signal,
    });
  }

  /**
   * The two-phase exchange of one page: send bearer-only; when the 200 body
   * proposes bytes, L1-check them against the profile's `reads.allow`, sign,
   * and re-call the SAME route URL with the envelope and the proposal token.
   * A response that says the signature or the A2T is stale is proposed and
   * signed again once; a second failure is the caller's error. Anything the
   * proposal flow does not describe — an error status, an unexpected body —
   * is returned as-is, and never a 4XX acts as signing control flow.
   */
  async #getSignedOnce(
    send: (
      deviceAuth?: DeviceAuthHeader,
      proposal?: string,
    ) => Promise<Response>,
  ): Promise<Response> {
    const signRead = this.#signRead;
    if (!signRead) {
      throw new PredictRequestNotSentError('venue_signing_unavailable');
    }
    try {
      return await sendSignedRead(
        {
          signRead: (proposed) => this.#signProposedRead(signRead, proposed),
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

  /**
   * The phone's L1 check runs on the PROPOSED upstream bytes BEFORE anything
   * is signed: a proposal outside the profile's `reads.allow` is refused,
   * never sent.
   */
  async #signProposedRead(
    signRead: SignRead,
    proposed: ProposedRead,
  ): Promise<DeviceAuthHeader> {
    const profile = await loadVenueProfile();
    if (!profile) {
      throw new VenueSigningUnavailableError();
    }
    if (
      proposed.method !== 'GET' ||
      !readAllowed(profile, {
        method: 'GET',
        path: proposed.path,
        query: proposed.query,
      })
    ) {
      // A read outside the profile's `reads.allow` is refused at the class
      // level, before anything is signed.
      throw new VenueSigningRefusedError('class');
    }
    const header = await signRead(proposed);
    if (!header) {
      throw new VenueSigningUnavailableError();
    }
    return header;
  }

  /** Reads a `sign_required` proposal from a 200 body, if it is one. */
  async #describeProposal(
    response: Response,
  ): Promise<{ request: ProposedRead; proposal: string } | undefined> {
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
    const proposal = record.proposal;
    if (typeof request !== 'object' || request === null) {
      return undefined;
    }
    const described = request as Record<string, unknown>;
    if (
      described.method !== 'GET' ||
      typeof described.path !== 'string' ||
      typeof described.query !== 'string' ||
      typeof proposal !== 'string' ||
      proposal.length === 0
    ) {
      return undefined;
    }
    return {
      request: {
        method: 'GET',
        path: described.path,
        query: described.query,
      },
      proposal,
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
    return this.#parseBody(await this.#post(segments, body, bearerToken, options));
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
   * returns them, this sends them verbatim, and the idempotency-key header
   * is the signature's own component. `body` carries the caller-known
   * fields merged into the rendered body under the template's key order
   * (the commit's `previewId`).
   */
  async #postSigned(
    intent: VenueIntentName,
    segments: readonly string[],
    body: FetchOrderCommitParams,
    options: PredictReadOptions | undefined,
    signing: SignOperationInput,
    overlay?: Readonly<Record<string, unknown>>,
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
        { ...signing, bodyOverlay: overlay },
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
