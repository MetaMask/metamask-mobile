import { Order, OrderStatusEnum } from '@consensys/on-ramp-sdk';
import {
  OrderOrderTypeEnum,
  SellOrderOrderTypeEnum,
  SellOrderStatusEnum,
} from '@consensys/on-ramp-sdk/dist/API';
import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import { DAY_MS, type ProviderRemovedFiatOrder } from './simulateOrderPolling';

// TRAM-3417 fixtures. Response bodies are copied from the backend design note
// /workspace/tram-3417-status-design.md, "Final response shape" (L181-252):
// local API commit 4608fd9 on top of va-mmcx-onramp-api#1408, not deployed.

export const WALLET = '0x1230000000000000000000000000000000000abc';
export const START_MS = 1_761_955_200_000;

// design L196, L211, L227: fixed English string, not localised by the API.
export const PROVIDER_REMOVED_DESCRIPTION =
  'This provider is no longer available in MetaMask. Check the order status with the provider directly.';

/**
 * `statusReason` is new in the API (design L97, L101, L245). The on-ramp SDK
 * 2.1.12 and ramps-controller 28.1.0 order types do not have it yet, so this
 * narrow extension adds only that field, with only the documented value.
 */
interface ProviderRemovedReason {
  statusReason: 'PROVIDER_REMOVED';
}

/**
 * V1 #1408 UNKNOWN stub for a provider the API cannot resolve that is NOT on
 * the removed list (design L234-235, e.g. koywe today). Plain UNKNOWN: transient.
 */
type UnknownOrderBody = Pick<Order, 'id' | 'isOnlyLink' | 'network'> & {
  status: typeof OrderStatusEnum.Unknown;
  provider: Pick<Order['provider'], 'id'>;
};

/** V1 buy or sell body for a listed removed provider (design L187-200, L218-232). */
type RemovedProviderOrderBody = Omit<UnknownOrderBody, 'status'> &
  Required<Pick<Order, 'statusDescription'>> &
  Partial<Pick<Order, 'canBeUpdated'>> &
  ProviderRemovedReason & {
    status: typeof OrderStatusEnum.Unknown | typeof SellOrderStatusEnum.Unknown;
    orderType: OrderOrderTypeEnum | SellOrderOrderTypeEnum;
  };

/**
 * What RampsController.getOrder resolves to for a V2 UNKNOWN stub: the parsed
 * body spread with `walletAddress` and `providerOrderId` healed in
 * (ramps-controller 28.1.0 dist/RampsController.js L3389-3408).
 */
type HealedStub = Pick<
  RampsOrder,
  'id' | 'isOnlyLink' | 'status' | 'walletAddress' | 'providerOrderId'
> & {
  // The stub sends "" (design L207, L236); RampsOrder types network as an object.
  network: '';
};

/** V2 body for a listed removed provider (design L202-216): no `provider`, on purpose. */
type HealedProviderRemovedStub = HealedStub &
  Required<Pick<RampsOrder, 'statusDescription'>> &
  Pick<RampsOrder, 'orderType'> &
  Partial<Pick<RampsOrder, 'canBeUpdated'>> &
  ProviderRemovedReason;

/** V2 plain stub for an unlisted provider (design L236): `provider` is the bare code. */
type HealedPlainUnknownStub = HealedStub & { provider: string };

/** `canBeUpdated` as sent (design L197, L212 send false), or `'missing'`. */
export type CanBeUpdated = boolean | 'missing';
const canBeUpdatedField = (canBeUpdated: CanBeUpdated) =>
  canBeUpdated === 'missing' ? {} : { canBeUpdated };

export const buildAggregatorOrder = (
  providerCode: string,
  orderCode: string,
  orderType: OrderOrderTypeEnum = OrderOrderTypeEnum.Buy,
): Order => ({
  id: `/providers/${providerCode}/${orderType === OrderOrderTypeEnum.Sell ? 'sell-orders' : 'orders'}/${orderCode}`,
  isOnlyLink: false,
  provider: {
    id: `/providers/${providerCode}`,
    name: providerCode,
  } as Order['provider'],
  success: true,
  cryptoAmount: 0.05,
  fiatAmount: 100,
  cryptoCurrency: { symbol: 'ETH' } as Order['cryptoCurrency'],
  fiatCurrency: { symbol: 'USD', denomSymbol: '$' } as Order['fiatCurrency'],
  providerOrderId: orderCode,
  providerOrderLink: '',
  createdAt: START_MS - DAY_MS,
  paymentMethod: {
    id: '/payments/debit-credit-card',
  } as Order['paymentMethod'],
  totalFeesFiat: 5,
  txHash: '',
  walletAddress: WALLET,
  status: OrderStatusEnum.Pending,
  network: '1',
  canBeUpdated: false,
  idHasExpired: false,
  idExpirationDate: 0,
  excludeFromPurchases: false,
  timeDescriptionPending: '',
  fiatAmountInUsd: 100,
  feesInUsd: 5,
  region: 'US',
  orderType,
  context: 'mobile-ios',
});

export const buildRampsOrder = (
  providerCode: string,
  orderCode: string,
): RampsOrder => ({
  id: `/providers/${providerCode}/orders/${orderCode}`,
  isOnlyLink: false,
  status: RampsOrderStatus.Pending,
  provider: {
    id: providerCode,
    name: providerCode,
    environmentType: 'PRODUCTION' as const,
    description: '',
    hqAddress: '',
    links: [],
    logos: { light: '', dark: '', height: 24, width: 90 },
  },
  fiatCurrency: { symbol: 'USD', decimals: 2, denomSymbol: '$' },
  cryptoCurrency: { symbol: 'ETH', decimals: 18, chainId: 'eip155:1' },
  fiatAmount: 100,
  totalFeesFiat: 5,
  cryptoAmount: 0.05,
  walletAddress: WALLET,
  network: { chainId: '1', name: 'Ethereum Mainnet' },
  createdAt: START_MS - DAY_MS,
  txHash: '',
  excludeFromPurchases: false,
  orderType: 'BUY',
  providerOrderId: orderCode,
  providerOrderLink: '',
  paymentMethod: { id: '/payments/card', name: 'Card' },
  exchangeRate: 2000,
  success: true,
  canBeUpdated: false,
  idHasExpired: false,
  timeDescriptionPending: '',
  statusDescription: '',
});

/** The order as the app stores it before polling: PENDING, no errors yet. */
export const buildStoredOrder = (
  data: Order | RampsOrder,
): ProviderRemovedFiatOrder => {
  const isV2 =
    typeof data.provider?.id === 'string' && !data.provider.id.startsWith('/');
  return {
    id: data.id ?? '',
    provider: isV2
      ? FIAT_ORDER_PROVIDERS.RAMPS_V2
      : FIAT_ORDER_PROVIDERS.AGGREGATOR,
    createdAt: data.createdAt,
    amount: data.fiatAmount,
    fee: data.totalFeesFiat,
    cryptoAmount: data.cryptoAmount,
    cryptoFee: data.totalFeesFiat,
    currency: 'USD',
    currencySymbol: '$',
    cryptocurrency: 'ETH',
    state: FIAT_ORDER_STATES.PENDING,
    account: WALLET,
    network: isV2 ? 'eip155:1' : '1',
    excludeFromPurchases: false,
    orderType: isV2 ? OrderOrderTypeEnum.Buy : (data as Order).orderType,
    errorCount: 0,
    lastTimeFetched: START_MS,
    data,
  };
};

/** V1 plain UNKNOWN body (no statusReason) for `data`'s order. */
export const v1PlainUnknownBody = (data: Order): UnknownOrderBody => ({
  id: data.id,
  isOnlyLink: false,
  provider: { id: data.provider.id },
  status: OrderStatusEnum.Unknown,
  network: '',
});

/** V1 UNKNOWN + PROVIDER_REMOVED body (buy or sell) for `data`'s order. */
export const v1ProviderRemovedBody = (
  data: Order,
  canBeUpdated: CanBeUpdated = false,
): RemovedProviderOrderBody => ({
  ...v1PlainUnknownBody(data),
  statusReason: 'PROVIDER_REMOVED',
  statusDescription: PROVIDER_REMOVED_DESCRIPTION,
  ...canBeUpdatedField(canBeUpdated),
  ...(data.orderType === OrderOrderTypeEnum.Sell
    ? {
        status: SellOrderStatusEnum.Unknown,
        orderType: SellOrderOrderTypeEnum.Sell,
      }
    : { orderType: OrderOrderTypeEnum.Buy }),
});

const healedStub = (data: RampsOrder): HealedStub => ({
  id: (data.id ?? '').replace('/providers/', ''),
  isOnlyLink: false,
  status: RampsOrderStatus.Unknown,
  network: '',
  walletAddress: WALLET,
  providerOrderId: data.providerOrderId,
});

/**
 * getOrder is typed to resolve a full RampsOrder; the stubs are not one
 * (missing fields, string network/provider), so they are cast at this one
 * boundary only.
 */
const asGetOrderResult = (
  stub: HealedProviderRemovedStub | HealedPlainUnknownStub,
): RampsOrder => stub as unknown as RampsOrder;

/** V2 UNKNOWN + PROVIDER_REMOVED result of RampsController.getOrder. */
export const v2ProviderRemovedStub = (
  data: RampsOrder,
  canBeUpdated: CanBeUpdated = false,
): RampsOrder =>
  asGetOrderResult({
    ...healedStub(data),
    statusReason: 'PROVIDER_REMOVED',
    statusDescription: PROVIDER_REMOVED_DESCRIPTION,
    orderType: 'BUY',
    ...canBeUpdatedField(canBeUpdated),
  });

/** V2 plain UNKNOWN result of RampsController.getOrder (string provider). */
export const v2PlainUnknownStub = (data: RampsOrder): RampsOrder =>
  asGetOrderResult({ ...healedStub(data), provider: data.provider?.id ?? '' });

/**
 * The final marker (Tech Lead decision): `providerRemoved: true` and the API's
 * `statusDescription` are stored on the order; its state and stored data
 * (provider, amount, token) are kept, `fetchErrorCount` is 0 (the reply clears
 * it) and `forceUpdate` is false. `errorCount` and `lastTimeFetched` are not checked.
 *
 * @param order - The order after polling.
 * @param stored - The order before polling.
 */
export const expectStoredOrderKept = (
  order: ProviderRemovedFiatOrder,
  stored: ProviderRemovedFiatOrder,
) => {
  const {
    errorCount: _e,
    lastTimeFetched: _l,
    forceUpdate: _u,
    ...kept
  } = stored;
  expect(order).toMatchObject({
    ...kept,
    providerRemoved: true,
    statusDescription: PROVIDER_REMOVED_DESCRIPTION,
    fetchErrorCount: 0,
    forceUpdate: false,
  });
  expect(order.state).toBe(stored.state);
  expect(order.data).toEqual(stored.data);
};
