import { create, isAxiosError, type AxiosInstance } from 'axios';
import Logger from '../../../../../util/Logger';
import type { CardProviderId } from '../provider-types';
import { CardApiError } from './BaanxService';
import type { CardApiSupportedRegionsResponse } from './card-supported-regions.types';

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * HTTP client for the MetaMask Card API (provider-agnostic).
 * Provider-specific Immersve/Baanx APIs live in their own services.
 */
export class CardService {
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

  private supportedRegionsPath(providerId: CardProviderId): string {
    return `/v1/providers/${encodeURIComponent(providerId)}/supported-regions`;
  }

  /**
   * Fetches supported regions (incl. legal documents) for a card provider.
   * Public endpoint — no client key or bearer required.
   */
  async getSupportedRegions(
    providerId: CardProviderId,
  ): Promise<CardApiSupportedRegionsResponse> {
    const baseURL = this.getBaseUrl();
    const path = this.supportedRegionsPath(providerId);

    if (!baseURL) {
      throw new CardApiError(0, path, 'Card API base URL is not configured');
    }

    if (__DEV__) {
      Logger.log('[CardService]', 'request', path, {
        method: 'GET',
        baseURL,
      });
    }

    try {
      const response =
        await this.client.request<CardApiSupportedRegionsResponse>({
          baseURL,
          url: path,
          method: 'GET',
          timeout: DEFAULT_TIMEOUT_MS,
        });

      if (__DEV__) {
        Logger.log('[CardService]', 'response', path, {
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
}
