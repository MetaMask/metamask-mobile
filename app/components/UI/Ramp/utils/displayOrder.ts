import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import {
  type FiatOrder,
  getProviderName,
} from '../../../../reducers/fiatOrders';
import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';

export interface DisplayOrder {
  id: string;
  source: 'legacy' | 'v2';
  providerName: string;
  createdAt: number;
  fiatAmount: number | string;
  fiatCurrencyCode: string;
  cryptoAmount: number | string;
  cryptoCurrencySymbol: string;
  network: string;
  status: string;
  orderType: string;
  account: string;
}

function toEpochMs(value: unknown): number {
  if (typeof value === 'number' && value > 0) return value;
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
}

export function fiatOrderToDisplayOrder(order: FiatOrder): DisplayOrder {
  return {
    id: order.id,
    source: 'legacy',
    providerName: getProviderName(order.provider, order.data),
    createdAt: toEpochMs(order.createdAt),
    fiatAmount: order.amount,
    fiatCurrencyCode: order.currency,
    cryptoAmount: order.cryptoAmount ?? 0,
    cryptoCurrencySymbol: order.cryptocurrency,
    network: order.network,
    status: order.state,
    orderType: order.orderType as string,
    account: order.account,
  };
}

const RAMPS_STATUS_TO_DISPLAY: Record<RampsOrderStatus, string> = {
  [RampsOrderStatus.Pending]: 'PENDING',
  [RampsOrderStatus.Created]: 'CREATED',
  [RampsOrderStatus.Precreated]: 'CREATED',
  [RampsOrderStatus.Unknown]: 'PENDING',
  [RampsOrderStatus.Completed]: 'COMPLETED',
  [RampsOrderStatus.Failed]: 'FAILED',
  [RampsOrderStatus.Cancelled]: 'CANCELLED',
  [RampsOrderStatus.IdExpired]: 'FAILED',
};

export function rampsOrderToDisplayOrder(order: RampsOrder): DisplayOrder {
  return {
    id: order.providerOrderId,
    source: 'v2',
    providerName: order.provider?.name ?? '',
    createdAt: toEpochMs(order.createdAt),
    fiatAmount: order.fiatAmount,
    fiatCurrencyCode: order.fiatCurrency?.symbol ?? '',
    cryptoAmount: order.cryptoAmount,
    cryptoCurrencySymbol: order.cryptoCurrency?.symbol ?? '',
    network: order.network?.chainId ?? '',
    status: RAMPS_STATUS_TO_DISPLAY[order.status] ?? 'PENDING',
    orderType: order.orderType,
    account: order.walletAddress,
  };
}

export function mergeDisplayOrders(
  legacyOrders: FiatOrder[],
  v2Orders: RampsOrder[],
): DisplayOrder[] {
  const v2Ids = new Set(v2Orders.map((o) => o.providerOrderId));

  const legacy = legacyOrders
    .filter((o) => {
      if (o.provider !== FIAT_ORDER_PROVIDERS.RAMPS_V2) return true;
      const providerOrderId = (o.data as RampsOrder)?.providerOrderId ?? o.id;
      return !v2Ids.has(providerOrderId);
    })
    .map(fiatOrderToDisplayOrder);

  const v2 = v2Orders.map(rampsOrderToDisplayOrder);

  return [...legacy, ...v2].sort((a, b) => b.createdAt - a.createdAt);
}
