import {
  DepositCryptoCurrency,
  DepositFiatCurrency,
  DepositPaymentMethod,
  SUPPORTED_DEPOSIT_TOKENS,
} from '../constants';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { renderNumber } from '../../../../../util/number';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import I18n, { strings } from '../../../../../../locales/i18n';
import { DepositOrder } from '@consensys/native-ramps-sdk';

const emailRegex =
  /^[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

export const validateEmail = function (email: string) {
  if (!email || email.split('@').length !== 2) return false;
  return emailRegex.test(email);
};

const TRANSAK_CRYPTO_IDS: Record<string, string> = {
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'USDC',
  'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
};

const TRANSAK_FIAT_IDS: Record<string, string> = {
  USD: 'USD',
  EUR: 'EUR',
};

const TRANSAK_CHAIN_IDS: Record<string, string> = {
  'eip155:1': 'ethereum',
};

const TRANSAK_PAYMENT_METHOD_IDS: Record<string, string> = {
  credit_debit_card: 'credit_debit_card',
  sepa_bank_transfer: 'sepa_bank_transfer',
  apple_pay: 'apple_pay',
};

/**
 * Transforms our internal crypto currency ID to Transak crypto currency ID
 * @param cryptoCurrency - The crypto currency object
 * @returns The Transak crypto currency ID
 */
export function getTransakCryptoCurrencyId(
  cryptoCurrency: DepositCryptoCurrency,
): string {
  const transakId = TRANSAK_CRYPTO_IDS[cryptoCurrency.assetId];
  if (!transakId) {
    throw new Error(`Unsupported crypto currency: ${cryptoCurrency.assetId}`);
  }
  return transakId;
}

/**
 * Transforms our internal fiat currency ID to Transak fiat currency ID
 * @param fiatCurrency - The fiat currency object
 * @returns The Transak fiat currency ID
 */
export function getTransakFiatCurrencyId(
  fiatCurrency: DepositFiatCurrency,
): string {
  const transakId = TRANSAK_FIAT_IDS[fiatCurrency.id];
  if (!transakId) {
    throw new Error(`Unsupported fiat currency: ${fiatCurrency.id}`);
  }
  return transakId;
}

/**
 * Transforms our internal chain ID to Transak chain ID
 * @param chainId - The chain ID
 * @returns The Transak chain ID
 */
export function getTransakChainId(chainId: string): string {
  const transakId = TRANSAK_CHAIN_IDS[chainId];
  if (!transakId) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  return transakId;
}

/**
 * Transforms our internal payment method ID to Transak payment method ID
 * @param paymentMethod - The payment method object
 * @returns The Transak payment method ID
 */
export function getTransakPaymentMethodId(
  paymentMethod: DepositPaymentMethod,
): string {
  const transakId = TRANSAK_PAYMENT_METHOD_IDS[paymentMethod.id];
  if (!transakId) {
    throw new Error(`Unsupported payment method: ${paymentMethod.id}`);
  }
  return transakId;
}

/**
 * Formats currency amounts using the device's locale
 * @param amount - The amount to format (number or string)
 * @param currency - The currency code (e.g., 'USD', 'EUR')
 * @param options - Additional formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | string,
  currency: string,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency || 'USD',
      currencyDisplay: 'symbol',
    };

    return getIntlNumberFormatter(I18n.locale, {
      ...defaultOptions,
      ...options,
    }).format(numAmount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return amount.toString();
  }
}

const NOTIFICATION_DURATION = 5000;

const baseNotificationDetails = {
  duration: NOTIFICATION_DURATION,
};

/**
 * Get notification details for deposit orders
 * @param {FiatOrder} fiatOrder
 */
export const getNotificationDetails = (fiatOrder: FiatOrder) => {
  switch (fiatOrder.state) {
    case FIAT_ORDER_STATES.FAILED: {
      return {
        ...baseNotificationDetails,
        title: strings('deposit.notifications.deposit_failed_title', {
          currency: fiatOrder.cryptocurrency,
        }),
        description: strings(
          'deposit.notifications.deposit_failed_description',
        ),
        status: 'error',
      };
    }
    case FIAT_ORDER_STATES.CANCELLED: {
      return {
        ...baseNotificationDetails,
        title: strings('deposit.notifications.deposit_cancelled_title'),
        description: strings(
          'deposit.notifications.deposit_cancelled_description',
        ),
        status: 'cancelled',
      };
    }
    case FIAT_ORDER_STATES.COMPLETED: {
      return {
        ...baseNotificationDetails,
        title: strings('deposit.notifications.deposit_completed_title', {
          amount: renderNumber(String(fiatOrder.cryptoAmount)),
          currency: fiatOrder.cryptocurrency,
        }),
        description: strings(
          'deposit.notifications.deposit_completed_description',
          {
            currency: fiatOrder.cryptocurrency,
          },
        ),
        status: 'success',
      };
    }
    case FIAT_ORDER_STATES.CREATED: {
      return null;
    }
    case FIAT_ORDER_STATES.PENDING:
    default: {
      return {
        ...baseNotificationDetails,
        title: strings('deposit.notifications.deposit_pending_title', {
          currency: fiatOrder.cryptocurrency,
        }),
        description: strings(
          'deposit.notifications.deposit_pending_description',
        ),
        status: 'pending',
      };
    }
  }
};

const TRANSAK_ID_TO_ASSET_ID: Record<string, string> = Object.fromEntries(
  Object.entries(TRANSAK_CRYPTO_IDS).map(([assetId, transakId]) => [
    transakId,
    assetId,
  ]),
);

/**
 * Transforms Transak crypto currency ID back to our internal crypto currency object
 * @param transakCryptoId - The Transak crypto currency ID (e.g., 'USDC', 'USDT')
 * @returns The internal DepositCryptoCurrency object
 */
export function getCryptoCurrencyFromTransakId(
  transakCryptoId: string,
): DepositCryptoCurrency | null {
  const assetId = TRANSAK_ID_TO_ASSET_ID[transakCryptoId];

  if (!assetId) {
    return null;
  }

  return (
    SUPPORTED_DEPOSIT_TOKENS.find((token) => token.assetId === assetId) || null
  );
}

/**
 * Type guard to check if data object has a specific field from DepositOrder
 * @param data - The data to check
 * @param field - The field to check for existence
 * @returns True if data object has the specified field, false otherwise
 */
export const hasDepositOrderField = (
  data: unknown,
  field: keyof DepositOrder,
): data is DepositOrder => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  const depositOrder = data as Record<string, unknown>;

  return field in depositOrder && depositOrder[field] !== undefined;
};
