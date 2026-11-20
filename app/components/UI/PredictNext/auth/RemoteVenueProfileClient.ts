import { VENUE_PROFILE_REGISTRY_PATH } from './venueProfileRegistryUrl';

/** Hard ceiling on one profile or policy body, matching predict-api. */
export const VENUE_PROFILE_MAX_BYTES = 64 * 1024;

/** One registry request cannot hold a resolve for long. */
export const VENUE_PROFILE_REQUEST_TIMEOUT_MS = 10_000;

export type VenueProfileFetchResult =
  | { status: 'modified'; raw: string; etag?: string }
  | { status: 'not-modified'; etag?: string };

/** Reason codes only: never a body, envelope or signature. */
export type VenueProfileFetchReason =
  | 'http'
  | 'network'
  | 'timeout'
  | 'oversize'
  | 'invalid_body';

export class VenueProfileFetchError extends Error {
  readonly reason: VenueProfileFetchReason;
  readonly status?: number;

  constructor(reason: VenueProfileFetchReason, status?: number) {
    super(
      status === undefined
        ? `Venue profile fetch failed (${reason}).`
        : `Venue profile fetch failed (${reason} ${status}).`,
    );
    this.name = 'VenueProfileFetchError';
    this.reason = reason;
    this.status = status;
  }
}

const RFC3986_EXTRA = "!'()*.";

const encode = (value: string): string =>
  Array.from(encodeURIComponent(value), (character) =>
    RFC3986_EXTRA.includes(character)
      ? `%${(character.codePointAt(0) as number).toString(16).toUpperCase()}`
      : character,
  ).join('');

const byteLength = (value: string): number =>
  new TextEncoder().encode(value).length;

/**
 * Reads one policy or profile file from the client-config registry host.
 *
 * Bodies are read as text, never JSON, because the profile's SHA-256 covers
 * the exact bytes the registry published. Timeout, size limit and status are
 * checked here; schema and ceiling checks belong to the resolver.
 */
export class RemoteVenueProfileClient {
  readonly #baseUrl: URL;
  readonly #clientVersion: string;
  readonly #fetch: typeof fetch;

  constructor({
    baseUrl,
    clientVersion,
    fetch: fetchFn = global.fetch,
  }: {
    baseUrl: string;
    clientVersion: string;
    fetch?: typeof fetch;
  }) {
    const url = new URL(baseUrl);
    let pathname = url.pathname;
    while (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    url.pathname = `${pathname}/`;
    this.#baseUrl = url;
    this.#clientVersion = clientVersion;
    this.#fetch = fetchFn;
  }

  fetchPolicy({
    id,
    etag,
    signal,
  }: {
    id: string;
    etag?: string;
    signal?: AbortSignal;
  }): Promise<VenueProfileFetchResult> {
    return this.#read(`${encode(id)}/policy.json`, etag, signal);
  }

  async fetchProfile({
    id,
    version,
    signal,
  }: {
    id: string;
    version: number;
    signal?: AbortSignal;
  }): Promise<string> {
    const result = await this.#read(
      `${encode(id)}/v${String(version)}.json`,
      undefined,
      signal,
    );
    if (result.status === 'not-modified') {
      throw new VenueProfileFetchError('invalid_body');
    }
    return result.raw;
  }

  async #read(
    relativePath: string,
    etag: string | undefined,
    signal: AbortSignal | undefined,
  ): Promise<VenueProfileFetchResult> {
    const url = new URL(
      `${VENUE_PROFILE_REGISTRY_PATH}/${relativePath}`,
      this.#baseUrl,
    );
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) {
      abort();
    }
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, VENUE_PROFILE_REQUEST_TIMEOUT_MS);

    try {
      const response = await this.#fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-metamask-clientproduct': 'metamask-mobile',
          'x-metamask-clientversion': this.#clientVersion,
          ...(etag ? { 'If-None-Match': etag } : {}),
        },
        signal: controller.signal,
      });

      if (response.status === 304) {
        return {
          status: 'not-modified',
          etag: response.headers.get('etag') ?? etag,
        };
      }
      if (!response.ok) {
        throw new VenueProfileFetchError('http', response.status);
      }
      const raw = await this.#readBody(response);
      return {
        status: 'modified',
        raw,
        etag: response.headers.get('etag') ?? undefined,
      };
    } catch (error) {
      throw this.#classifyError(error, timedOut);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }

  async #readBody(response: Response): Promise<string> {
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > VENUE_PROFILE_MAX_BYTES) {
      throw new VenueProfileFetchError('oversize');
    }
    let raw: string;
    try {
      raw = await response.text();
    } catch {
      throw new VenueProfileFetchError('invalid_body');
    }
    if (byteLength(raw) > VENUE_PROFILE_MAX_BYTES) {
      throw new VenueProfileFetchError('oversize');
    }
    return raw;
  }

  #classifyError(error: unknown, timedOut: boolean): Error {
    if (error instanceof VenueProfileFetchError) {
      return error;
    }
    if (timedOut) {
      return new VenueProfileFetchError('timeout');
    }
    if (error instanceof Error && error.name === 'AbortError') {
      return error;
    }
    return new VenueProfileFetchError('network');
  }
}
