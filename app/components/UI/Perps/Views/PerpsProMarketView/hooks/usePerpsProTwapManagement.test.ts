import { act, renderHook } from '@testing-library/react-native';
import type { BottomSheetRef } from '@metamask/design-system-react-native';
import type { TwapOrder } from '@metamask/perps-controller';
import { usePerpsTerminateTwap } from '../../../hooks/usePerpsTerminateTwap';
import { usePerpsTwapOrders } from '../../../hooks/usePerpsTwapOrders';
import { usePerpsProTwapManagement } from './usePerpsProTwapManagement';

jest.mock('../../../hooks/usePerpsTerminateTwap');
jest.mock('../../../hooks/usePerpsTwapOrders');

const mockUsePerpsTerminateTwap = jest.mocked(usePerpsTerminateTwap);
const mockUsePerpsTwapOrders = jest.mocked(usePerpsTwapOrders);
const mockRefresh = jest.fn().mockResolvedValue(undefined);

const activeOrder: TwapOrder = {
  orderId: 'twap-1',
  symbol: 'SOL',
  side: 'buy',
  size: '10',
  executedSize: '4',
  remainingSize: '6',
  executedNotional: '400',
  averagePrice: '100',
  fillProgressBps: 4000,
  timeProgressBps: 5000,
  elapsedTimeMilliseconds: 60_000,
  durationMinutes: 30,
  randomize: false,
  reduceOnly: false,
  status: 'active',
  startedAt: 1_000,
  lastUpdated: 2_000,
  fills: [],
  providerId: 'hyperliquid',
};

const options = {
  activeProvider: 'hyperliquid',
  displaySymbol: 'SOL',
  isScreenFocused: true,
  isTabSelected: true,
  isTickerOnly: false,
  isTwapPlacementEnabled: true,
  network: 'mainnet',
  selectedAddress: '0xabc',
  symbol: 'SOL',
};

const makeSheetRef = (onOpenBottomSheet: jest.Mock): BottomSheetRef =>
  ({
    onOpenBottomSheet,
    onCloseBottomSheet: jest.fn(),
  }) as unknown as BottomSheetRef;

describe('usePerpsProTwapManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsTerminateTwap.mockReturnValue({
      isTerminationInFlight: false,
      terminateTwap: jest.fn(),
    });
    mockUsePerpsTwapOrders.mockReturnValue({
      twapOrders: [activeOrder],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
      isRefreshing: false,
    });
  });

  it('reopens termination when a selected schedule returns after reconnect loading', () => {
    // Arrange
    const firstOpen = jest.fn();
    const reopened = jest.fn();
    const { result, rerender } = renderHook(() =>
      usePerpsProTwapManagement(options),
    );
    result.current.terminateSheetRef.current = makeSheetRef(firstOpen);
    act(() => result.current.selectOrderToTerminate(activeOrder));
    expect(firstOpen).toHaveBeenCalledTimes(1);

    // Act: the sheet unmounts with the temporary empty snapshot, then receives
    // a fresh ref when the same active schedule returns.
    mockUsePerpsTwapOrders.mockReturnValue({
      twapOrders: [],
      isLoading: true,
      error: null,
      refresh: mockRefresh,
      isRefreshing: false,
    });
    rerender({});
    result.current.terminateSheetRef.current = makeSheetRef(reopened);
    mockUsePerpsTwapOrders.mockReturnValue({
      twapOrders: [activeOrder],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
      isRefreshing: false,
    });
    rerender({});

    // Assert
    expect(reopened).toHaveBeenCalledTimes(1);
  });
});
