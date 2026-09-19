import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import type { RampsOrder } from '@metamask/ramps-controller';
import {
  FIAT_ORDER_PROVIDERS as fiatOrderProviders,
  FIAT_ORDER_STATES as fiatOrderStates,
} from '../../../../constants/on-ramp';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import { findRampOrder } from './findRampOrder';

const legacyOrder = {
  id: 'legacy-1',
  provider: fiatOrderProviders.TRANSAK,
  createdAt: 1,
  amount: '10',
  cryptoAmount: '5',
  currency: 'USD',
  cryptocurrency: 'ETH',
  state: fiatOrderStates.COMPLETED,
  account: '0xabc',
  network: '1',
  txHash: '0xlegacyhash',
  excludeFromPurchases: false,
  orderType: OrderOrderTypeEnum.Buy,
  data: {},
} as FiatOrder;

const rampsOrder = {
  id: '/providers/transak/orders/po-1',
  providerOrderId: 'po-1',
  txHash: '0xrampshash',
} as unknown as RampsOrder;

describe('findRampOrder', () => {
  it('returns a v2 order matched by getOrderById', () => {
    const getOrderById = jest.fn().mockReturnValue(rampsOrder);

    const result = findRampOrder('/providers/transak/orders/po-1', {
      legacyOrders: [],
      orders: [],
      getOrderById,
    });

    expect(result).toBe(rampsOrder);
  });

  it('returns a v2 order matched by transaction hash', () => {
    const result = findRampOrder('0xRAMPSHASH', {
      legacyOrders: [],
      orders: [rampsOrder],
    });

    expect(result).toBe(rampsOrder);
  });

  it('returns a legacy FiatOrder matched by transaction hash', () => {
    const result = findRampOrder('0xLEGACYHASH', {
      legacyOrders: [legacyOrder],
      orders: [],
    });

    expect(result).toBe(legacyOrder);
  });

  it('returns undefined when nothing matches', () => {
    const result = findRampOrder('missing', {
      legacyOrders: [],
      orders: [],
    });

    expect(result).toBeUndefined();
  });
});
