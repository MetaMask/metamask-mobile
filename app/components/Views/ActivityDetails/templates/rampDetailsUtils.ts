import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import type { RampsOrder } from '@metamask/ramps-controller';
import { getIntlDateTimeFormatter } from '../../../../util/intl';
import { renderFiat } from '../../../../util/number/bigint';
import {
  getRampOrderTransactionHash,
  mapRampOrderStatus,
  mapRampOrderType,
  toRampOrderToken,
} from '../../../../util/activity-adapters/adapters/ramp-order-helpers';
import { mapRampsOrderStatus } from '../../../../util/activity-adapters/adapters/ramps-order-helpers';
import I18n, { strings } from '../../../../../locales/i18n';

type RenderFiatCurrencyCode = Parameters<typeof renderFiat>[1];

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

export function formatRampActivityFiatAmount(
  amount: string | number | undefined,
  currency: string,
): string | undefined {
  if (amount === undefined || amount === null || amount === '') {
    return undefined;
  }
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) {
    return `${amount} ${currency}`;
  }
  return renderFiat(
    numericAmount,
    currency.toLowerCase() as RenderFiatCurrencyCode,
  );
}

export function formatRampActivityFiatTotal(
  amount: string | number,
  fee: string | number | undefined,
  currency: string,
) {
  const amountNumber = Number(amount);
  const feeNumber = fee === undefined ? 0 : Number(fee);
  if (Number.isNaN(amountNumber) || Number.isNaN(feeNumber)) {
    return formatRampActivityFiatAmount(amount, currency);
  }
  return formatRampActivityFiatAmount(amountNumber - feeNumber, currency);
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
