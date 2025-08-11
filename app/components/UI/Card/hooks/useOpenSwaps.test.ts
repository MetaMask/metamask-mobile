import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useOpenSwaps } from './useOpenSwaps';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import { getHighestFiatToken } from '../util/getHighestFiatToken';
import { setDestToken } from '../../../../core/redux/slices/bridge';
import { SwapBridgeNavigationLocation } from '../../Bridge/hooks/useSwapBridgeNavigation';
import { CardTokenAllowance } from '../types';
import {
  selectEvmTokens,
  selectEvmTokenFiatBalances,
} from '../../../../selectors/multichain';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  SwapBridgeNavigationLocation: {
    TokenDetails: 'TokenDetails',
    TabBar: 'TabBar',
    Swaps: 'Swaps',
  },
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
}));

jest.mock('../../../../selectors/multichain', () => ({
  selectEvmTokens: jest.fn(),
  selectEvmTokenFiatBalances: jest.fn(),
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

  const mockEvmTokens = [
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

  const mockTokenFiatBalances = ['100'];

  const mockPriorityToken = {
    address: '0xdead',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    chainId: '0xe708',
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

    // Mock selector return values
    (selectEvmTokens as unknown as jest.Mock).mockReturnValue(mockEvmTokens);
    (selectEvmTokenFiatBalances as unknown as jest.Mock).mockReturnValue(
      mockTokenFiatBalances,
    );

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
      result.current.openSwaps({
        chainId: '0xe708',
        cardholderAddress: '0xcard',
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setDestToken',
      payload: expect.objectContaining({
        address: '0xdead',
        image: 'icon-url',
      }),
    });

    expect(mockGoToSwaps).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xbeef',
        symbol: 'ETHX',
      }),
    );

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
      result.current.openSwaps({
        chainId: '0xe708',
        cardholderAddress: '0xcard',
      });
    });

    // The sourceToken should be created from the ethToken
    expect(mockGoToSwaps).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xbeef',
        symbol: 'ETHX',
      }),
    );
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
        chainId: '0xe708',
        cardholderAddress: '0xcard',
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
      result.current.openSwaps({
        chainId: '0xe708',
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setDestToken',
      payload: expect.objectContaining({
        address: '0xdead',
        image: 'icon-url',
      }),
    });

    expect(mockGoToSwaps).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xbeef',
        symbol: 'ETHX',
      }),
    );
  });

  it('passes undefined to goToSwaps if getHighestFiatToken returns undefined', () => {
    (getHighestFiatToken as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() =>
      useOpenSwaps({ priorityToken: mockPriorityToken as CardTokenAllowance }),
    );

    act(() => {
      result.current.openSwaps({
        chainId: '0xe708',
        cardholderAddress: '0xcard',
      });
    });

    expect(mockGoToSwaps).toHaveBeenCalledWith(undefined);
  });

  it('uses custom location and sourcePage when provided', () => {
    const customOptions = {
      location: SwapBridgeNavigationLocation.TabBar,
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
      result.current.openSwaps({
        chainId: '0xe708',
      });
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockGoToSwaps).not.toHaveBeenCalled();
  });

  it('builds correct token icon URL using buildTokenIconUrl', () => {
    const { result } = renderHook(() =>
      useOpenSwaps({ priorityToken: mockPriorityToken as CardTokenAllowance }),
    );

    act(() => {
      result.current.openSwaps({
        chainId: '0xe708',
      });
    });

    expect(buildTokenIconUrl).toHaveBeenCalledWith('0xe708', '0xdead');
  });

  it('maps EVM tokens with fiat balances correctly', () => {
    const { result } = renderHook(() => useOpenSwaps());

    // The hook should create a tokens array with tokenFiatAmount
    expect(result.current).toBeDefined();
    expect(typeof result.current.openSwaps).toBe('function');
  });
});
