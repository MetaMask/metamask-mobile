import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import { resolveRampOrderTarget } from './resolveRampOrderTarget';

const fiatBase = {
  id: 'fiat-1',
  createdAt: 1,
  amount: '10',
  currency: 'USD',
  cryptocurrency: 'ETH',
  account: '0xabc',
  network: '1',
  excludeFromPurchases: false,
  orderType: OrderOrderTypeEnum.Buy,
  data: {},
} as FiatOrder;

const rampsBase: RampsOrder = {
  isOnlyLink: false,
  success: true,
  cryptoAmount: '1',
  fiatAmount: 10,
  providerOrderId: 'po-1',
  providerOrderLink: 'https://example.com',
  createdAt: 1,
  totalFeesFiat: 1,
  txHash: '0xhash',
  walletAddress: '0xabc',
  status: RampsOrderStatus.Completed,
  network: { name: 'Ethereum', chainId: 'eip155:1' },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '',
  orderType: 'BUY',
  id: '/providers/transak/orders/po-1',
};

describe('resolveRampOrderTarget', () => {
  it('routes native RampsOrder to ramps-v2-details', () => {
    expect(resolveRampOrderTarget(rampsBase)).toBe('ramps-v2-details');
  });

  it('routes DEPOSIT CREATED FiatOrder to deposit-resume-buy', () => {
    expect(
      resolveRampOrderTarget({
        ...fiatBase,
        provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
        state: FIAT_ORDER_STATES.CREATED,
      }),
    ).toBe('deposit-resume-buy');
  });

  it('routes DEPOSIT completed FiatOrder to deposit-details', () => {
    expect(
      resolveRampOrderTarget({
        ...fiatBase,
        provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
        state: FIAT_ORDER_STATES.COMPLETED,
      }),
    ).toBe('deposit-details');
  });

  it('routes legacy RAMPS_V2 FiatOrder to ramps-v2-details', () => {
    expect(
      resolveRampOrderTarget({
        ...fiatBase,
        provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
        state: FIAT_ORDER_STATES.COMPLETED,
      }),
    ).toBe('ramps-v2-details');
  });

  it('routes aggregator FiatOrder to aggregator-details', () => {
    expect(
      resolveRampOrderTarget({
        ...fiatBase,
        provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
        state: FIAT_ORDER_STATES.COMPLETED,
      }),
    ).toBe('aggregator-details');
  });
});
