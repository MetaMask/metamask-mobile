import { create, type AxiosInstance } from 'axios';
import type { CardAuthTokens } from '../provider-types';
import { observeCardHttpCall } from './cardHttpObservability';

const DEFAULT_TIMEOUT_MS = 15_000;
const AUTH_TOKEN_ENDPOINT = '/auth/token';

interface RequestOptions {
  method?: string;
  body?: unknown;
  tokenSet?: CardAuthTokens;
  timeout?: number;
  headers?: Record<string, string>;
  baseURL?: string;
  /** Statuses that are expected product outcomes, not Sentry issues. */
  unreportedStatuses?: readonly number[];
}

interface PostOptions {
  tokenSet?: CardAuthTokens;
  headers?: Record<string, string>;
  unreportedStatuses?: readonly number[];
}

function isCardAuthTokens(
  value: CardAuthTokens | PostOptions,
): value is CardAuthTokens {
  return 'accessToken' in value;
}

export class ImmersveService {
  private readonly client: AxiosInstance;
  private readonly getBaseUrl: () => string;

  constructor({ getBaseUrl }: { getBaseUrl: () => string }) {
    this.getBaseUrl = getBaseUrl;
    this.client = create({
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const method = opts.method ?? 'GET';
    const headers: Record<string, string> = { ...opts.headers };

    if (opts.tokenSet) {
      headers.Authorization = `Bearer ${opts.tokenSet.accessToken}`;
    }

    return observeCardHttpCall({
      provider: 'immersve',
      serviceName: 'ImmersveService',
      path,
      method,
      location: opts.tokenSet?.location ?? 'international',
      headers,
      alwaysReportEndpoints: [AUTH_TOKEN_ENDPOINT],
      unreportedStatuses: opts.unreportedStatuses,
      execute: () =>
        this.client.request<T>({
          baseURL: opts.baseURL ?? this.getBaseUrl(),
          url: path,
          method,
          headers,
          data: opts.body,
          timeout: opts.timeout ?? DEFAULT_TIMEOUT_MS,
        }),
    });
  }

  async get<T>(path: string, tokenSet?: CardAuthTokens): Promise<T> {
    return this.request<T>(path, { tokenSet });
  }

  async post<T>(
    path: string,
    body: unknown,
    tokenSetOrOptions?: CardAuthTokens | PostOptions,
    headers?: Record<string, string>,
  ): Promise<T> {
    if (tokenSetOrOptions && !isCardAuthTokens(tokenSetOrOptions)) {
      return this.request<T>(path, {
        method: 'POST',
        body,
        tokenSet: tokenSetOrOptions.tokenSet,
        headers: headers ?? tokenSetOrOptions.headers,
        unreportedStatuses: tokenSetOrOptions.unreportedStatuses,
      });
    }

    return this.request<T>(path, {
      method: 'POST',
      body,
      tokenSet: tokenSetOrOptions,
      headers,
    });
  }

  async patch<T>(
    path: string,
    body: unknown,
    tokenSet?: CardAuthTokens,
  ): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body, tokenSet });
  }
}
