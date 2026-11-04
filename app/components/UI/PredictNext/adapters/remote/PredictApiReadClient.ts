import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import type { SignOperationInput } from '../../auth/signing/signOperationTypes';
import type { TemplateValues } from '../../auth/signing/venueTemplates';
import type { VenueOperationName } from '../../auth/venueSigningProfiles';
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
  VenueSigningRefusedError,
  VenueSigningUnavailableError,
  type SignOperation,
} from './signedVenueCall';

/** A read that acts as the user on the venue, and what signs it. */
interface SigningIntent {
  operation: VenueOperationName;
  input?: SignOperationInput;
}

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
    continuation?: string;
  };

const continuationOf = (
  value: unknown,
): { token: string; step: string; values: TemplateValues } | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.token !== 'string' ||
    typeof record.step !== 'string' ||
    typeof record.values !== 'object' ||
    record.values === null
  ) {
    return undefined;
  }
  return {
    token: record.token,
    step: record.step,
    values: record.values as TemplateValues,
  };
};

export interface PredictApiReadClientOptions {
  baseUrl?: string;
  clientVersion: string;
  fetch?: typeof fetch;
  getBearerToken: () => Promise<string | undefined>;
  /**
   * Renders and signs a canonical operation from the bundled signing profile
   * and returns the `Venue-Authorization` header. Throws `TemplateError` when
   * the profile does not allow the request, and returns undefined when
   * signing is unavailable. Without it, device-signed reads cannot be sent.
   */
  signOperation?: SignOperation;
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
  /** The step predict-api now expects, on `venue_step_changed`. */
  readonly next?: {
    step: string;
    values: Record<string, string | number | boolean>;
  };

  constructor(
    status: number,
    bodyCode?: string,
    next?: PredictHttpError['next'],
  ) {
    super(`Predict API request failed with status ${status}.`);
    this.name = 'PredictHttpError';
    this.status = status;
    this.bodyCode = bodyCode;
    this.next = next;
  }
}

export class PredictApiReadClient implements PredictApiReadTransport {
  readonly #baseUrl?: URL;
  readonly #clientVersion: string;
  readonly #fetch: typeof fetch;
  readonly #getBearerToken: () => Promise<string | undefined>;
  readonly #signOperation?: SignOperation;
  readonly #invalidateSigningSession?: () => void;
  /** Values the next page of a cursor must sign, from the page that named it. */
  readonly #nextSigning = new Map<
    string,
    { step: string; values: TemplateValues }
  >();

  constructor({
    baseUrl,
    clientVersion,
    fetch: fetchFn = global.fetch,
    getBearerToken,
    signOperation,
    invalidateSigningSession,
  }: PredictApiReadClientOptions) {
    this.#baseUrl = parseBaseUrl(baseUrl);
    this.#clientVersion = clientVersion;
    this.#fetch = fetchFn;
    this.#getBearerToken = getBearerToken;
    this.#signOperation = signOperation;
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
    // The balance is the user's own Kalshi balance, so it is device-signed.
    return this.#get(['v1', 'venues', venueId, 'balance'], undefined, options, {
      operation: 'portfolio.balance',
    });
  }

  fetchPositions(
    venueId: PredictVenueId,
    { status, ...params }: FetchPositionsParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#getSignedPaged(
      'portfolio.positions',
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
    return this.#getSignedPaged(
      'portfolio.summary',
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
    return this.#getSignedPaged(
      'portfolio.activity',
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

  fetchOrderPreview(
    venueId: PredictVenueId,
    params: FetchOrderPreviewParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#postAuthenticated(
      ['v1', 'venues', venueId, 'orders', 'preview'],
      params,
      options,
      {
        operation: 'orders.preview',
        input: {
          inputs: {
            action:
              'action' in params && params.action === 'sell' ? 'sell' : 'buy',
            marketId: params.marketId,
            idempotencyKey: params.idempotencyKey,
          },
        },
      },
    );
  }

  /**
   * Commits an approved Order Preview. The body carries the Preview
   * reference only. `signing` is the step the phone renders and signs.
   * `venue_step_changed` is rendered again from the body's `next` and sent
   * once more.
   */
  async commitOrder(
    venueId: PredictVenueId,
    params: FetchOrderCommitParams,
    options?: PredictReadOptions,
    signing?: SignOperationInput,
  ): Promise<unknown> {
    const post = (input: SignOperationInput | undefined) =>
      this.#postAuthenticated(
        ['v1', 'venues', venueId, 'orders', 'commit'],
        params,
        options,
        input ? { operation: 'orders.commit', input } : undefined,
      );
    try {
      return await post(signing);
    } catch (error) {
      if (
        !signing ||
        !(error instanceof PredictHttpError) ||
        error.status !== 409 ||
        error.bodyCode !== 'venue_step_changed' ||
        !error.next
      ) {
        throw error;
      }
      return post({
        ...signing,
        step: error.next.step,
        values: error.next.values,
        confirmed: false,
      });
    }
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
   * One signed venue read per call. A body without the page is a partial
   * result: its continuation is signed and sent until the page is present.
   * A finished page can also name the values the next cursor must sign.
   */
  async #getSignedPaged(
    operation: VenueOperationName,
    segments: readonly string[],
    params: PredictApiReadQueryParams | undefined,
    options: PredictReadOptions | undefined,
    ready: (body: Record<string, unknown>) => boolean,
  ): Promise<unknown> {
    const cursor = params?.cursor;
    const remembered =
      typeof cursor === 'string' ? this.#nextSigning.get(cursor) : undefined;
    let step =
      remembered?.step ??
      (operation === 'portfolio.activity' ? 'settlements' : 'holdings');
    let values = remembered?.values;
    let continuation: string | undefined;
    for (let guard = 0; guard < 200; guard += 1) {
      try {
        const body = await this.#get(
          segments,
          { ...params, continuation },
          options,
          { operation, input: { step, values } },
        );
        if (typeof body !== 'object' || body === null) {
          return body;
        }
        const record = body as Record<string, unknown>;
        const next = continuationOf(record.continuation);
        const nextCursor = record.nextCursor;
        if (typeof nextCursor === 'string' && next) {
          this.#nextSigning.set(nextCursor, {
            step: next.step,
            values: next.values,
          });
        }
        if (ready(record) || !next) {
          return body;
        }
        continuation = next.token;
        step = next.step;
        values = next.values;
      } catch (error) {
        if (
          error instanceof PredictHttpError &&
          error.status === 409 &&
          error.bodyCode === 'venue_step_changed' &&
          error.next
        ) {
          step = error.next.step;
          values = error.next.values;
          continue;
        }
        throw error;
      }
    }
    throw new PredictHttpError(503);
  }

  /**
   * `signing` marks a read that acts as the user on the venue. The phone
   * renders and signs it before the call, so the signed call is the first
   * call (ADR-0004). A response that says the signature or the A2T is stale
   * is signed again and sent once more.
   */
  async #get(
    segments: readonly string[],
    params?: PredictApiReadQueryParams,
    options?: PredictReadOptions,
    signing?: SigningIntent,
  ): Promise<unknown> {
    const bearerToken = await this.#resolveBearerToken();

    const url = new URL(
      segments.map(encodeURIComponent).join('/'),
      this.#baseUrlWithTrailingSlash(),
    );

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const send = (deviceAuth?: {
      name: string;
      value: string;
    }): Promise<Response> =>
      this.#fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-metamask-clientproduct': 'metamask-mobile',
          'x-metamask-clientversion': this.#clientVersion,
          Authorization: `Bearer ${bearerToken}`,
          ...(deviceAuth ? { [deviceAuth.name]: deviceAuth.value } : {}),
        },
        signal: options?.signal,
      });

    const response = signing
      ? await this.#sendSignedRead(signing, send)
      : await send();

    if (!response.ok) {
      const error = await this.#readError(response);
      throw new PredictHttpError(response.status, error.code, error.next);
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

  async #postAuthenticated(
    segments: readonly string[],
    body: FetchOrderPreviewParams | FetchOrderCommitParams,
    options?: PredictReadOptions,
    signing?: SigningIntent,
  ): Promise<unknown> {
    const bearerToken = await this.#resolveBearerToken();
    if (!signing) {
      return this.#post(segments, body, bearerToken, options);
    }
    const url = new URL(
      segments.map(encodeURIComponent).join('/'),
      this.#baseUrlWithTrailingSlash(),
    );
    const response = await this.#sendSignedRead(signing, (deviceAuth) =>
      this.#fetch(url.toString(), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-metamask-clientproduct': 'metamask-mobile',
          'x-metamask-clientversion': this.#clientVersion,
          Authorization: `Bearer ${bearerToken}`,
          [deviceAuth.name]: deviceAuth.value,
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      }),
    );
    if (!response.ok) {
      const error = await this.#readError(response);
      throw new PredictHttpError(response.status, error.code, error.next);
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

  async #post(
    segments: readonly string[],
    body: FetchOrderPreviewParams | FetchOrderCommitParams,
    bearerToken: string,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    const url = new URL(
      segments.map(encodeURIComponent).join('/'),
      this.#baseUrlWithTrailingSlash(),
    );

    const response = await this.#fetch(url.toString(), {
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

    if (!response.ok) {
      const error = await this.#readError(response);
      throw new PredictHttpError(response.status, error.code, error.next);
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

  async #sendSignedRead(
    signing: SigningIntent,
    send: (deviceAuth: { name: string; value: string }) => Promise<Response>,
  ): Promise<Response> {
    const signOperation = this.#signOperation;
    if (!signOperation) {
      // Synthetic statuses: the call was never sent. Status 400 maps to the
      // generic invalid-response error rather than to a region block.
      throw new PredictHttpError(400, 'venue_signing_unavailable');
    }
    try {
      return await sendSigned(
        {
          signOperation,
          invalidateSigningSession: () => this.#invalidateSigningSession?.(),
        },
        signing.operation,
        signing.input,
        send,
        async (response) => ({
          status: response.status,
          // Read the code from a clone so the response can still be returned.
          // A success has no error code to read.
          code: response.ok
            ? undefined
            : (await this.#readError(response.clone())).code,
        }),
      );
    } catch (error) {
      if (error instanceof VenueSigningRefusedError) {
        throw new PredictHttpError(400, `venue_signing_refused_${error.rule}`);
      }
      if (error instanceof VenueSigningUnavailableError) {
        throw new PredictHttpError(400, 'venue_signing_unavailable');
      }
      throw error;
    }
  }

  /** Reads the canonical error code, and `next` when the step moved. */
  async #readError(response: Response): Promise<{
    code?: string;
    next?: PredictHttpError['next'];
  }> {
    try {
      const body = (await response.json()) as {
        code?: unknown;
        next?: unknown;
      };
      const next = body.next;
      const values =
        typeof next === 'object' &&
        next !== null &&
        'values' in next &&
        typeof next.values === 'object' &&
        next.values !== null
          ? next.values
          : undefined;
      const step =
        typeof next === 'object' &&
        next !== null &&
        'step' in next &&
        typeof next.step === 'string'
          ? next.step
          : undefined;
      return {
        code: typeof body.code === 'string' ? body.code : undefined,
        next:
          step && values
            ? {
                step,
                values: values as Record<string, string | number | boolean>,
              }
            : undefined,
      };
    } catch {
      return {};
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
