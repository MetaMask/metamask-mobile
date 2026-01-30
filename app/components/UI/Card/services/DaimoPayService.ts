import Logger from '../../../../util/Logger';
import { isSameOrigin } from '../../../../util/url';
import { CardError, CardErrorType } from '../types';
import { getDaimoEnvironment } from '../util/getDaimoEnvironment';
import { CardSDK } from '../sdk/CardSDK';

const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

export const DAIMO_WEBVIEW_BASE_URL =
  'https://miniapp.daimo.com/metamask/embed';

export const DAIMO_ALLOWED_ORIGIN = 'https://miniapp.daimo.com';

const DAIMO_DEMO_API_URL = 'https://pay.daimo.com/api/payment';
const DAIMO_DEMO_API_KEY = 'pay-demo';

const DEMO_PAYMENT_CONFIG = {
  amount: '0.25',
  currency: 'USD',
  intent: 'MetaMask Metal Card Purchase (Test)',
};

export interface DaimoPaymentResponse {
  payId: string;
}

export interface DaimoPaymentStatusResponse {
  status: 'pending' | 'completed' | 'failed' | 'expired';
  transactionHash?: string;
  chainId?: number;
  errorMessage?: string;
}

export type DaimoPayEventType =
  | 'modalOpened'
  | 'modalClosed'
  | 'paymentStarted'
  | 'paymentCompleted'
  | 'paymentBounced';

export interface DaimoPayEventPayload {
  paymentId?: string;
  chainId?: number;
  txHash?: string;
  transactionUrl?: string;
  payment?: unknown;
  errorMessage?: string;
  error?: string;
  reason?: string;
}

export interface DaimoPayEvent {
  source: 'daimo-pay';
  version: number;
  type: DaimoPayEventType;
  payload: DaimoPayEventPayload;
}

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

const createDemoPayment = async (): Promise<DaimoPaymentResponse> => {
  const config = DEMO_PAYMENT_CONFIG;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Api-Key': DAIMO_DEMO_API_KEY,
  };

  const requestBody = {
    display: {
      intent: config.intent,
      paymentValue: config.amount,
      currency: config.currency,
      paymentOptions: ['MetaMask'],
    },
    destination: {
      destinationAddress: '0x9E16319A3895f88e74f3b4deA012516df8a75CdC',
      chainId: 59144,
      tokenAddress: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
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

const createProductionPayment = async (
  cardSDK: CardSDK,
): Promise<DaimoPaymentResponse> => {
  try {
    const orderResponse = await cardSDK.createOrder();

    Logger.log('DaimoPayService: Production order created', {
      orderId: orderResponse.orderId,
      paymentConfig: orderResponse.paymentConfig,
    });

    return {
      payId: orderResponse.orderId,
    };
  } catch (error) {
    Logger.error(
      error as Error,
      'DaimoPayService: Failed to create production payment',
    );

    if (error instanceof CardError) {
      throw error;
    }

    throw new CardError(
      CardErrorType.SERVER_ERROR,
      'Failed to create payment order. Please try again.',
      error instanceof Error ? error : undefined,
    );
  }
};

const mapOrderStatusToPaymentStatus = (
  status: string,
): DaimoPaymentStatusResponse['status'] => {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
    case 'REFUNDED':
      return 'failed';
    case 'EXPIRED':
      return 'expired';
    case 'PENDING':
    default:
      return 'pending';
  }
};

const pollProductionPaymentStatus = async (
  cardSDK: CardSDK,
  orderId: string,
): Promise<DaimoPaymentStatusResponse> => {
  try {
    const statusResponse = await cardSDK.getOrderStatus(orderId);

    return {
      status: mapOrderStatusToPaymentStatus(statusResponse.status),
      transactionHash: statusResponse.metadata?.txHash,
      errorMessage:
        statusResponse.status === 'FAILED' ||
        statusResponse.status === 'REFUNDED'
          ? statusResponse.metadata?.note
          : undefined,
    };
  } catch (error) {
    Logger.error(
      error as Error,
      'DaimoPayService: Failed to poll production payment status',
    );

    if (error instanceof CardError) {
      throw error;
    }

    throw new CardError(
      CardErrorType.SERVER_ERROR,
      'Failed to check payment status. Please try again.',
      error instanceof Error ? error : undefined,
    );
  }
};

export interface DaimoPayServiceOptions {
  cardSDK?: CardSDK;
  isDaimoDemo?: boolean;
}

export const DaimoPayService = {
  createPayment: async (
    options?: DaimoPayServiceOptions,
  ): Promise<DaimoPaymentResponse> => {
    if (getDaimoEnvironment(options?.isDaimoDemo ?? false) === 'demo') {
      return createDemoPayment();
    }

    if (!options?.cardSDK) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        'CardSDK is required for payments',
      );
    }
    return createProductionPayment(options.cardSDK);
  },

  pollPaymentStatus: async (
    payId: string,
    options?: DaimoPayServiceOptions,
  ): Promise<DaimoPaymentStatusResponse> => {
    if (getDaimoEnvironment(options?.isDaimoDemo ?? false) === 'demo') {
      return {
        status: 'pending',
      };
    }

    if (!options?.cardSDK) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        'CardSDK is required for status polling',
      );
    }

    return pollProductionPaymentStatus(options.cardSDK, payId);
  },

  buildWebViewUrl: (
    payId: string,
    paymentOptions: string = 'Metamask',
  ): string =>
    `${DAIMO_WEBVIEW_BASE_URL}?payId=${encodeURIComponent(payId)}&paymentOptions=${encodeURIComponent(paymentOptions)}`,

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

  shouldLoadInWebView: (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.origin === DAIMO_ALLOWED_ORIGIN;
    } catch {
      return false;
    }
  },

  isValidMessageOrigin: (origin: string): boolean =>
    isSameOrigin(origin, DAIMO_ALLOWED_ORIGIN),
};

export default DaimoPayService;
