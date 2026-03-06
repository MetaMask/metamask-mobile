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
}

export class BaanxService {
  private readonly client: AxiosInstance;
  private currentLocation: CardLocation = 'international';

  constructor({ apiKey, baseUrl }: { apiKey: string; baseUrl: string }) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'x-client-key': apiKey,
      },
    });
  }

  setLocation(location: CardLocation): void {
    this.currentLocation = location;
  }

  get location(): CardLocation {
    return this.currentLocation;
  }

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      'x-us-env': String(this.currentLocation === 'us'),
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
        const body =
          typeof error.response?.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response?.data ?? '');
        throw new CardApiError(status, path, body);
      }
      throw error;
    }
  }

  async get<T>(path: string, tokenSet?: CardAuthTokens): Promise<T> {
    return this.request<T>(path, { tokenSet });
  }

  async post<T>(
    path: string,
    body: unknown,
    tokenSet?: CardAuthTokens,
  ): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, tokenSet });
  }

  async put<T>(
    path: string,
    body: unknown,
    tokenSet?: CardAuthTokens,
  ): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, tokenSet });
  }
}
