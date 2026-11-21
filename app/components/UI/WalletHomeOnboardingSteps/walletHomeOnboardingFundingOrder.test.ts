import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../constants/on-ramp';
import type { FiatOrder } from '../../../reducers/fiatOrders';
import { selectHasWalletHomeOnboardingFundingOrder } from './walletHomeOnboardingFundingOrder';

const ELIGIBLE_AT = 1_700_000_000_000;
const AFTER_ELIGIBLE = ELIGIBLE_AT + 60_000;
const BEFORE_ELIGIBLE = ELIGIBLE_AT - 60_000;

const createRampsOrder = (overrides: Partial<RampsOrder> = {}): RampsOrder => ({
  isOnlyLink: false,
  success: true,
  cryptoAmount: '0.5',
  fiatAmount: 100,
  providerOrderId: 'order-1',
  providerOrderLink: 'https://example.com/order/1',
  createdAt: AFTER_ELIGIBLE,
  totalFeesFiat: 5,
  txHash: '0xabc',
  walletAddress: '0x1234',
  status: RampsOrderStatus.Pending,
  network: { name: 'Ethereum', chainId: 'eip155:1' },
  canBeUpdated: true,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '5-10 minutes',
  orderType: 'BUY',
  ...overrides,
});

const createFiatOrder = (overrides: Partial<FiatOrder> = {}): FiatOrder => ({
  id: 'legacy-order-1',
  provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
  createdAt: AFTER_ELIGIBLE,
  amount: 100,
  currency: 'USD',
  cryptocurrency: 'ETH',
  state: FIAT_ORDER_STATES.PENDING,
  account: '0x1234',
  network: '1',
  excludeFromPurchases: false,
  orderType: OrderOrderTypeEnum.Buy,
  data: createRampsOrder(),
  ...overrides,
});

const hasFundingOrder = ({
  rampsOrders = [],
  fiatOrders = [],
  eligibleAt = ELIGIBLE_AT,
}: {
  rampsOrders?: RampsOrder[];
  fiatOrders?: FiatOrder[];
  eligibleAt?: number | null;
}): boolean =>
  selectHasWalletHomeOnboardingFundingOrder.resultFunc(
    rampsOrders,
    fiatOrders,
    eligibleAt,
  );

describe('selectHasWalletHomeOnboardingFundingOrder', () => {
  it('returns false when there are no orders', () => {
    expect(hasFundingOrder({})).toBe(false);
  });

  it.each([RampsOrderStatus.Pending, RampsOrderStatus.Completed])(
    'returns true for a %s V2 order placed after eligibility',
    (status) => {
      expect(
        hasFundingOrder({ rampsOrders: [createRampsOrder({ status })] }),
      ).toBe(true);
    },
  );

  it.each([
    RampsOrderStatus.Precreated,
    RampsOrderStatus.Created,
    RampsOrderStatus.Unknown,
    RampsOrderStatus.Failed,
    RampsOrderStatus.Cancelled,
    RampsOrderStatus.IdExpired,
  ])('returns false for a %s V2 order', (status) => {
    expect(
      hasFundingOrder({ rampsOrders: [createRampsOrder({ status })] }),
    ).toBe(false);
  });

  it('returns false for a paid V2 order placed before eligibility', () => {
    expect(
      hasFundingOrder({
        rampsOrders: [createRampsOrder({ createdAt: BEFORE_ELIGIBLE })],
      }),
    ).toBe(false);
  });

  it('counts any paid order when the eligibility time is unknown', () => {
    expect(
      hasFundingOrder({
        rampsOrders: [createRampsOrder({ createdAt: BEFORE_ELIGIBLE })],
        eligibleAt: null,
      }),
    ).toBe(true);
  });

  it.each([FIAT_ORDER_STATES.PENDING, FIAT_ORDER_STATES.COMPLETED])(
    'returns true for a %s legacy buy order placed after eligibility',
    (state) => {
      expect(
        hasFundingOrder({ fiatOrders: [createFiatOrder({ state })] }),
      ).toBe(true);
    },
  );

  it.each([
    FIAT_ORDER_STATES.CREATED,
    FIAT_ORDER_STATES.FAILED,
    FIAT_ORDER_STATES.CANCELLED,
  ])('returns false for a %s legacy order', (state) => {
    expect(hasFundingOrder({ fiatOrders: [createFiatOrder({ state })] })).toBe(
      false,
    );
  });

  it('returns false for a legacy sell order', () => {
    expect(
      hasFundingOrder({
        fiatOrders: [createFiatOrder({ orderType: OrderOrderTypeEnum.Sell })],
      }),
    ).toBe(false);
  });

  it('returns false for a paid legacy order placed before eligibility', () => {
    expect(
      hasFundingOrder({
        fiatOrders: [createFiatOrder({ createdAt: BEFORE_ELIGIBLE })],
      }),
    ).toBe(false);
  });
});
