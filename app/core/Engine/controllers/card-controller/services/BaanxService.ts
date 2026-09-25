import { create, type AxiosInstance } from 'axios';
import type { CardAuthTokens } from '../provider-types';
import type { CardLocation } from '../../../../../components/UI/Card/types';
import { observeCardHttpCall } from './cardHttpObservability';

const DEFAULT_TIMEOUT_MS = 15_000;
const AUTH_TOKEN_ENDPOINT = '/v1/auth/oauth/token';

interface RequestOptions {
  method?: string;
  body?: unknown;
  tokenSet?: CardAuthTokens;
  timeout?: number;
  headers?: Record<string, string>;
  location?: CardLocation;
}

export class BaanxService {
  private readonly client: AxiosInstance;
  private readonly apiKey_: string;
  private currentLocation: CardLocation = 'international';

  constructor({ apiKey, baseUrl }: { apiKey: string; baseUrl: string }) {
    this.apiKey_ = apiKey;
    this.client = create({
      baseURL: baseUrl,
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'x-client-key': apiKey,
      },
    });
  }

  get apiKey(): string {
    return this.apiKey_;
  }

  setLocation(location: CardLocation): void {
    this.currentLocation = location;
  }

  get location(): CardLocation {
    return this.currentLocation;
  }

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    // Prefer explicit location override, then token-embedded location (set at
    // login time), then the service-level currentLocation (set during initiateAuth
    // for unauthenticated flows). Without this, cold-start requests use the
    // 'international' default because initiateAuth is not called for already-
    // authenticated users, causing x-us-env:false for US accounts.
    const effectiveLocation =
      opts.location ??
      (opts.tokenSet?.location as CardLocation | undefined) ??
      this.currentLocation;
    const method = opts.method ?? 'GET';
    const headers: Record<string, string> = {
      'x-us-env': String(effectiveLocation === 'us'),
      ...opts.headers,
    };

    if (opts.tokenSet) {
      headers.Authorization = `Bearer ${opts.tokenSet.accessToken}`;
    }

    return observeCardHttpCall({
      provider: 'baanx',
      serviceName: 'BaanxService',
      path,
      method,
      location: effectiveLocation,
      headers,
      alwaysReportEndpoints: [AUTH_TOKEN_ENDPOINT],
      execute: () =>
        this.client.request<T>({
          url: path,
          method,
          headers,
          data: opts.body,
          timeout: opts.timeout ?? DEFAULT_TIMEOUT_MS,
        }),
    });
  }

  async get<T>(
    path: string,
    tokenSet?: CardAuthTokens,
    location?: CardLocation,
  ): Promise<T> {
    return this.request<T>(path, { tokenSet, location });
  }

  async post<T>(
    path: string,
    body: unknown,
    tokenSet?: CardAuthTokens,
    location?: CardLocation,
  ): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, tokenSet, location });
  }

  async put<T>(
    path: string,
    body: unknown,
    tokenSet?: CardAuthTokens,
    location?: CardLocation,
  ): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, tokenSet, location });
  }
}
