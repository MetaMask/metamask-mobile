import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import { getOrders } from '../../../../reducers/fiatOrders';
import { useRampsOrders } from '../../../UI/Ramp/hooks/useRampsOrders';
import { useRampActivityItems } from './useRampActivityItems';

jest.mock('../../../UI/Ramp/hooks/useRampsOrders', () => ({
  useRampsOrders: jest.fn(() => ({ orders: [] })),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../reducers/fiatOrders'),
  getOrders: jest.fn(),
  getProviderName: jest.fn(() => 'MockProvider'),
}));

const buyOrder: FiatOrder = {
  id: 'order-1',
  provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
  createdAt: 1,
  amount: '6.27',
  fee: '1.26',
  cryptoAmount: '5.01',
  currency: 'USD',
  cryptocurrency: 'mUSD',
  state: FIAT_ORDER_STATES.COMPLETED,
  account: '0x1234567890abcdef1234567890abcdef12345678',
  network: '1',
  txHash: '0xbuyhash',
  excludeFromPurchases: false,
  orderType: OrderOrderTypeEnum.Buy,
  data: {},
} as FiatOrder;

const mockedUseRampsOrders = jest.mocked(useRampsOrders);

const createV2Order = (overrides: Partial<RampsOrder> = {}): RampsOrder => ({
  isOnlyLink: false,
  success: true,
  cryptoAmount: '5.01',
  fiatAmount: 6.27,
  providerOrderId: 'v2-order-1',
  providerOrderLink: 'https://example.com/order/1',
  createdAt: 1,
  totalFeesFiat: 1.26,
  txHash: '0xbuyhash',
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  status: RampsOrderStatus.Completed,
  network: { name: 'Ethereum', chainId: 'eip155:1' },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '5-10 minutes',
  orderType: 'BUY',
  ...overrides,
});

describe('useRampActivityItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case getOrders:
          return [buyOrder];
        default:
          return undefined;
      }
    });
  });

  it('maps fiat orders to activity list items', () => {
    const { result } = renderHook(() => useRampActivityItems());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      type: 'buy',
      chainId: 'eip155:1',
      hash: '0xbuyhash',
      raw: { type: 'rampOrder', data: buyOrder },
      data: { token: { amount: '5.01', symbol: 'mUSD', direction: 'in' } },
    });
  });

  it('filters orders that the adapter skips', () => {
    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case getOrders:
          return [
            buyOrder,
            { ...buyOrder, id: 'excluded', excludeFromPurchases: true },
          ];
        default:
          return undefined;
      }
    });

    const { result } = renderHook(() => useRampActivityItems());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].hash).toBe('0xbuyhash');
  });

  it('includes v2 controller orders resolved by canonical order id', () => {
    const v2Order = createV2Order({
      id: '/providers/transak/orders/v2-order-1',
      providerOrderId: 'v2-order-1',
    });
    mockedUseRampsOrders.mockReturnValue({
      orders: [v2Order],
    } as ReturnType<typeof useRampsOrders>);
    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case getOrders:
          return [];
        default:
          return undefined;
      }
    });

    const { result } = renderHook(() => useRampActivityItems());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      type: 'buy',
      hash: '0xbuyhash',
    });
  });
});
