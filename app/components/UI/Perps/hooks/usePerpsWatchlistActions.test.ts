import { renderHook, act } from '@testing-library/react-native';
import { usePerpsWatchlistActions } from './usePerpsWatchlistActions';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockToggleWatchlistMarket = jest.fn();
const mockGetWatchlistMarkets = jest.fn(() => ['BTC']);
const mockFlushState = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      toggleWatchlistMarket: (...args: unknown[]) =>
        mockToggleWatchlistMarket(...args),
      getWatchlistMarkets: () => mockGetWatchlistMarkets(),
    },
  },
}));

jest.mock('../../../../core/EngineService', () => ({
  __esModule: true,
  default: {
    flushState: () => mockFlushState(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../util/errorUtils', () => ({
  ensureError: jest.fn((err: unknown, context: string) =>
    err instanceof Error ? err : new Error(`${context}: ${String(err)}`),
  ),
}));

const mockTrack = jest.fn();
jest.mock('./usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({ track: mockTrack })),
}));

const mockShowToast = jest.fn();
const mockAdded = jest.fn((symbol: string) => ({
  variant: 'success',
  labelOptions: [{ label: `Added ${symbol} to watchlist` }],
}));
const mockRemoved = jest.fn((symbol: string) => ({
  variant: 'info',
  labelOptions: [{ label: `Removed ${symbol} from watchlist` }],
}));
const mockAddError = { variant: 'error', labelOptions: [] };
const mockRemoveError = { variant: 'error', labelOptions: [] };
const mockLimitReached = { variant: 'info', labelOptions: [] };
jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      watchlist: {
        added: mockAdded,
        removed: mockRemoved,
        addError: mockAddError,
        removeError: mockRemoveError,
        limitReached: mockLimitReached,
      },
    },
  })),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePerpsWatchlistActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWatchlistMarkets.mockReturnValue(['BTC']);
    mockFlushState.mockImplementation(() => undefined);
    // clearAllMocks leaves return values in place, so reset the persist promise
    // or a deferred one from the latency cases leaks into later tests.
    mockToggleWatchlistMarket.mockResolvedValue(undefined);
  });

  describe('feedback latency', () => {
    // TAT-3787: the toast and its haptic used to wait on the AUS network write
    // inside toggleWatchlistMarket, costing 500-1000ms after the press.
    it('shows the added toast only after the persist settles', async () => {
      let watchlist = ['BTC'];
      mockGetWatchlistMarkets.mockImplementation(() => watchlist);
      let resolvePersist: () => void = () => undefined;
      mockToggleWatchlistMarket.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            watchlist = ['BTC', 'ETH'];
            resolvePersist = resolve;
          }),
      );

      const { result } = renderHook(() => usePerpsWatchlistActions());

      let pending: Promise<boolean> = Promise.resolve(false);
      await act(async () => {
        pending = result.current.addToWatchlist('ETH');
      });

      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockFlushState).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolvePersist();
        await pending;
      });

      expect(mockFlushState).toHaveBeenCalledTimes(2);
      expect(mockAdded).toHaveBeenCalledWith('ETH');
      expect(mockShowToast).toHaveBeenCalledWith(mockAdded('ETH'));
    });

    it('shows the removed toast only after the persist settles', async () => {
      let watchlist = ['BTC'];
      let resolvePersist: () => void = () => undefined;
      mockGetWatchlistMarkets.mockImplementation(() => watchlist);
      mockToggleWatchlistMarket.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            watchlist = [];
            resolvePersist = resolve;
          }),
      );

      const { result } = renderHook(() => usePerpsWatchlistActions());

      let pending: Promise<boolean> = Promise.resolve(true);
      await act(async () => {
        pending = result.current.removeFromWatchlist('BTC');
      });

      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockFlushState).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolvePersist();
        await pending;
      });

      expect(mockFlushState).toHaveBeenCalledTimes(2);
      expect(mockRemoved).toHaveBeenCalledWith('BTC');
      expect(mockShowToast).toHaveBeenCalledWith(mockRemoved('BTC'));
    });

    it('flushes Redux state after persistence resolves with a reverted watchlist', async () => {
      let watchlist = ['BTC'];
      let resolvePersist: () => void = () => undefined;
      mockGetWatchlistMarkets.mockImplementation(() => watchlist);
      mockToggleWatchlistMarket.mockImplementation(
        (symbol: string) =>
          new Promise<void>((resolve) => {
            watchlist = watchlist.filter(
              (marketSymbol) => marketSymbol !== symbol,
            );
            resolvePersist = () => {
              watchlist = ['BTC'];
              resolve();
            };
          }),
      );

      const { result } = renderHook(() => usePerpsWatchlistActions());

      let pending: Promise<boolean> = Promise.resolve(true);
      await act(async () => {
        pending = result.current.removeFromWatchlist('BTC');
      });

      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockFlushState).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolvePersist();
        await pending;
      });

      expect(mockFlushState).toHaveBeenCalledTimes(2);
      expect(mockGetWatchlistMarkets()).toEqual(['BTC']);
      await expect(pending).resolves.toBe(false);
      expect(mockTrack).not.toHaveBeenCalled();
      expect(mockRemoved).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(mockRemoveError);
    });

    it('keeps successful feedback when Redux state delivery throws', async () => {
      const flushError = new Error('Redux store does not exist');
      let watchlist = ['BTC'];
      mockGetWatchlistMarkets.mockImplementation(() => watchlist);
      mockToggleWatchlistMarket.mockImplementation(async () => {
        watchlist = ['BTC', 'ETH'];
      });
      mockFlushState.mockImplementation(() => {
        throw flushError;
      });

      const Logger = jest.requireMock('../../../../util/Logger');
      const { result } = renderHook(() => usePerpsWatchlistActions());

      await act(async () => {
        await result.current.addToWatchlist('ETH');
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
            PERPS_EVENT_VALUE.ACTION_TYPE.FAVORITE_MARKET,
          [PERPS_EVENT_PROPERTY.ASSET]: 'ETH',
        }),
      );
      expect(mockShowToast).toHaveBeenCalledWith(mockAdded('ETH'));
      expect(mockShowToast).not.toHaveBeenCalledWith(mockAddError);
      expect(Logger.error).toHaveBeenCalledWith(
        flushError,
        expect.objectContaining({
          tags: expect.objectContaining({
            action: 'flush_engine_state',
          }),
        }),
      );
    });
  });

  describe('addToWatchlist', () => {
    it('calls toggleWatchlistMarket with the correct symbol', async () => {
      const { result } = renderHook(() => usePerpsWatchlistActions());

      await act(async () => {
        await result.current.addToWatchlist('ETH');
      });

      expect(mockToggleWatchlistMarket).toHaveBeenCalledWith('ETH');
    });

    it('fires PERPS_UI_INTERACTION analytics with FAVORITE_TOGGLED and FAVORITE_MARKET', async () => {
      let watchlist = ['BTC'];
      mockGetWatchlistMarkets.mockImplementation(() => watchlist);
      mockToggleWatchlistMarket.mockImplementation(async () => {
        watchlist = ['BTC', 'ETH'];
      });

      const { result } = renderHook(() => usePerpsWatchlistActions());

      await act(async () => {
        await result.current.addToWatchlist('ETH');
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
          [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
            PERPS_EVENT_VALUE.ACTION_TYPE.FAVORITE_MARKET,
          [PERPS_EVENT_PROPERTY.ASSET]: 'ETH',
          [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: 2,
        }),
      );
    });

    it('returns false and skips analytics when persistence reverts the add', async () => {
      let watchlist = ['BTC'];
      mockGetWatchlistMarkets.mockImplementation(() => watchlist);
      mockToggleWatchlistMarket.mockImplementation(async () => {
        watchlist = ['BTC', 'ETH'];
        await Promise.resolve();
        watchlist = ['BTC'];
      });
      const { result } = renderHook(() => usePerpsWatchlistActions());
      let wasAdded = true;

      await act(async () => {
        wasAdded = await result.current.addToWatchlist('ETH');
      });

      expect(wasAdded).toBe(false);
      expect(mockTrack).not.toHaveBeenCalled();
      expect(mockAdded).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(mockAddError);
    });

    it('uses the provided source in analytics', async () => {
      let watchlist = ['BTC'];
      mockGetWatchlistMarkets.mockImplementation(() => watchlist);
      mockToggleWatchlistMarket.mockImplementation(async () => {
        watchlist = ['BTC', 'ETH'];
      });
      const { result } = renderHook(() =>
        usePerpsWatchlistActions(PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST),
      );

      await act(async () => {
        await result.current.addToWatchlist('ETH');
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
        }),
      );
    });

    it('calls Logger.error and shows error toast on failure', async () => {
      const testError = new Error('controller failure');
      mockToggleWatchlistMarket.mockImplementationOnce(() => {
        throw testError;
      });

      const Logger = jest.requireMock('../../../../util/Logger');
      const { result } = renderHook(() => usePerpsWatchlistActions());

      await act(async () => {
        await result.current.addToWatchlist('ETH');
      });

      expect(Logger.error).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          tags: expect.objectContaining({
            component: 'usePerpsWatchlistActions',
            action: 'add_to_watchlist',
          }),
        }),
      );
      expect(mockShowToast).toHaveBeenCalledWith(mockAddError);
    });

    it('shows the added toast after a successful add', async () => {
      let watchlist = ['BTC'];
      mockGetWatchlistMarkets.mockImplementation(() => watchlist);
      mockToggleWatchlistMarket.mockImplementation(async () => {
        watchlist = ['BTC', 'ETH'];
      });

      const { result } = renderHook(() => usePerpsWatchlistActions());

      await act(async () => {
        await result.current.addToWatchlist('ETH');
      });

      expect(mockAdded).toHaveBeenCalledWith('ETH');
      expect(mockShowToast).toHaveBeenCalledWith(mockAdded('ETH'));
    });

    it('shows the limitReached toast and skips toggle when watchlist is full', async () => {
      const fullList = Array.from({ length: 100 }, (_, i) => `MKT${i}`);
      mockGetWatchlistMarkets.mockReturnValue(fullList);

      const { result } = renderHook(() => usePerpsWatchlistActions());

      await act(async () => {
        await result.current.addToWatchlist('NEW');
      });

      expect(mockToggleWatchlistMarket).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(mockLimitReached);
      expect(mockAdded).not.toHaveBeenCalled();
    });

    it('does not call track when toggleWatchlistMarket throws', async () => {
      mockToggleWatchlistMarket.mockImplementationOnce(() => {
        throw new Error('fail');
      });

      const { result } = renderHook(() => usePerpsWatchlistActions());

      await act(async () => {
        await result.current.addToWatchlist('ETH');
      });

      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('returns true without toggling when the market is already watched', async () => {
      const { result } = renderHook(() => usePerpsWatchlistActions());
      let wasAdded = false;

      await act(async () => {
        wasAdded = await result.current.addToWatchlist('BTC');
      });

      expect(wasAdded).toBe(true);
      expect(mockToggleWatchlistMarket).not.toHaveBeenCalled();
      expect(mockTrack).not.toHaveBeenCalled();
    });
  });

  describe('removeFromWatchlist', () => {
    it('calls toggleWatchlistMarket with the correct symbol', async () => {
      const { result } = renderHook(() => usePerpsWatchlistActions());

      await act(async () => {
        await result.current.removeFromWatchlist('BTC');
      });

      expect(mockToggleWatchlistMarket).toHaveBeenCalledWith('BTC');
    });

    it('fires UNFAVORITE_MARKET analytics', async () => {
      mockToggleWatchlistMarket.mockImplementationOnce(() => {
        mockGetWatchlistMarkets.mockReturnValue([]);
        return Promise.resolve();
      });

      const { result } = renderHook(() => usePerpsWatchlistActions());

      await act(async () => {
        await result.current.removeFromWatchlist('BTC');
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
            PERPS_EVENT_VALUE.ACTION_TYPE.UNFAVORITE_MARKET,
          [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
          [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: 0,
        }),
      );
    });

    it('shows the removed toast after a successful remove', async () => {
      mockToggleWatchlistMarket.mockImplementationOnce(() => {
        mockGetWatchlistMarkets.mockReturnValue([]);
        return Promise.resolve();
      });

      const { result } = renderHook(() => usePerpsWatchlistActions());

      await act(async () => {
        await result.current.removeFromWatchlist('BTC');
      });

      expect(mockRemoved).toHaveBeenCalledWith('BTC');
      expect(mockShowToast).toHaveBeenCalledWith(mockRemoved('BTC'));
    });

    it('calls Logger.error and shows the error toast on failure', async () => {
      const testError = new Error('remove fail');
      mockToggleWatchlistMarket.mockImplementationOnce(() => {
        throw testError;
      });

      const Logger = jest.requireMock('../../../../util/Logger');
      const { result } = renderHook(() => usePerpsWatchlistActions());

      await act(async () => {
        await result.current.removeFromWatchlist('BTC');
      });

      expect(Logger.error).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          tags: expect.objectContaining({
            component: 'usePerpsWatchlistActions',
            action: 'remove_from_watchlist',
          }),
        }),
      );
      expect(mockShowToast).toHaveBeenCalledWith(mockRemoveError);
    });
  });
});
