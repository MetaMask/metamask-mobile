import { act, renderHook } from '@testing-library/react-native';
import { usePerpsMarketContext } from './usePerpsMarketContext';

let mockNetwork = 'testnet';
let mockProvider = 'hyperliquid';
let mockHip3ConfigVersion = 1;
let mockIsInitialized = true;
let mockInitializedContextKey: string | null = 'testnet|hyperliquid|1';
let mockIsUserReady = true;
let mockContextListener: (() => void) | undefined;
let mockUserContextListener: (() => void) | undefined;

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: object) => unknown) => selector({}),
}));
jest.mock('../selectors/featureFlags', () => ({
  selectHip3ConfigVersion: () => mockHip3ConfigVersion,
}));
jest.mock('../selectors/perpsController', () => ({
  selectPerpsNetwork: () => mockNetwork,
  selectPerpsProvider: () => mockProvider,
}));
jest.mock('../services/PerpsConnectionManager', () => ({
  PerpsConnectionManager: {
    getInitializedMarketContextKey: () => mockInitializedContextKey,
    subscribeToInitializedMarketContext: (listener: () => void) => {
      mockContextListener = listener;
      return jest.fn();
    },
    isSelectedUserContextReady: () => mockIsUserReady,
    subscribeToInitializedUserContext: (listener: () => void) => {
      mockUserContextListener = listener;
      return jest.fn();
    },
  },
}));
jest.mock('./usePerpsConnection', () => ({
  usePerpsConnection: () => ({ isInitialized: mockIsInitialized }),
}));

describe('usePerpsMarketContext', () => {
  beforeEach(() => {
    mockNetwork = 'testnet';
    mockProvider = 'hyperliquid';
    mockHip3ConfigVersion = 1;
    mockIsInitialized = true;
    mockInitializedContextKey = 'testnet|hyperliquid|1';
    mockIsUserReady = true;
    mockContextListener = undefined;
    mockUserContextListener = undefined;
  });

  it('is ready when the selected and initialized contexts match', () => {
    const { result } = renderHook(() => usePerpsMarketContext());

    expect(result.current).toEqual({
      key: 'testnet|hyperliquid|1',
      isReady: true,
      isUserReady: true,
      isConnectionInitialized: true,
    });
  });

  it('rejects a newly mounted selected context until it initializes', () => {
    mockNetwork = 'mainnet';
    const { result, rerender } = renderHook(() => usePerpsMarketContext());

    expect(result.current.isReady).toBe(false);

    mockIsInitialized = false;
    rerender({});
    expect(result.current.isReady).toBe(false);

    mockInitializedContextKey = 'mainnet|hyperliquid|1';
    mockIsInitialized = true;
    act(() => mockContextListener?.());
    expect(result.current.isReady).toBe(true);
  });

  it('keeps resident market data ready during an account reconnect', () => {
    const { result, rerender } = renderHook(() => usePerpsMarketContext());

    mockIsInitialized = false;
    rerender({});

    expect(result.current.isReady).toBe(true);
    expect(result.current.isUserReady).toBe(true);
    expect(result.current.isConnectionInitialized).toBe(false);

    mockIsInitialized = true;
    rerender({});
    expect(result.current.isReady).toBe(true);
    expect(result.current.isConnectionInitialized).toBe(true);
  });

  it('holds user readiness until the selected account reconnects', () => {
    mockIsUserReady = false;
    const { result } = renderHook(() => usePerpsMarketContext());

    expect(result.current.isReady).toBe(true);
    expect(result.current.isUserReady).toBe(false);

    mockIsUserReady = true;
    act(() => mockUserContextListener?.());

    expect(result.current.isUserReady).toBe(true);
  });
});
