import axios, { isAxiosError, type AxiosInstance } from 'axios';
import Logger from '../../../../../util/Logger';
import type { CardAuthTokens } from '../provider-types';
import type { CardLocation } from '../../../../../components/UI/Card/types';

const DEFAULT_TIMEOUT_MS = 15_000;

export class CardApiError extends Error {
  readonly statusCode: number;
  readonly path: string;
  readonly responseBody: string;

  constructor(statusCode: number, path: string, responseBody: string) {
    super(`Card API error ${statusCode} on ${path}`);
    this.name = 'CardApiError';
    this.statusCode = statusCode;
    this.path = path;
    this.responseBody = responseBody;
  }
}

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
    this.client = axios.create({
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
    const headers: Record<string, string> = {
      'x-us-env': String(effectiveLocation === 'us'),
      ...opts.headers,
    };

    if (opts.tokenSet) {
      headers.Authorization = `Bearer ${opts.tokenSet.accessToken}`;
    }

    if (__DEV__) {
      Logger.log('[BaanxService]', 'request', path, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body,
      });
    }

    try {
      const response = await this.client.request<T>({
        url: path,
        method: opts.method ?? 'GET',
        headers,
        data: opts.body,
        timeout: opts.timeout ?? DEFAULT_TIMEOUT_MS,
      });

      if (__DEV__) {
        Logger.log('[BaanxService]', 'response', path, {
          status: response.status,
          data: response.data,
        });
      }

      return response.data;
    } catch (error) {
      if (isAxiosError(error)) {
        const status =
          error.response?.status ?? (error.code === 'ECONNABORTED' ? 408 : 0);
        const rawData = error.response?.data;
        const body =
          typeof rawData === 'string'
            ? rawData
            : rawData != null
              ? JSON.stringify(rawData)
              : '';
        throw new CardApiError(status, path, body);
      }
      throw error;
    }
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
