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

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  getOrders: jest.fn(),
}));

jest.mock('../../../UI/Ramp/hooks/useRampsOrders', () => ({
  useRampsOrders: jest.fn(),
}));

const useRampsOrdersMock = jest.mocked(useRampsOrders);

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

const createMockRampsOrder = (
  overrides: Partial<RampsOrder> = {},
): RampsOrder => ({
  isOnlyLink: false,
  success: true,
  cryptoAmount: '2.5',
  fiatAmount: 50,
  providerOrderId: 'v2-order-1',
  providerOrderLink: 'https://example.com/order/v2-order-1',
  createdAt: 2,
  totalFeesFiat: 1,
  txHash: '0xv2hash',
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  status: RampsOrderStatus.Completed,
  network: { name: 'Ethereum', chainId: '1' },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '5-10 minutes',
  orderType: 'BUY',
  provider: {
    id: 'test-provider',
    name: 'TestProvider',
    environmentType: 'PRODUCTION',
    description: '',
    hqAddress: '',
    logos: { light: '', dark: '' },
    paymentMethods: [],
    supportedCryptoCurrencies: [],
    supportedFiatCurrencies: [],
    supportedCountries: [],
    url: '',
  },
  fiatCurrency: { symbol: 'USD', denomSymbol: '$' },
  cryptoCurrency: { symbol: 'ETH', chainId: '1' },
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
    useRampsOrdersMock.mockReturnValue({
      orders: [],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });
  });

  it('maps legacy fiat orders to activity list items', () => {
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

  it('maps v2 controller orders when legacy redux state is empty', () => {
    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case getOrders:
          return [];
        default:
          return undefined;
      }
    });
    useRampsOrdersMock.mockReturnValue({
      orders: [createMockRampsOrder()],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });

    const { result } = renderHook(() => useRampActivityItems());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      type: 'buy',
      chainId: 'eip155:1',
      hash: '0xv2hash',
      raw: {
        type: 'rampOrder',
        data: expect.objectContaining({
          id: 'v2-order-1',
          provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
          txHash: '0xv2hash',
        }),
      },
      data: { token: { amount: '2.5', symbol: 'ETH', direction: 'in' } },
    });
  });

  it('prefers v2 controller orders over duplicate legacy RAMPS_V2 entries', () => {
    const v2Order = createMockRampsOrder({
      providerOrderId: 'shared-order-id',
      txHash: '0xv2preferred',
    });
    const legacyDuplicate = {
      ...buyOrder,
      id: '/providers/transak/orders/shared-order-id',
      provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
      txHash: '0xlegacyduplicate',
      data: v2Order,
    } as FiatOrder;

    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case getOrders:
          return [legacyDuplicate];
        default:
          return undefined;
      }
    });
    useRampsOrdersMock.mockReturnValue({
      orders: [v2Order],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });

    const { result } = renderHook(() => useRampActivityItems());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].hash).toBe('0xv2preferred');
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
});
