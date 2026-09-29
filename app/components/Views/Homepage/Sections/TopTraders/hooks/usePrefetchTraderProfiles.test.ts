import { useFocusEffect } from '@react-navigation/native';
import { act, renderHook } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import ReactQueryService from '../../../../../../core/ReactQueryService';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import { prefetchTraderProfileData } from '../../../../../../util/social/traderProfileQueries';
import { usePrefetchTraderProfiles } from './usePrefetchTraderProfiles';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {},
  },
}));

jest.mock('../../../../../../util/social/traderProfileQueries', () => ({
  prefetchTraderProfileData: jest.fn().mockResolvedValue(undefined),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;
const mockPrefetchTraderProfileData =
  prefetchTraderProfileData as jest.MockedFunction<
    typeof prefetchTraderProfileData
  >;

const createInteractionHandle = (): ReturnType<
  typeof InteractionManager.runAfterInteractions
> => ({
  then: (onfulfilled, onrejected) =>
    Promise.resolve().then(onfulfilled, onrejected),
  done: (onfulfilled, onrejected) =>
    Promise.resolve().then(onfulfilled, onrejected),
  cancel: jest.fn(),
});

let focusCleanup: (() => void) | undefined;
let lastFocusCallback: (() => (() => void) | void) | undefined;

describe('usePrefetchTraderProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    lastFocusCallback = undefined;
    focusCleanup = undefined;

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) {
        return true;
      }
      return undefined;
    });

    mockUseFocusEffect.mockImplementation((callback) => {
      if (lastFocusCallback === callback) {
        return;
      }

      focusCleanup?.();
      lastFocusCallback = callback;
      const cleanup = callback();
      focusCleanup = typeof cleanup === 'function' ? cleanup : undefined;
    });

    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((task) => {
        if (typeof task === 'function') {
          task();
        }
        return createInteractionHandle();
      });
  });

  afterEach(() => {
    focusCleanup?.();
    focusCleanup = undefined;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const flushDeferredPrefetch = async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });
  };

  it('prefetches visible traders immediately on focus', async () => {
    renderHook(() =>
      usePrefetchTraderProfiles(['trader-1'], {
        enabled: true,
        isSectionVisible: true,
      }),
    );

    await flushDeferredPrefetch();

    expect(mockPrefetchTraderProfileData).toHaveBeenCalledWith(
      ReactQueryService.queryClient,
      'trader-1',
    );
  });

  it('prefetches on a 30s interval while focused', async () => {
    renderHook(() =>
      usePrefetchTraderProfiles(['trader-1'], {
        enabled: true,
        isSectionVisible: true,
      }),
    );

    await flushDeferredPrefetch();
    mockPrefetchTraderProfileData.mockClear();

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(mockPrefetchTraderProfileData).toHaveBeenCalledWith(
      ReactQueryService.queryClient,
      'trader-1',
    );
  });

  it('does not prefetch when the section is not visible', async () => {
    renderHook(() =>
      usePrefetchTraderProfiles(['trader-1'], {
        enabled: true,
        isSectionVisible: false,
      }),
    );

    await flushDeferredPrefetch();

    expect(mockPrefetchTraderProfileData).not.toHaveBeenCalled();
  });

  it('does not prefetch when disabled', async () => {
    renderHook(() =>
      usePrefetchTraderProfiles(['trader-1'], {
        enabled: false,
        isSectionVisible: true,
      }),
    );

    await flushDeferredPrefetch();

    expect(mockPrefetchTraderProfileData).not.toHaveBeenCalled();
  });

  it('does not prefetch when the wallet is locked', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) {
        return false;
      }
      return undefined;
    });

    renderHook(() =>
      usePrefetchTraderProfiles(['trader-1'], {
        enabled: true,
        isSectionVisible: true,
      }),
    );

    await flushDeferredPrefetch();

    expect(mockPrefetchTraderProfileData).not.toHaveBeenCalled();
  });

  it('prefetches only newly visible traders after a debounce', async () => {
    const { rerender } = renderHook(
      ({ visibleIds }) =>
        usePrefetchTraderProfiles(visibleIds, {
          enabled: true,
          isSectionVisible: true,
        }),
      { initialProps: { visibleIds: ['trader-1'] } },
    );

    await flushDeferredPrefetch();
    mockPrefetchTraderProfileData.mockClear();

    rerender({ visibleIds: ['trader-1', 'trader-2'] });

    await act(async () => {
      jest.advanceTimersByTime(299);
      await Promise.resolve();
    });
    expect(mockPrefetchTraderProfileData).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(mockPrefetchTraderProfileData).toHaveBeenCalledTimes(1);
    expect(mockPrefetchTraderProfileData).toHaveBeenCalledWith(
      ReactQueryService.queryClient,
      'trader-2',
    );
  });

  it('stops prefetching after blur cleanup', async () => {
    renderHook(() =>
      usePrefetchTraderProfiles(['trader-1'], {
        enabled: true,
        isSectionVisible: true,
      }),
    );

    await flushDeferredPrefetch();
    mockPrefetchTraderProfileData.mockClear();

    act(() => {
      focusCleanup?.();
    });

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(mockPrefetchTraderProfileData).not.toHaveBeenCalled();
  });

  it('cancels a pending debounced prefetch when shouldPrefetch becomes false', async () => {
    const { rerender } = renderHook(
      ({ isSectionVisible }) =>
        usePrefetchTraderProfiles(['trader-1', 'trader-2'], {
          enabled: true,
          isSectionVisible,
        }),
      { initialProps: { isSectionVisible: true } },
    );

    await flushDeferredPrefetch();
    mockPrefetchTraderProfileData.mockClear();

    rerender({ isSectionVisible: false });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockPrefetchTraderProfileData).not.toHaveBeenCalled();
  });

  it('skips in-flight InteractionManager prefetch when shouldPrefetch becomes false', async () => {
    let deferredTask: (() => void) | undefined;
    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((task) => {
        deferredTask = typeof task === 'function' ? task : undefined;
        return createInteractionHandle();
      });

    const { rerender } = renderHook(
      ({ isSectionVisible }) =>
        usePrefetchTraderProfiles(['trader-1'], {
          enabled: true,
          isSectionVisible,
        }),
      { initialProps: { isSectionVisible: true } },
    );

    rerender({ isSectionVisible: false });

    await act(async () => {
      deferredTask?.();
      await Promise.resolve();
    });

    expect(mockPrefetchTraderProfileData).not.toHaveBeenCalled();
  });
});
