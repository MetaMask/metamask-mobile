/**
 * Meld White-Label API Service
 *
 * Direct integration with Meld's REST API for the PoC.
 *
 * SECURITY NOTE: In production, API calls should go through a backend proxy
 * to avoid exposing the API key in the mobile app. For this PoC, we call
 * Meld's sandbox API directly.
 *
 * @see https://docs.meld.io/docs/whitelabel-api-guide
 */

import { meldCache, ONE_WEEK_MS } from './MeldApiCache';
import {
  MeldConfig,
  MeldCountry,
  MeldCountryDefaults,
  MeldCryptoCurrency,
  MeldEnvironment,
  MeldFiatCurrency,
  MeldPaymentMethod,
  MeldPurchaseLimits,
  MeldQuote,
  MeldQuoteRequest,
  MeldQuoteResponse,
  MeldTransaction,
  MeldWidgetSession,
  MeldWidgetSessionRequest,
} from '../types';
import Logger from '../../../../../util/Logger';

const BASE_URLS: Record<MeldEnvironment, string> = {
  [MeldEnvironment.Sandbox]: 'https://api-sb.meld.io',
  [MeldEnvironment.Production]: 'https://api.meld.io',
};

const API_VERSION = '2025-03-04';

/**
 * Meld White-Label API client.
 *
 * Replaces the on-ramp SDK + on-ramp API aggregation layer with
 * direct calls to Meld. Meld acts as the aggregator, returning
 * quotes from multiple providers (Transak, Unlimit, Robinhood, etc.)
 */
class MeldApi {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: MeldConfig) {
    this.baseUrl = BASE_URLS[config.environment];
    this.apiKey = config.apiKey;
  }

  // ────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `BASIC ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Meld-Version': API_VERSION,
    };
  }

  private async get<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }

    Logger.log(`[MeldApi] GET ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      Logger.error(
        new Error(`[MeldApi] GET ${path} failed: ${response.status}`),
        errorBody,
      );
      throw new Error(`Meld API error ${response.status}: ${errorBody}`);
    }

    return response.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    Logger.log(`[MeldApi] POST ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      Logger.error(
        new Error(`[MeldApi] POST ${path} failed: ${response.status}`),
        errorBody,
      );
      throw new Error(`Meld API error ${response.status}: ${errorBody}`);
    }

    return response.json() as Promise<T>;
  }

  // ────────────────────────────────────────────
  // Step 1: Countries
  // ────────────────────────────────────────────

  /**
   * Get list of supported countries.
   * Cached for 1 week.
   */
  async getCountries(): Promise<MeldCountry[]> {
    const cacheKey = 'countries';
    const cached = meldCache.get<MeldCountry[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<MeldCountry[]>(
      '/service-providers/properties/countries',
      { accountFilter: 'true' },
    );
    meldCache.set(cacheKey, data, ONE_WEEK_MS);
    return data;
  }

  // ────────────────────────────────────────────
  // Step 2: Country defaults
  // ────────────────────────────────────────────

  /**
   * Get default currency and payment methods for a country.
   * Cache for ~1 week.
   */
  async getCountryDefaults(
    countryCode: string,
  ): Promise<MeldCountryDefaults[]> {
    const data = await this.get<MeldCountryDefaults[]>(
      '/service-providers/properties/defaults/by-country',
      { countries: countryCode },
    );
    return data;
  }

  // ────────────────────────────────────────────
  // Step 2b: Fiat currencies
  // ────────────────────────────────────────────

  /**
   * Get available fiat currencies for a country.
   * Cached for 1 week.
   */
  async getFiatCurrencies(countryCode: string): Promise<MeldFiatCurrency[]> {
    const cacheKey = `fiat-currencies-${countryCode}`;
    const cached = meldCache.get<MeldFiatCurrency[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<MeldFiatCurrency[]>(
      '/service-providers/properties/fiat-currencies',
      { countries: countryCode, accountFilter: 'true' },
    );
    meldCache.set(cacheKey, data, ONE_WEEK_MS);
    return data;
  }

  // ────────────────────────────────────────────
  // Step 2c: Payment methods
  // ────────────────────────────────────────────

  /**
   * Get available payment methods for a fiat currency.
   * Cached for 1 week.
   */
  async getPaymentMethods(
    fiatCurrencyCode: string,
  ): Promise<MeldPaymentMethod[]> {
    const cacheKey = `payment-methods-${fiatCurrencyCode}`;
    const cached = meldCache.get<MeldPaymentMethod[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<MeldPaymentMethod[]>(
      '/service-providers/properties/payment-methods',
      { fiatCurrencies: fiatCurrencyCode, accountFilter: 'true' },
    );
    meldCache.set(cacheKey, data, ONE_WEEK_MS);
    return data;
  }

  // ────────────────────────────────────────────
  // Step 3: Crypto currencies
  // ────────────────────────────────────────────

  /**
   * Get available cryptocurrencies for a country.
   * Cached for 1 week.
   */
  async getCryptoCurrencies(
    countryCode: string,
  ): Promise<MeldCryptoCurrency[]> {
    const cacheKey = `crypto-currencies-${countryCode}`;
    const cached = meldCache.get<MeldCryptoCurrency[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<MeldCryptoCurrency[]>(
      '/service-providers/properties/crypto-currencies',
      { countries: countryCode, accountFilter: 'true' },
    );
    meldCache.set(cacheKey, data, ONE_WEEK_MS);
    return data;
  }

  // ────────────────────────────────────────────
  // Step 4: Purchase limits
  // ────────────────────────────────────────────

  /**
   * Get purchase limits for fiat currencies.
   * Cache for ~1 week.
   */
  async getPurchaseLimits(): Promise<MeldPurchaseLimits> {
    const data = await this.get<MeldPurchaseLimits>(
      '/service-providers/limits/fiat-currency-purchases',
      { accountFilter: 'true' },
    );
    return data;
  }

  // ────────────────────────────────────────────
  // Step 5: Quotes (NEVER cache)
  // ────────────────────────────────────────────

  /**
   * Get real-time quotes from multiple providers.
   * Returns quotes sorted by Meld's customerScore.
   */
  async getQuotes(request: MeldQuoteRequest): Promise<MeldQuote[]> {
    const data = await this.post<MeldQuoteResponse>(
      '/payments/crypto/quote',
      request,
    );

    if (data.error) {
      throw new Error(`Meld quote error: ${data.error}`);
    }

    // Sort by customerScore (higher = better conversion likelihood)
    const quotes = data.quotes ?? [];
    return quotes.sort(
      (a, b) => (b.customerScore ?? 0) - (a.customerScore ?? 0),
    );
  }

  // ────────────────────────────────────────────
  // Step 6: Widget session (NEVER cache)
  // ────────────────────────────────────────────

  /**
   * Create a widget session to launch the provider's payment UI.
   * Returns a URL to open in a WebView.
   */
  async createWidgetSession(
    request: MeldWidgetSessionRequest,
  ): Promise<MeldWidgetSession> {
    return this.post<MeldWidgetSession>('/crypto/session/widget', request);
  }

  // ────────────────────────────────────────────
  // Step 7: Transaction tracking
  // ────────────────────────────────────────────

  /**
   * Get transaction details by ID.
   */
  async getTransaction(transactionId: string): Promise<MeldTransaction> {
    return this.get<MeldTransaction>(`/payments/transactions/${transactionId}`);
  }

  /**
   * List recent transactions.
   */
  async getTransactions(): Promise<MeldTransaction[]> {
    return this.get<MeldTransaction[]>('/payments/transactions');
  }
}

export default MeldApi;
