import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useNavigateToAddFunds } from './useNavigateToAddFunds';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { isSwapsAllowed } from '../../Swaps/utils';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_ADD_FUNDS_CLICKED: 'card_add_funds_clicked',
  },
}));

jest.mock('../../Swaps/utils', () => ({
  isSwapsAllowed: jest.fn(),
}));

jest.mock('../../../../core/AppConstants', () => ({
  SWAPS: {
    ACTIVE: true,
  },
}));

describe('useNavigateToAddFunds', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => false),
    getId: jest.fn(() => 'test-nav'),
    getParent: jest.fn(),
    getState: jest.fn(() => ({
      key: 'test',
      index: 0,
      routeNames: [],
      routes: [],
      type: 'stack',
      stale: false,
    })),
  } as unknown as NavigationProp<ParamListBase>;

  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockEventBuilder = {
    build: jest.fn(),
  };

  const mockChainId = '0x1';
  const mockDestinationTokenAddress =
    '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();

    (useSelector as jest.Mock).mockReturnValue(mockChainId);
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
    (isSwapsAllowed as jest.Mock).mockReturnValue(true);
    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);
    mockEventBuilder.build.mockReturnValue({
      event: MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED,
    });
  });

  it('should initialize with correct default state when swaps are enabled', () => {
    const { result } = renderHook(() =>
      useNavigateToAddFunds(mockNavigation, mockDestinationTokenAddress),
    );

    expect(result.current.isSwapEnabled).toBe(true);
    expect(typeof result.current.navigateToAddFunds).toBe('function');
  });

  it('should disable swaps when AppConstants.SWAPS.ACTIVE is false', () => {
    (isSwapsAllowed as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useNavigateToAddFunds(mockNavigation, mockDestinationTokenAddress),
    );

    expect(result.current.isSwapEnabled).toBe(false);
    expect(isSwapsAllowed).toHaveBeenCalledWith(mockChainId);
  });

  it('should disable swaps when isSwapsAllowed returns false', () => {
    (isSwapsAllowed as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useNavigateToAddFunds(mockNavigation, mockDestinationTokenAddress),
    );

    expect(result.current.isSwapEnabled).toBe(false);
    expect(isSwapsAllowed).toHaveBeenCalledWith(mockChainId);
  });

  it('should navigate to swaps when navigateToAddFunds is called and swaps are enabled', () => {
    const { result } = renderHook(() =>
      useNavigateToAddFunds(mockNavigation, mockDestinationTokenAddress),
    );

    act(() => {
      result.current.navigateToAddFunds();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.SWAPS, {
      screen: Routes.SWAPS_AMOUNT_VIEW,
      params: {
        chainId: mockChainId,
        destinationToken: mockDestinationTokenAddress,
        sourcePage: 'CardHome',
      },
    });
  });

  it('should track analytics event when navigateToAddFunds is called and swaps are enabled', () => {
    const { result } = renderHook(() =>
      useNavigateToAddFunds(mockNavigation, mockDestinationTokenAddress),
    );

    act(() => {
      result.current.navigateToAddFunds();
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED,
    );
    expect(mockEventBuilder.build).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED,
    });
  });

  it('should not navigate when navigateToAddFunds is called and swaps are disabled', () => {
    (isSwapsAllowed as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useNavigateToAddFunds(mockNavigation, mockDestinationTokenAddress),
    );

    act(() => {
      result.current.navigateToAddFunds();
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('should not track analytics when navigateToAddFunds is called and swaps are disabled', () => {
    (isSwapsAllowed as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useNavigateToAddFunds(mockNavigation, mockDestinationTokenAddress),
    );

    act(() => {
      result.current.navigateToAddFunds();
    });

    expect(mockCreateEventBuilder).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('should handle navigation prop being undefined', () => {
    const { result } = renderHook(() =>
      useNavigateToAddFunds(
        undefined as unknown as NavigationProp<ParamListBase>,
        mockDestinationTokenAddress,
      ),
    );

    expect(() => {
      act(() => {
        result.current.navigateToAddFunds();
      });
    }).not.toThrow();

    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('should recalculate isSwapEnabled when chainId changes', () => {
    const { result, rerender } = renderHook(() =>
      useNavigateToAddFunds(mockNavigation, mockDestinationTokenAddress),
    );

    expect(result.current.isSwapEnabled).toBe(true);

    (useSelector as jest.Mock).mockReturnValue('0x89');
    (isSwapsAllowed as jest.Mock).mockReturnValue(false);

    rerender();

    expect(result.current.isSwapEnabled).toBe(false);
    expect(isSwapsAllowed).toHaveBeenCalledWith('0x89');
  });

  it('should handle different destination token addresses', () => {
    const differentTokenAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    const { result } = renderHook(() =>
      useNavigateToAddFunds(mockNavigation, differentTokenAddress),
    );

    act(() => {
      result.current.navigateToAddFunds();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.SWAPS, {
      screen: Routes.SWAPS_AMOUNT_VIEW,
      params: {
        chainId: mockChainId,
        destinationToken: differentTokenAddress,
        sourcePage: 'CardHome',
      },
    });
  });

  it('should maintain stable function reference for navigateToAddFunds', () => {
    const { result, rerender } = renderHook(() =>
      useNavigateToAddFunds(mockNavigation, mockDestinationTokenAddress),
    );

    const firstNavigateFunction = result.current.navigateToAddFunds;

    rerender();

    const secondNavigateFunction = result.current.navigateToAddFunds;

    expect(firstNavigateFunction).toBe(secondNavigateFunction);
  });

  it('should handle multiple consecutive calls to navigateToAddFunds', () => {
    const { result } = renderHook(() =>
      useNavigateToAddFunds(mockNavigation, mockDestinationTokenAddress),
    );

    act(() => {
      result.current.navigateToAddFunds();
      result.current.navigateToAddFunds();
      result.current.navigateToAddFunds();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledTimes(3);
    expect(mockTrackEvent).toHaveBeenCalledTimes(3);
  });

  it('should work with different chain IDs that support swaps', () => {
    const testCases = [
      { chainId: '0x1', shouldAllow: true },
      { chainId: '0x89', shouldAllow: true },
      { chainId: '0xa', shouldAllow: true },
      { chainId: '0xa4b1', shouldAllow: true },
    ];

    testCases.forEach(({ chainId, shouldAllow }) => {
      (useSelector as jest.Mock).mockReturnValue(chainId);
      (isSwapsAllowed as jest.Mock).mockReturnValue(shouldAllow);

      const { result } = renderHook(() =>
        useNavigateToAddFunds(mockNavigation, mockDestinationTokenAddress),
      );

      expect(result.current.isSwapEnabled).toBe(shouldAllow);
    });
  });

  it('should pass correct sourcePage parameter', () => {
    const { result } = renderHook(() =>
      useNavigateToAddFunds(mockNavigation, mockDestinationTokenAddress),
    );

    act(() => {
      result.current.navigateToAddFunds();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.SWAPS, {
      screen: Routes.SWAPS_AMOUNT_VIEW,
      params: expect.objectContaining({
        sourcePage: 'CardHome',
      }),
    });
  });
});
