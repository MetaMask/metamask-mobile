import { DepositOrder } from '@consensys/native-ramps-sdk';
import {
  ALL_DEPOSIT_TOKENS,
  ALL_PAYMENT_METHODS,
  DepositCryptoCurrency,
  DepositFiatCurrency,
  DepositPaymentMethod,
  MUSD_LINEA_TOKEN,
  MUSD_TOKEN,
  USDC_BASE_TOKEN,
  USDC_BSC_TOKEN,
  USDC_LINEA_TOKEN,
  USDC_SOLANA_TOKEN,
  USDC_TOKEN,
  USDT_BASE_TOKEN,
  USDT_BSC_TOKEN,
  USDT_LINEA_TOKEN,
  USDT_SOLANA_TOKEN,
  USDT_TOKEN,
} from '../constants';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { renderNumber } from '../../../../../util/number';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import I18n, { strings } from '../../../../../../locales/i18n';
import { AppThemeKey, Colors } from '../../../../../util/theme/models';
import { CaipAssetReference, CaipChainId } from '@metamask/utils';
import {
  BASE_MAINNET,
  BSC_MAINNET,
  ETHEREUM_MAINNET,
  LINEA_MAINNET,
  SOLANA_MAINNET,
} from '../constants/networks';

const emailRegex =
  /^[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

export const validateEmail = function (email: string) {
  if (!email || email.split('@').length !== 2) return false;
  return emailRegex.test(email);
};

const TRANSAK_CRYPTO_IDS: Record<string, string> = {
  [MUSD_TOKEN.assetId]: 'MUSD',
  [MUSD_LINEA_TOKEN.assetId]: 'MUSD',
  [USDC_TOKEN.assetId]: 'USDC',
  [USDC_LINEA_TOKEN.assetId]: 'USDC',
  [USDC_BASE_TOKEN.assetId]: 'USDC',
  [USDC_BSC_TOKEN.assetId]: 'USDC',
  [USDC_SOLANA_TOKEN.assetId]: 'USDC',
  [USDT_TOKEN.assetId]: 'USDT',
  [USDT_LINEA_TOKEN.assetId]: 'USDT',
  [USDT_BASE_TOKEN.assetId]: 'USDT',
  [USDT_BSC_TOKEN.assetId]: 'USDT',
  [USDT_SOLANA_TOKEN.assetId]: 'USDT',
};

const TRANSAK_FIAT_IDS: Record<string, string> = {
  USD: 'USD',
  EUR: 'EUR',
};

const TRANSAK_CHAIN_IDS: Record<CaipChainId, string> = {
  [ETHEREUM_MAINNET.chainId]: 'ethereum',
  [LINEA_MAINNET.chainId]: 'linea',
  [BASE_MAINNET.chainId]: 'base',
  [BSC_MAINNET.chainId]: 'bsc',
  [SOLANA_MAINNET.chainId]: 'solana',
};

const TRANSAK_PAYMENT_METHOD_IDS: Record<string, string> = {
  credit_debit_card: 'credit_debit_card',
  sepa_bank_transfer: 'sepa_bank_transfer',
  apple_pay: 'apple_pay',
  wire_transfer: 'pm_wire',
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
export function getTransakChainId(chainId: CaipChainId): string {
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
 * Finds a payment method by its Transak ID
 * @param transakId - The Transak payment method ID
 */
export function getPaymentMethodByTransakId(
  transakId: string,
): DepositPaymentMethod | undefined {
  return ALL_PAYMENT_METHODS.find(
    (method) => getTransakPaymentMethodId(method) === transakId,
  );
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

const TRANSAK_ID_TO_ASSET_ID: Record<
  `${string}/${string}`,
  CaipAssetReference
> = {
  'ethereum/usdc': USDC_TOKEN.assetId,
  'linea/usdc': USDC_LINEA_TOKEN.assetId,
  'base/usdc': USDC_BASE_TOKEN.assetId,
  'bsc/usdc': USDC_BSC_TOKEN.assetId,
  'solana/usdc': USDC_SOLANA_TOKEN.assetId,
  'ethereum/usdt': USDT_TOKEN.assetId,
  'linea/usdt': USDT_LINEA_TOKEN.assetId,
  'base/usdt': USDT_BASE_TOKEN.assetId,
  'bsc/usdt': USDT_BSC_TOKEN.assetId,
  'solana/usdt': USDT_SOLANA_TOKEN.assetId,
};

/**
 * Transforms Transak crypto currency ID back to our internal crypto currency object
 * @param transakCryptoId - The Transak crypto currency ID (e.g., 'USDC', 'USDT')
 * @returns The internal DepositCryptoCurrency object
 */
export function getCryptoCurrencyFromTransakId(
  transakCryptoId: string,
  transakNetworkId: string,
): DepositCryptoCurrency | null {
  const combinedId =
    `${transakNetworkId}/${transakCryptoId}`.toLowerCase() as `${string}/${string}`;
  const assetId = TRANSAK_ID_TO_ASSET_ID[combinedId];

  if (!assetId) {
    return null;
  }

  return ALL_DEPOSIT_TOKENS.find((token) => token.assetId === assetId) || null;
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

export const generateThemeParameters = (
  themeAppearance: AppThemeKey,
  colors: Colors,
) => {
  const backgroundColors = [
    colors.background.default,
    colors.background.default,
    colors.background.alternative,
  ].join(',');

  const textColors = [
    colors.text.default,
    colors.text.default,
    colors.text.alternative,
  ].join(',');

  const borderColors = [
    colors.border.default,
    colors.border.muted,
    colors.border.muted,
  ].join(',');

  return {
    themeColor: colors.primary.default,
    colorMode: themeAppearance === AppThemeKey.light ? 'LIGHT' : 'DARK',
    backgroundColors,
    textColors,
    borderColors,
    primaryButtonFillColor: colors.icon.default,
    primaryButtonTextColor: colors.icon.inverse,
    surfaceFillColor: colors.background.muted,
  };
};

/**
 * Transforms a timestamp to a Transak format
 * @param timestamp - The timestamp to transform
 * @returns The Transak format
 */
export const timestampToTransakFormat = (timestamp: string) => {
  const transakDate = new Date(Number(timestamp));
  const month = (transakDate.getMonth() + 1).toString().padStart(2, '0');
  const day = transakDate.getDate().toString().padStart(2, '0');
  const year = transakDate.getFullYear();

  return `${day}-${month}-${year}`;
};

export function excludeFromArray<T>(array: T[], exclude: T): T[] {
  return array.filter((item: T) => item !== exclude);
}
