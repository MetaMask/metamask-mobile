import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useOpenSwaps } from './useOpenSwaps';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import { getHighestFiatToken } from '../util/getHighestFiatToken';
import {
  setDestToken,
  selectSelectedSourceChainIds,
} from '../../../../core/redux/slices/bridge';
import { SwapBridgeNavigationLocation } from '../../Bridge/hooks/useSwapBridgeNavigation';
import { CardTokenAllowance } from '../types';
import { selectAllPopularNetworkConfigurations } from '../../../../selectors/networkController';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: jest.fn(),
}));

jest.mock('../util/buildTokenIconUrl', () => ({
  buildTokenIconUrl: jest.fn(),
}));

jest.mock('../util/getHighestFiatToken', () => ({
  getHighestFiatToken: jest.fn(),
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  setDestToken: jest.fn(),
  selectSelectedSourceChainIds: jest.fn(),
}));

jest.mock('../../../../selectors/multichain', () => ({
  selectEvmTokens: jest.fn(),
  selectEvmTokenFiatBalances: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectAllPopularNetworkConfigurations: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: jest.fn(),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_ADD_FUNDS_SWAPS_CLICKED: 'CARD_ADD_FUNDS_SWAPS_CLICKED',
  },
}));

describe('useOpenSwaps', () => {
  const mockDispatch = jest.fn();
  const mockGoToSwaps = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();

  const mockChainIds = ['0xe708'];

  const mockTokensWithBalance = [
    {
      address: '0xbeef',
      symbol: 'ETHX',
      decimals: 18,
      name: 'ETHX',
      chainId: '0xe708',
      balance: '1',
      image: 'top-token-image',
      balanceFiat: '100',
      isETH: false,
    },
  ];

  const mockPopularNetworks = {
    '0xe708': {
      chainId: '0xe708',
      name: 'Linea',
      nativeCurrency: 'ETH',
    },
  };

  const mockPriorityToken = {
    address: '0xdead',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    chainId: '0xe708',
    caipChainId: 'eip155:59144' as const,
    allowanceState: 'enabled' as const,
    allowance: '1000000',
  };

  const mockTopToken = {
    address: '0xbeef',
    symbol: 'ETHX',
    decimals: 18,
    name: 'ETHX',
    chainId: '0xe708',
    balance: '1',
    image: 'top-token-image',
    balanceFiat: '100',
    isETH: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    // Mock selector and hook return values
    (
      selectAllPopularNetworkConfigurations as unknown as jest.Mock
    ).mockReturnValue(mockPopularNetworks);
    (selectSelectedSourceChainIds as unknown as jest.Mock).mockReturnValue(
      mockChainIds,
    );
    (useTokensWithBalance as jest.Mock).mockReturnValue(mockTokensWithBalance);

    (useSelector as jest.Mock).mockImplementation((selector) => selector());

    const { useSwapBridgeNavigation } = jest.requireMock(
      '../../Bridge/hooks/useSwapBridgeNavigation',
    );
    useSwapBridgeNavigation.mockReturnValue({ goToSwaps: mockGoToSwaps });

    // Mock useMetrics
    const useMetricsMock = jest.requireMock('../../../hooks/useMetrics');
    mockCreateEventBuilder.mockReturnValue({
      addProperties: jest.fn().mockReturnValue({
        build: jest.fn().mockReturnValue('mock-event'),
      }),
    });
    useMetricsMock.useMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    (buildTokenIconUrl as jest.Mock).mockReturnValue('icon-url');
    (setDestToken as unknown as jest.Mock).mockImplementation((payload) => ({
      type: 'bridge/setDestToken',
      payload,
    }));
  });

  it('should initialize correctly and return openSwaps function', () => {
    const { result } = renderHook(() => useOpenSwaps());

    expect(typeof result.current.openSwaps).toBe('function');
  });

  it('dispatches dest token and navigates to swaps', () => {
    (getHighestFiatToken as jest.Mock).mockReturnValue(mockTopToken);

    const { result } = renderHook(() =>
      useOpenSwaps({ priorityToken: mockPriorityToken as CardTokenAllowance }),
    );

    act(() => {
      result.current.openSwaps({});
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setDestToken',
      payload: expect.objectContaining({
        address: '0xdead',
        image: 'icon-url',
      }),
    });

    // goToSwaps is now called without arguments (sourceToken passed to hook)
    expect(mockGoToSwaps).toHaveBeenCalled();

    expect(mockTrackEvent).toHaveBeenCalledWith('mock-event');
  });

  it('passes source token to goToSwaps even if highest fiat token is native (isETH)', () => {
    const ethToken = {
      ...mockTopToken,
      isETH: true,
    };
    (getHighestFiatToken as jest.Mock).mockReturnValue(ethToken);

    const { result } = renderHook(() =>
      useOpenSwaps({
        priorityToken: mockPriorityToken as CardTokenAllowance,
      }),
    );

    act(() => {
      result.current.openSwaps({});
    });

    // The sourceToken should be created from the ethToken
    // goToSwaps is now called without arguments (sourceToken passed to hook)
    expect(mockGoToSwaps).toHaveBeenCalled();
  });

  it('honors beforeNavigate: closes first, then navigates when callback is invoked', () => {
    (getHighestFiatToken as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() =>
      useOpenSwaps({ priorityToken: mockPriorityToken as CardTokenAllowance }),
    );

    let capturedNav: (() => void) | undefined;
    const beforeNavigate = jest.fn((nav: () => void) => {
      capturedNav = nav;
    });

    act(() => {
      result.current.openSwaps({
        beforeNavigate,
      });
    });

    expect(beforeNavigate).toHaveBeenCalled();
    expect(mockGoToSwaps).not.toHaveBeenCalled();

    act(() => {
      capturedNav && capturedNav();
    });

    expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
  });

  it('still sets dest token and navigates even if no cardholder address is provided', () => {
    (getHighestFiatToken as jest.Mock).mockReturnValue(mockTopToken);

    const { result } = renderHook(() =>
      useOpenSwaps({ priorityToken: mockPriorityToken as CardTokenAllowance }),
    );

    act(() => {
      result.current.openSwaps({});
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setDestToken',
      payload: expect.objectContaining({
        address: '0xdead',
        image: 'icon-url',
      }),
    });

    // goToSwaps is now called without arguments (sourceToken passed to hook)
    expect(mockGoToSwaps).toHaveBeenCalled();
  });

  it('passes undefined to goToSwaps if getHighestFiatToken returns undefined', () => {
    (getHighestFiatToken as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() =>
      useOpenSwaps({ priorityToken: mockPriorityToken as CardTokenAllowance }),
    );

    act(() => {
      result.current.openSwaps({});
    });

    // goToSwaps is now called without arguments
    expect(mockGoToSwaps).toHaveBeenCalled();
  });

  it('uses custom location and sourcePage when provided', () => {
    const customOptions = {
      location: SwapBridgeNavigationLocation.MainView,
      sourcePage: '/custom-page',
    };

    const { result } = renderHook(() => useOpenSwaps(customOptions));

    expect(typeof result.current.openSwaps).toBe('function');

    const { useSwapBridgeNavigation } = jest.requireMock(
      '../../Bridge/hooks/useSwapBridgeNavigation',
    );
    expect(useSwapBridgeNavigation).toHaveBeenCalledWith(customOptions);
  });

  it('early returns if priorityToken is not provided', () => {
    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useOpenSwaps({ priorityToken: undefined as any }),
    );

    act(() => {
      result.current.openSwaps({});
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockGoToSwaps).not.toHaveBeenCalled();
  });

  it('builds correct token icon URL using buildTokenIconUrl', () => {
    const { result } = renderHook(() =>
      useOpenSwaps({ priorityToken: mockPriorityToken as CardTokenAllowance }),
    );

    act(() => {
      result.current.openSwaps({});
    });

    expect(buildTokenIconUrl).toHaveBeenCalledWith('eip155:59144', '0xdead');
  });

  it('uses tokens with balance correctly', () => {
    const { result } = renderHook(() => useOpenSwaps());

    // The hook should use useTokensWithBalance hook
    expect(result.current).toBeDefined();
    expect(typeof result.current.openSwaps).toBe('function');
  });

  it('calls useTokensWithBalance with chain IDs from selector', () => {
    renderHook(() => useOpenSwaps());

    expect(useTokensWithBalance).toHaveBeenCalledWith({
      chainIds: mockChainIds,
    });
  });
});
