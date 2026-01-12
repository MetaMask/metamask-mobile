import Logger from '../../../../util/Logger';
import { CardError, CardErrorType } from '../types';
import {
  getDaimoEnvironment,
  isDaimoProduction,
} from '../util/getDaimoEnvironment';

// Constants
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
const DAIMO_DEMO_API_URL = 'https://pay.daimo.com/api/payment';
const DAIMO_DEMO_API_KEY = 'pay-demo';

// Daimo WebView base URL
export const DAIMO_WEBVIEW_BASE_URL =
  'https://miniapp.daimo.com/metamask/embed';

// Payment configuration per environment
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PRODUCTION_PAYMENT_CONFIG = {
  amount: '199.00',
  currency: 'USD',
  intent: 'MetaMask Metal Card Purchase',
};

const DEMO_PAYMENT_CONFIG = {
  amount: '0.25',
  currency: 'USD',
  intent: 'MetaMask Metal Card Purchase (Test)',
};

/**
 * Response from creating a Daimo payment
 */
export interface DaimoPaymentResponse {
  /** The payment ID to use in the WebView */
  payId: string;
}

/**
 * Payment status response from polling
 */
export interface DaimoPaymentStatusResponse {
  /** Current status of the payment */
  status: 'pending' | 'completed' | 'failed' | 'expired';
  /** Transaction hash if completed */
  transactionHash?: string;
  /** Chain ID where the transaction occurred */
  chainId?: number;
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Daimo Pay event types from WebView postMessage
 */
export type DaimoPayEventType =
  | 'modalOpened'
  | 'modalClosed'
  | 'paymentStarted'
  | 'paymentCompleted'
  | 'paymentBounced';

/**
 * Daimo Pay event payload from WebView
 */
export interface DaimoPayEventPayload {
  paymentId?: string;
  chainId?: number;
  txHash?: string;
  transactionUrl?: string;
  payment?: unknown;
}

/**
 * Daimo Pay event from WebView postMessage
 */
export interface DaimoPayEvent {
  source: 'daimo-pay';
  version: number;
  type: DaimoPayEventType;
  payload: DaimoPayEventPayload;
}

/**
 * Creates a fetch request with timeout handling
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CardError(
        CardErrorType.TIMEOUT_ERROR,
        'Payment request timed out. Please check your connection.',
        error,
      );
    }
    throw error;
  }
};

/**
 * Creates a Daimo payment using the demo API
 * Used in non-production environments (dev, test, e2e, exp)
 */
const createDemoPayment = async (): Promise<DaimoPaymentResponse> => {
  const config = DEMO_PAYMENT_CONFIG;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Api-Key': DAIMO_DEMO_API_KEY,
  };

  // Demo API request body following Daimo's format
  const requestBody = {
    display: {
      intent: config.intent,
      paymentValue: config.amount,
      currency: config.currency,
      paymentOptions: ['MetaMask'],
    },
    destination: {
      // Demo destination - these values are for testing only
      // In production, Baanx will provide the actual destination
      destinationAddress: '0x0000000000000000000000000000000000000000',
      chainId: 59144, // Linea
      tokenAddress: '0xaca92e438df0b2401ff60da7e4337b687a2435da', // mUSD on Linea
      amountUnits: config.amount,
    },
  };

  try {
    const response = await fetchWithTimeout(DAIMO_DEMO_API_URL, {
      method: 'POST',
      credentials: 'omit',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      Logger.error(
        new Error(`Daimo demo API error: ${response.status}`),
        `DaimoPayService: Demo payment creation failed. Response: ${errorText}`,
      );
      throw new CardError(
        CardErrorType.SERVER_ERROR,
        `Failed to create payment: ${response.status}`,
      );
    }

    const data = await response.json();

    if (!data.id) {
      throw new CardError(
        CardErrorType.SERVER_ERROR,
        'Invalid response from Daimo API: missing payment ID',
      );
    }

    return {
      payId: data.id,
    };
  } catch (error) {
    if (error instanceof CardError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new CardError(
        CardErrorType.NETWORK_ERROR,
        'Network error while creating payment. Please check your connection.',
        error,
      );
    }

    throw new CardError(
      CardErrorType.UNKNOWN_ERROR,
      'An unexpected error occurred while creating payment.',
    );
  }
};

/**
 * Creates a Daimo payment using the Baanx production API
 * Used in production and rc environments
 *
 * TODO: Implement once Baanx API endpoints are available
 */
const createProductionPayment = async (): Promise<DaimoPaymentResponse> => {
  // Production uses fixed $199 USD for Metal Card purchase (PRODUCTION_PAYMENT_CONFIG)

  // TODO: Implement Baanx API integration
  // The endpoint will be something like:
  // POST ${baseUrl}/v1/card/daimo/payment
  //
  // const apiKey = process.env.MM_CARD_BAANX_API_CLIENT_KEY;
  // const baseUrl = getDefaultBaanxApiBaseUrlForMetaMaskEnv(process.env.METAMASK_ENVIRONMENT);

  Logger.log(
    'DaimoPayService: Production payment creation not yet implemented',
  );

  throw new CardError(
    CardErrorType.SERVER_ERROR,
    'Production payment integration is pending development. Please try again later.',
  );
};

/**
 * Polls the payment status using the Baanx production API
 * Used in production and rc environments
 *
 * TODO: Implement once Baanx API endpoints are available
 */
const pollProductionPaymentStatus = async (
  _payId: string,
): Promise<DaimoPaymentStatusResponse> => {
  // TODO: Implement Baanx API integration
  // The endpoint will be something like:
  // GET ${baseUrl}/v1/card/daimo/payment/${payId}/status
  //
  // const apiKey = process.env.MM_CARD_BAANX_API_CLIENT_KEY;
  // const baseUrl = getDefaultBaanxApiBaseUrlForMetaMaskEnv(process.env.METAMASK_ENVIRONMENT);

  Logger.log(
    'DaimoPayService: Production payment status polling not yet implemented',
  );

  throw new CardError(
    CardErrorType.SERVER_ERROR,
    'Production payment status polling is pending development.',
  );
};

/**
 * DaimoPayService - Handles Daimo Pay integration for card purchases
 *
 * Environment-based behavior:
 * - Demo (dev/test/e2e/exp): Uses Daimo's demo API directly
 * - Production (production/rc): Uses Baanx API for payment creation and status polling
 */
export const DaimoPayService = {
  /**
   * Creates a new Daimo payment for Metal Card purchase
   * - Production: $199 USD
   * - Demo: $0.10 USD (test value)
   *
   * @returns Promise resolving to payment response with payId
   */
  createPayment: async (): Promise<DaimoPaymentResponse> => {
    const environment = getDaimoEnvironment();
    Logger.log(`DaimoPayService: Creating payment in ${environment} mode`);

    if (isDaimoProduction()) {
      return createProductionPayment();
    }

    return createDemoPayment();
  },

  /**
   * Polls the payment status (production only)
   * In demo mode, status is determined via WebView events
   *
   * @param payId - The payment ID to check
   * @returns Promise resolving to payment status
   */
  pollPaymentStatus: async (
    payId: string,
  ): Promise<DaimoPaymentStatusResponse> => {
    if (!isDaimoProduction()) {
      // In demo mode, we rely on WebView events for status
      return {
        status: 'pending',
      };
    }

    return pollProductionPaymentStatus(payId);
  },

  /**
   * Builds the Daimo WebView URL with the payment ID
   *
   * @param payId - The payment ID
   * @param paymentOptions - Optional payment options (default: 'Metamask')
   * @returns The full WebView URL
   */
  buildWebViewUrl: (
    payId: string,
    paymentOptions: string = 'Metamask',
  ): string =>
    `${DAIMO_WEBVIEW_BASE_URL}?payId=${encodeURIComponent(payId)}&paymentOptions=${encodeURIComponent(paymentOptions)}`,

  /**
   * Parses a Daimo Pay event from WebView postMessage data
   *
   * @param data - The raw data from WebView onMessage
   * @returns The parsed event or null if not a valid Daimo event
   */
  parseWebViewEvent: (data: string): DaimoPayEvent | null => {
    try {
      const parsed = JSON.parse(data);

      if (parsed?.source !== 'daimo-pay') {
        return null;
      }

      return parsed as DaimoPayEvent;
    } catch {
      return null;
    }
  },

  /**
   * Checks if a URL should be handled by the WebView or opened externally
   * External wallet deep links should be opened via Linking.openURL
   *
   * @param url - The URL to check
   * @returns true if the URL should be loaded in WebView, false if it should be opened externally
   */
  shouldLoadInWebView: (url: string): boolean =>
    url.includes('miniapp.daimo.com'),

  /**
   * Gets the current Daimo environment
   */
  getEnvironment: getDaimoEnvironment,

  /**
   * Checks if currently in production mode
   */
  isProduction: isDaimoProduction,
};

export default DaimoPayService;
