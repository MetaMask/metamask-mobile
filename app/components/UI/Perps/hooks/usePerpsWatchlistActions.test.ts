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

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      toggleWatchlistMarket: (...args: unknown[]) =>
        mockToggleWatchlistMarket(...args),
      getWatchlistMarkets: () => mockGetWatchlistMarkets(),
    },
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
const mockAddError = { variant: 'error', labelOptions: [] };
jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      watchlist: { addError: mockAddError },
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
      mockGetWatchlistMarkets.mockReturnValue(['BTC', 'ETH']);

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

    it('uses the provided source in analytics', async () => {
      const { result } = renderHook(() =>
        usePerpsWatchlistActions(PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST),
      );

      await act(async () => {
        await result.current.addToWatchlist('BTC');
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
        await result.current.addToWatchlist('BTC');
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

    it('does not call track when toggleWatchlistMarket throws', async () => {
      mockToggleWatchlistMarket.mockImplementationOnce(() => {
        throw new Error('fail');
      });

      const { result } = renderHook(() => usePerpsWatchlistActions());

      await act(async () => {
        await result.current.addToWatchlist('BTC');
      });

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
      mockGetWatchlistMarkets.mockReturnValue([]);

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

    it('calls Logger.error on failure without showing toast', async () => {
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
      // No toast on remove failure (intentional — no addError toast for removes)
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });
});
