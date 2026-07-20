import { create, isAxiosError, type AxiosInstance } from 'axios';
import Logger from '../../../../../util/Logger';
import type { CardAuthTokens } from '../provider-types';
import { CardApiError } from './BaanxService';

const DEFAULT_TIMEOUT_MS = 15_000;

interface RequestOptions {
  method?: string;
  body?: unknown;
  tokenSet?: CardAuthTokens;
  timeout?: number;
  headers?: Record<string, string>;
}

export class ImmersveService {
  private readonly client: AxiosInstance;

  constructor({ baseUrl }: { baseUrl: string }) {
    this.client = create({
      baseURL: baseUrl,
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { ...opts.headers };

    if (opts.tokenSet) {
      headers.Authorization = `Bearer ${opts.tokenSet.accessToken}`;
    }

    if (__DEV__) {
      Logger.log('[ImmersveService]', 'request', path, {
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
        Logger.log('[ImmersveService]', 'response', path, {
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

  async get<T>(path: string, tokenSet?: CardAuthTokens): Promise<T> {
    return this.request<T>(path, { tokenSet });
  }

  async post<T>(
    path: string,
    body: unknown,
    tokenSet?: CardAuthTokens,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, tokenSet, headers });
  }

  async patch<T>(
    path: string,
    body: unknown,
    tokenSet?: CardAuthTokens,
  ): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body, tokenSet });
  }
}
