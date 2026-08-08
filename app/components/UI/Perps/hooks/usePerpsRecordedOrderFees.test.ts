import { renderHook } from '@testing-library/react-native';
import { PERPS_CONSTANTS, type OrderFill } from '@metamask/perps-controller';
import { usePerpsMarketFills } from './usePerpsMarketFills';
import { usePerpsRecordedOrderFees } from './usePerpsRecordedOrderFees';

jest.mock('./usePerpsMarketFills', () => ({
  usePerpsMarketFills: jest.fn(),
}));

const mockUsePerpsMarketFills = usePerpsMarketFills as jest.MockedFunction<
  typeof usePerpsMarketFills
>;

const NOW = new Date('2026-08-07T12:00:00.000Z').getTime();

const createFill = (overrides: Partial<OrderFill> = {}): OrderFill => ({
  orderId: 'order-1',
  symbol: 'BTC',
  side: 'buy',
  size: '0.5',
  price: '50000',
  pnl: '0',
  direction: 'Open Long',
  fee: '1.25',
  feeToken: 'USDC',
  timestamp: 1640995200000,
  startPosition: '0',
  success: true,
  ...overrides,
});

const setMarketFills = ({
  fills = [],
  isInitialLoading = false,
  isHistoryLoading = false,
  historyError = null,
}: {
  fills?: OrderFill[];
  isInitialLoading?: boolean;
  isHistoryLoading?: boolean;
  historyError?: string | null;
} = {}) => {
  mockUsePerpsMarketFills.mockReturnValue({
    fills,
    isInitialLoading,
    isHistoryLoading,
    historyError,
    refresh: jest.fn(),
    isRefreshing: false,
  });
};

describe('usePerpsRecordedOrderFees', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    setMarketFills();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the recorded fee for one matching fill', () => {
    setMarketFills({ fills: [createFill({ fee: '1.25' })] });

    const { result } = renderHook(() =>
      usePerpsRecordedOrderFees(
        'order-1',
        'BTC',
        NOW - PERPS_CONSTANTS.FillsLookbackMs - 1,
      ),
    );

    expect(result.current).toEqual({
      totalFee: 1.25,
      isLoading: false,
      hasError: false,
    });
  });

  it('sums recorded fees from multiple partial fills', () => {
    setMarketFills({
      fills: [
        createFill({ fee: '0.1', timestamp: 1 }),
        createFill({ fee: '0.2', timestamp: 2 }),
        createFill({ fee: '0.3', timestamp: 3 }),
      ],
    });

    const { result } = renderHook(() =>
      usePerpsRecordedOrderFees('order-1', 'BTC', NOW),
    );

    expect(result.current.totalFee).toBe(0.6);
  });

  it('excludes fills belonging to other orders', () => {
    setMarketFills({
      fills: [
        createFill({ orderId: 'order-1', fee: '1.25' }),
        createFill({ orderId: 'order-2', fee: '9.75' }),
      ],
    });

    const { result } = renderHook(() =>
      usePerpsRecordedOrderFees('order-1', 'BTC', NOW),
    );

    expect(result.current.totalFee).toBe(1.25);
  });

  it('returns undefined when the order ID is absent', () => {
    setMarketFills({
      fills: [createFill()],
      isInitialLoading: true,
      isHistoryLoading: true,
    });

    const { result } = renderHook(() =>
      usePerpsRecordedOrderFees(undefined, 'BTC', NOW),
    );

    expect(result.current).toEqual({
      totalFee: undefined,
      isLoading: false,
      hasError: false,
    });
  });

  it('returns zero for a covered order without matching fills', () => {
    setMarketFills({ fills: [createFill({ orderId: 'other-order' })] });

    const { result } = renderHook(() =>
      usePerpsRecordedOrderFees(
        'order-1',
        'BTC',
        NOW - PERPS_CONSTANTS.FillsLookbackMs + 1,
      ),
    );

    expect(result.current.totalFee).toBe(0);
  });

  it('withholds the total for an order older than fill history', () => {
    const { result } = renderHook(() =>
      usePerpsRecordedOrderFees(
        'order-1',
        'BTC',
        NOW - PERPS_CONSTANTS.FillsLookbackMs - 1,
      ),
    );

    expect(result.current.totalFee).toBeUndefined();
  });

  it('returns zero at the fill-history boundary without matching fills', () => {
    const { result } = renderHook(() =>
      usePerpsRecordedOrderFees(
        'order-1',
        'BTC',
        NOW - PERPS_CONSTANTS.FillsLookbackMs,
      ),
    );

    expect(result.current.totalFee).toBe(0);
  });

  it('withholds the total while fill history is loading', () => {
    setMarketFills({
      fills: [createFill()],
      isHistoryLoading: true,
    });

    const { result } = renderHook(() =>
      usePerpsRecordedOrderFees('order-1', 'BTC', NOW),
    );

    expect(result.current).toEqual({
      totalFee: undefined,
      isLoading: true,
      hasError: false,
    });
  });

  it('withholds the total when historical fill loading fails', () => {
    setMarketFills({
      fills: [createFill()],
      historyError: 'API unavailable',
    });

    const { result } = renderHook(() =>
      usePerpsRecordedOrderFees('order-1', 'BTC', NOW),
    );

    expect(result.current).toEqual({
      totalFee: undefined,
      isLoading: false,
      hasError: true,
    });
  });
});
