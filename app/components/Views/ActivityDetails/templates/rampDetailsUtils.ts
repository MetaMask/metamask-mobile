import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import type { RampsOrder } from '@metamask/ramps-controller';
import { getIntlDateTimeFormatter } from '../../../../util/intl';
import { getFormatters } from '../../../hooks/useFormatters';
import {
  getRampOrderTransactionHash,
  mapRampOrderStatus,
  mapRampOrderType,
  toRampOrderToken,
} from '../../../../util/activity-adapters/adapters/ramp-order-helpers';
import { mapRampsOrderStatus } from '../../../../util/activity-adapters/adapters/ramps-order-helpers';
import I18n, { strings } from '../../../../../locales/i18n';

export function isRampSellOrder(order: FiatOrder) {
  return mapRampOrderType(order.orderType) === 'sell';
}

export function getRampActivityTransactionHash(order: FiatOrder) {
  const kind = mapRampOrderType(order.orderType);
  return kind ? getRampOrderTransactionHash(order, kind) : undefined;
}

export function getRampActivityHeroAmount(order: FiatOrder) {
  const amount =
    order.cryptoAmount === undefined ? '0' : String(order.cryptoAmount);
  const sign = isRampSellOrder(order) ? '-' : '+';
  return `${sign}${amount} ${order.cryptocurrency}`;
}

export function getRampActivityHeroToken(order: FiatOrder) {
  return toRampOrderToken(order, isRampSellOrder(order) ? 'out' : 'in');
}

export function getRampActivityExplorerChainId(network: string) {
  if (network && !Number.isNaN(Number(network))) {
    return `eip155:${network}`;
  }
  return network;
}

const ISO_CURRENCY_CODE = /^[a-z]{3}$/iu;

function appendCurrency(text: string, currency: string | undefined) {
  return currency ? `${text} ${currency}` : text;
}

export function formatRampActivityFiatAmount(
  amount: string | number | undefined,
  currency: string | undefined,
): string | undefined {
  if (amount === undefined || amount === null || amount === '') {
    return undefined;
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return appendCurrency(String(amount), currency);
  }
  const formatters = getFormatters();
  if (!currency || !ISO_CURRENCY_CODE.test(currency)) {
    // Intl rejects these codes, and client-utils would then drop the code instead of showing it.
    return appendCurrency(
      formatters.formatNumber(numericAmount, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      currency,
    );
  }
  return formatters.formatCurrencyWithMinThreshold(numericAmount, currency);
}

export function formatRampActivityFiatTotal(
  amount: string | number,
  fee: string | number | undefined,
  currency: string | undefined,
) {
  const amountNumber = Number(amount);
  if (!Number.isFinite(amountNumber)) {
    return formatRampActivityFiatAmount(amount, currency);
  }
  const feeNumber = fee === undefined ? 0 : Number(fee);
  if (!Number.isFinite(feeNumber)) {
    return undefined;
  }
  // Received money can't be negative; without the clamp a tiny negative total renders as "<$0.01".
  return formatRampActivityFiatAmount(
    Math.max(0, amountNumber - feeNumber),
    currency,
  );
}

export function valueOrUnavailable(value: string | undefined) {
  return value ?? strings('transactions.tx_details_not_available');
}

export function mapRampActivityStatus(order: FiatOrder) {
  return mapRampOrderStatus(order.state);
}

export function mapRampsOrderActivityStatus(order: RampsOrder) {
  return mapRampsOrderStatus(order.status);
}

export function formatRampActivityDate(timestamp: number) {
  const date = new Date(timestamp);
  const month = getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
  }).format(date);
  const timeString = getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
  return `${month} ${date.getDate()}, ${date.getFullYear()} at ${timeString}`;
}

/** Matches OrderContent short id: `...` + last 6 chars when longer than 8. */
export function formatShortRampOrderId(orderId: string | undefined): string {
  if (!orderId) {
    return '...';
  }
  return orderId.length > 8 ? `...${orderId.slice(-6)}` : orderId;
}

export function getFiatOrderProviderOrderLink(
  order: FiatOrder,
): string | undefined {
  const data = order.data as { providerOrderLink?: unknown } | undefined;
  return typeof data?.providerOrderLink === 'string'
    ? data.providerOrderLink
    : undefined;
}

/**
 * Provider status copy from Aggregator/Deposit `order.data.statusDescription`
 * (same field OrderDetails Stage / DepositOrderContent render).
 */
export function getFiatOrderStatusDescription(
  order: FiatOrder,
): string | undefined {
  const data = order.data as { statusDescription?: unknown } | undefined;
  return typeof data?.statusDescription === 'string' &&
    data.statusDescription.length > 0
    ? data.statusDescription
    : undefined;
}

/**
 * Native RampsOrder `statusDescription` (OrderContent terminal info row).
 */
export function getRampsOrderStatusDescription(
  order: RampsOrder,
): string | undefined {
  const description = order.statusDescription;
  return typeof description === 'string' && description.length > 0
    ? description
    : undefined;
}
