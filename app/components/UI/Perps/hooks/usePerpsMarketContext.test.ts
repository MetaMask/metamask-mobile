import { act, renderHook } from '@testing-library/react-native';
import { usePerpsMarketContext } from './usePerpsMarketContext';

let mockNetwork = 'testnet';
let mockProvider = 'hyperliquid';
let mockHip3ConfigVersion = 1;
let mockInitializedContextKey: string | null = 'testnet|hyperliquid|1';
let mockConnectionGeneration = 0;
let mockInitializedConnectionGeneration: number | null = 0;
let mockContextListeners: (() => void)[] = [];
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
  },
}));

describe('usePerpsMarketContext', () => {
  beforeEach(() => {
    mockNetwork = 'testnet';
    mockProvider = 'hyperliquid';
    mockHip3ConfigVersion = 1;
    mockInitializedContextKey = 'testnet|hyperliquid|1';
    mockConnectionGeneration = 0;
    mockInitializedConnectionGeneration = 0;
    mockContextListeners = [];
    mockGenerationListener = undefined;
  });

  it('is ready when the selected and initialized contexts match', () => {
    const { result } = renderHook(() => usePerpsMarketContext());

    expect(result.current).toEqual({
      key: 'testnet|hyperliquid|1|0',
      identityKey: 'testnet|hyperliquid|1',
      isReady: true,
    });
  });

  it('starts a new market identity before a resubscribe is initialized', () => {
    const { result } = renderHook(() => usePerpsMarketContext());

    mockConnectionGeneration = 1;
    act(() => mockGenerationListener?.());

    expect(result.current.isReady).toBe(false);

    mockInitializedConnectionGeneration = 1;
    act(() => mockContextListeners.forEach((listener) => listener()));

    expect(result.current.isReady).toBe(true);
  });

  it('rejects a newly mounted selected context until it initializes', () => {
    mockNetwork = 'mainnet';
    const { result } = renderHook(() => usePerpsMarketContext());

    expect(result.current.isReady).toBe(false);

    mockInitializedContextKey = 'mainnet|hyperliquid|1';
    act(() => mockContextListeners.forEach((listener) => listener()));
    expect(result.current.isReady).toBe(true);
  });
});
