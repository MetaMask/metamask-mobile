import { act, renderHook } from '@testing-library/react-native';
import { usePerpsMarketContext } from './usePerpsMarketContext';

let mockNetwork = 'testnet';
let mockProvider = 'hyperliquid';
let mockHip3ConfigVersion = 1;
let mockIsInitialized = true;
let mockInitializedContextKey: string | null = 'testnet|hyperliquid|1';
let mockIsUserReady = true;
let mockConnectionGeneration = 0;
let mockInitializedConnectionGeneration: number | null = 0;
let mockContextListeners: (() => void)[] = [];
let mockUserContextListener: (() => void) | undefined;
let mockGenerationListener: (() => void) | undefined;

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
      mockContextListeners.push(listener);
      return jest.fn();
    },
    getConnectionGeneration: () => mockConnectionGeneration,
    getInitializedConnectionGeneration: () =>
      mockInitializedConnectionGeneration,
    subscribeToConnectionGeneration: (listener: () => void) => {
      mockGenerationListener = listener;
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
    mockConnectionGeneration = 0;
    mockInitializedConnectionGeneration = 0;
    mockContextListeners = [];
    mockUserContextListener = undefined;
    mockGenerationListener = undefined;
  });

  it('is ready when the selected and initialized contexts match', () => {
    const { result } = renderHook(() => usePerpsMarketContext());

    expect(result.current).toEqual({
      key: 'testnet|hyperliquid|1|0',
      isReady: true,
      isUserReady: true,
      isConnectionInitialized: true,
    });
  });

  it('starts a new market identity before a resubscribe is initialized', () => {
    const { result } = renderHook(() => usePerpsMarketContext());

    mockConnectionGeneration = 1;
    act(() => mockGenerationListener?.());

    expect(result.current.key).toBe('testnet|hyperliquid|1|1');
    expect(result.current.isReady).toBe(false);

    mockInitializedConnectionGeneration = 1;
    act(() => mockContextListeners.forEach((listener) => listener()));

    expect(result.current.isReady).toBe(true);
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
    act(() => mockContextListeners.forEach((listener) => listener()));
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
