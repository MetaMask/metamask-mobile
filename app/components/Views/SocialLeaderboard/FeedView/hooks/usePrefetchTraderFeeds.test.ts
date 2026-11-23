import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import ReactQueryService from '../../../../../core/ReactQueryService';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import { prefetchTraderFeeds } from './traderFeedQueries';
import { usePrefetchTraderFeeds } from './usePrefetchTraderFeeds';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {},
  },
}));

jest.mock('./traderFeedQueries', () => ({
  prefetchTraderFeeds: jest.fn().mockResolvedValue(undefined),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockPrefetchTraderFeeds = prefetchTraderFeeds as jest.MockedFunction<
  typeof prefetchTraderFeeds
>;

const flushIdlePrefetch = () => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
};

describe('usePrefetchTraderFeeds', () => {
  const originalRequestIdleCallback = (
    globalThis as { requestIdleCallback?: unknown }
  ).requestIdleCallback;
  const originalCancelIdleCallback = (
    globalThis as { cancelIdleCallback?: unknown }
  ).cancelIdleCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    delete (globalThis as { requestIdleCallback?: unknown })
      .requestIdleCallback;
    delete (globalThis as { cancelIdleCallback?: unknown }).cancelIdleCallback;

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) {
        return true;
      }
      return undefined;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalRequestIdleCallback) {
      (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback =
        originalRequestIdleCallback;
    }
    if (originalCancelIdleCallback) {
      (globalThis as { cancelIdleCallback?: unknown }).cancelIdleCallback =
        originalCancelIdleCallback;
    }
  });

  it('prefetches both feed audiences on idle when enabled', () => {
    renderHook(() => usePrefetchTraderFeeds(true));

    expect(mockPrefetchTraderFeeds).not.toHaveBeenCalled();

    flushIdlePrefetch();

    expect(mockPrefetchTraderFeeds).toHaveBeenCalledWith(
      ReactQueryService.queryClient,
    );
  });

  it('does not prefetch when disabled', () => {
    renderHook(() => usePrefetchTraderFeeds(false));

    flushIdlePrefetch();

    expect(mockPrefetchTraderFeeds).not.toHaveBeenCalled();
  });

  it('does not prefetch when the wallet is locked', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) {
        return false;
      }
      return undefined;
    });

    renderHook(() => usePrefetchTraderFeeds(true));

    flushIdlePrefetch();

    expect(mockPrefetchTraderFeeds).not.toHaveBeenCalled();
  });

  it('prefetches once enabled flips from false to true', () => {
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => usePrefetchTraderFeeds(enabled),
      { initialProps: { enabled: false } },
    );

    flushIdlePrefetch();
    expect(mockPrefetchTraderFeeds).not.toHaveBeenCalled();

    rerender({ enabled: true });
    flushIdlePrefetch();

    expect(mockPrefetchTraderFeeds).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending idle prefetch when enabled becomes false', () => {
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => usePrefetchTraderFeeds(enabled),
      { initialProps: { enabled: true } },
    );

    rerender({ enabled: false });
    flushIdlePrefetch();

    expect(mockPrefetchTraderFeeds).not.toHaveBeenCalled();
  });
});
