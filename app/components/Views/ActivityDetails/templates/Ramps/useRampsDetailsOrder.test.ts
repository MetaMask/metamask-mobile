import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import {
  FIAT_ORDER_PROVIDERS as fiatOrderProviders,
  FIAT_ORDER_STATES as fiatOrderStates,
} from '#app/constants/on-ramp';
import type { FiatOrder } from '#app/reducers/fiatOrders/types';
import { useRampsOrders } from '#app/components/UI/Ramp/hooks/useRampsOrders';
import { useRampsDetailsOrder } from './useRampsDetailsOrder';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('#app/reducers/fiatOrders', () => ({
  getOrders: jest.fn(),
}));

jest.mock('#app/components/UI/Ramp/hooks/useRampsOrders', () => ({
  useRampsOrders: jest.fn(),
}));

const useSelectorMock = jest.mocked(useSelector);
const useRampsOrdersMock = jest.mocked(useRampsOrders);

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
} as unknown as ReturnType<typeof useRampsOrders>['orders'][number];

function mockRampsOrders(orders = [rampsOrder], getOrderById = jest.fn()) {
  useRampsOrdersMock.mockReturnValue({
    orders,
    getOrderById,
  } as unknown as ReturnType<typeof useRampsOrders>);
}

describe('useRampsDetailsOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSelectorMock.mockReturnValue([legacyOrder]);
    mockRampsOrders();
  });

  it('returns a v2 order matched by id', () => {
    const getOrderById = jest.fn().mockReturnValue(rampsOrder);
    mockRampsOrders([rampsOrder], getOrderById);

    const { result } = renderHook(() =>
      useRampsDetailsOrder('/providers/transak/orders/po-1'),
    );

    expect(result.current).toBe(rampsOrder);
    expect(getOrderById).toHaveBeenCalledWith('/providers/transak/orders/po-1');
  });

  it('returns a v2 order matched by transaction hash', () => {
    mockRampsOrders();

    const { result } = renderHook(() => useRampsDetailsOrder('0xRAMPSHASH'));

    expect(result.current).toBe(rampsOrder);
  });

  it('returns a legacy FiatOrder matched by transaction hash', () => {
    mockRampsOrders([]);

    const { result } = renderHook(() => useRampsDetailsOrder('0xLEGACYHASH'));

    expect(result.current).toBe(legacyOrder);
  });

  it('returns undefined when nothing matches', () => {
    useRampsOrdersMock.mockReturnValue({
      orders: [],
      getOrderById: jest.fn(),
    } as unknown as ReturnType<typeof useRampsOrders>);
    useSelectorMock.mockImplementation((selector) => {
      if (selector === getOrders) {
        return [];
      }
      return undefined;
    });

    const { result } = renderHook(() => useRampsDetailsOrder('missing'));

    expect(result.current).toBeUndefined();
  });
});
