import { DepositOrder } from '@consensys/native-ramps-sdk';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { renderNumber } from '../../../../../util/number';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import I18n, { strings } from '../../../../../../locales/i18n';
import { AppThemeKey, Colors } from '../../../../../util/theme/models';

const emailRegex =
  /^[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

export const validateEmail = function (email: string) {
  if (!email || email.split('@').length !== 2) return false;
  return emailRegex.test(email);
};

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
