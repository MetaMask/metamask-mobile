import React from 'react';
import {
  act,
  fireEvent,
  render,
  type RenderAPI,
} from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import PullToRefresh, {
  PULL_REFRESH_THRESHOLD,
  PullToRefreshTestIds,
} from './PullToRefresh';
import {
  __fireRiveViewError,
  __getRivePropertySetter,
  __resetRiveMocks,
} from '../../../../../__mocks__/rive-app-react-native';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import { fireImpact, ImpactMoment } from '../../../../../util/haptics';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';

type GestureCallback = (...args: unknown[]) => void;

interface MockGestureStateManager {
  activate: jest.Mock;
  fail: jest.Mock;
}

interface MockPanGesture {
  manualActivation: jest.Mock;
  onTouchesDown: jest.Mock;
  onTouchesMove: jest.Mock;
  onUpdate: jest.Mock;
  onEnd: jest.Mock;
  onFinalize: jest.Mock;
}

const mockGestureCallbacks: {
  onTouchesDown?: GestureCallback;
  onTouchesMove?: GestureCallback;
  onUpdate?: GestureCallback;
  onEnd?: GestureCallback;
} = {};

const mockPanGesture: MockPanGesture = {
  manualActivation: jest.fn(() => mockPanGesture),
  onTouchesDown: jest.fn((callback: GestureCallback) => {
    mockGestureCallbacks.onTouchesDown = callback;
    return mockPanGesture;
  }),
  onTouchesMove: jest.fn((callback: GestureCallback) => {
    mockGestureCallbacks.onTouchesMove = callback;
    return mockPanGesture;
  }),
  onUpdate: jest.fn((callback: GestureCallback) => {
    mockGestureCallbacks.onUpdate = callback;
    return mockPanGesture;
  }),
  onEnd: jest.fn((callback: GestureCallback) => {
    mockGestureCallbacks.onEnd = callback;
    return mockPanGesture;
  }),
  onFinalize: jest.fn(() => mockPanGesture),
};

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: jest.fn(() => mockPanGesture),
    Native: jest.fn(() => ({})),
    Simultaneous: jest.fn((gesture: unknown) => gesture),
  },
  GestureDetector: ({
    children,
  }: {
    children: React.ReactNode;
  }): React.ReactNode => children,
}));

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: jest.fn(
    (callback: (...args: unknown[]) => void, ...args: unknown[]) =>
      queueMicrotask(() => callback(...args)),
  ),
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(() => 'WIFI'),
}));

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

jest.mock('../../../../../util/haptics', () => ({
  fireImpact: jest.fn(),
  ImpactMoment: {
    PullToRefreshEngage: 'pullToRefreshEngage',
  },
}));

jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: (): typeof mockTheme => mockTheme,
  };
});

const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockGetHardwareTier = jest.mocked(getHardwareTier);
const mockFireImpact = jest.mocked(fireImpact);

const createStateManager = (): MockGestureStateManager => ({
  activate: jest.fn(),
  fail: jest.fn(),
});

const createTouchEvent = (
  y: number,
  x = 0,
): { allTouches: { y: number; x: number }[] } => ({
  allTouches: [{ y, x }],
});

const renderPullToRefresh = (
  props: Partial<React.ComponentProps<typeof PullToRefresh>> = {},
): RenderAPI =>
  render(
    <PullToRefresh
      refreshing={false}
      onRefresh={jest.fn()}
      scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
      {...props}
    >
      <View testID="pull-refresh-content" />
    </PullToRefresh>,
  );

describe('PullToRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockUseNetworkTier.mockReturnValue('WIFI');
    mockGetHardwareTier.mockReturnValue('HIGH');
    mockGestureCallbacks.onTouchesDown = undefined;
    mockGestureCallbacks.onTouchesMove = undefined;
    mockGestureCallbacks.onUpdate = undefined;
    mockGestureCallbacks.onEnd = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('binds the Rive animation and uses the native refresh fallback until it is ready', () => {
    const { getByTestId } = renderPullToRefresh();

    expect(getByTestId(PullToRefreshTestIds.RIVE)).toBeOnTheScreen();
    expect(
      getByTestId('pull-refresh-scroll-view').props.refreshControl,
    ).toBeUndefined();
    expect(getByTestId('pull-refresh-scroll-view').props.bounces).toBe(false);
    expect(getByTestId('pull-refresh-scroll-view').props.overScrollMode).toBe(
      'never',
    );
    expect(
      getByTestId('pull-refresh-scroll-view').props.accessibilityActions,
    ).toEqual(expect.arrayContaining([{ name: 'activate' }]));
  });

  it('keeps the Rive animation in a bounded slot below the header inset', () => {
    const { getByTestId } = renderPullToRefresh({
      indicatorTopInset: 72,
      indicatorBottomInset: 16,
    });

    expect(
      StyleSheet.flatten(
        getByTestId(PullToRefreshTestIds.INDICATOR).props.style,
      ),
    ).toEqual(
      expect.objectContaining({
        top: 72,
        height: PULL_REFRESH_THRESHOLD + 16,
        justifyContent: 'center',
        overflow: 'hidden',
      }),
    );
    expect(
      StyleSheet.flatten(getByTestId(PullToRefreshTestIds.RIVE).props.style),
    ).toEqual(expect.objectContaining({ height: PULL_REFRESH_THRESHOLD }));
  });

  it('commits refresh from the accessibility activate action', async () => {
    const onRefresh = jest.fn();
    const { getByTestId } = renderPullToRefresh({ onRefresh });

    await act(async () => {
      getByTestId('pull-refresh-scroll-view').props.onAccessibilityAction({
        nativeEvent: { actionName: 'activate' },
      });
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(__getRivePropertySetter('isRefreshing')).toHaveBeenCalledWith(true);
  });

  it('updates pull progress and commits refresh at the threshold', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderPullToRefresh({ onRefresh });

    const stateManager = createStateManager();
    await act(async () => {
      mockGestureCallbacks.onTouchesDown?.(createTouchEvent(0), stateManager);
      mockGestureCallbacks.onTouchesMove?.(
        createTouchEvent(PULL_REFRESH_THRESHOLD / 2),
        stateManager,
      );
      mockGestureCallbacks.onUpdate?.({
        translationY: PULL_REFRESH_THRESHOLD / 2,
      });
      mockGestureCallbacks.onEnd?.({
        translationY: PULL_REFRESH_THRESHOLD,
      });
      await Promise.resolve();
    });

    expect(stateManager.activate).toHaveBeenCalled();
    expect(__getRivePropertySetter('isPulling')).toHaveBeenCalledWith(true);
    expect(__getRivePropertySetter('pullProgress')).toHaveBeenCalledWith(50);
    expect(__getRivePropertySetter('isRefreshing')).toHaveBeenCalledWith(true);
    expect(mockFireImpact).toHaveBeenCalledWith(
      ImpactMoment.PullToRefreshEngage,
    );
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('clamps pull progress before writing it to Rive', async () => {
    renderPullToRefresh();

    const stateManager = createStateManager();
    await act(async () => {
      mockGestureCallbacks.onTouchesDown?.(createTouchEvent(0), stateManager);
      mockGestureCallbacks.onTouchesMove?.(
        createTouchEvent(PULL_REFRESH_THRESHOLD * 2),
        stateManager,
      );
      mockGestureCallbacks.onUpdate?.({
        translationY: PULL_REFRESH_THRESHOLD * 2,
      });
      await Promise.resolve();
    });

    expect(__getRivePropertySetter('pullProgress')).toHaveBeenLastCalledWith(
      100,
    );
  });

  it('cancels a pull below the threshold and resets the Rive bindings', async () => {
    const onRefresh = jest.fn();
    renderPullToRefresh({ onRefresh });

    const stateManager = createStateManager();
    await act(async () => {
      mockGestureCallbacks.onTouchesDown?.(createTouchEvent(0), stateManager);
      mockGestureCallbacks.onTouchesMove?.(createTouchEvent(20), stateManager);
      mockGestureCallbacks.onUpdate?.({ translationY: 20 });
      mockGestureCallbacks.onEnd?.({ translationY: 20 });
      await Promise.resolve();
    });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(__getRivePropertySetter('isPulling')).toHaveBeenLastCalledWith(
      false,
    );
    expect(__getRivePropertySetter('pullProgress')).toHaveBeenLastCalledWith(0);
  });

  it('does not activate when the scroll view is not at the top', () => {
    const { getByTestId } = renderPullToRefresh();
    const scrollView = getByTestId('pull-refresh-scroll-view');
    const stateManager = createStateManager();

    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { y: 100 } },
    });
    act(() => {
      mockGestureCallbacks.onTouchesDown?.(createTouchEvent(0), stateManager);
    });

    expect(stateManager.fail).toHaveBeenCalled();
    expect(stateManager.activate).not.toHaveBeenCalled();
  });

  it('maps a programmatic refresh to the Rive refresh lifecycle', () => {
    const onRefresh = jest.fn();
    const { getByTestId, rerender } = renderPullToRefresh({ onRefresh });
    const props = {
      refreshing: true,
      onRefresh,
      scrollViewProps: { testID: 'pull-refresh-scroll-view' },
      children: <View testID="pull-refresh-content" />,
    };

    act(() => {
      rerender(<PullToRefresh {...props} />);
    });

    expect(__getRivePropertySetter('isRefreshing')).toHaveBeenCalledWith(true);
    expect(
      getByTestId('pull-refresh-scroll-view').props.accessibilityState,
    ).toEqual(expect.objectContaining({ busy: true }));

    act(() => {
      rerender(<PullToRefresh {...props} refreshing={false} />);
    });

    expect(__getRivePropertySetter('isRefreshing')).toHaveBeenLastCalledWith(
      false,
    );
    expect(__getRivePropertySetter('pullProgress')).toHaveBeenLastCalledWith(0);
  });

  it('does not let a previous outro timer unlock a newer refresh', () => {
    jest.useFakeTimers();
    const onRefresh = jest.fn();
    const { getByTestId, rerender } = renderPullToRefresh({ onRefresh });
    const stateManager = createStateManager();

    act(() => {
      rerender(
        <PullToRefresh
          refreshing
          onRefresh={onRefresh}
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefresh>,
      );
    });
    act(() => {
      rerender(
        <PullToRefresh
          refreshing={false}
          onRefresh={onRefresh}
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefresh>,
      );
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    act(() => {
      rerender(
        <PullToRefresh
          refreshing
          onRefresh={onRefresh}
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefresh>,
      );
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => {
      rerender(
        <PullToRefresh
          refreshing={false}
          onRefresh={onRefresh}
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefresh>,
      );
    });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    act(() => {
      mockGestureCallbacks.onTouchesDown?.(createTouchEvent(0), stateManager);
    });

    expect(stateManager.fail).toHaveBeenCalled();
    expect(
      getByTestId('pull-refresh-scroll-view').props.refreshControl,
    ).toBeUndefined();
  });

  it('catches synchronous errors from the native refresh fallback', async () => {
    mockGetHardwareTier.mockReturnValue('LOW');
    mockUseNetworkTier.mockReturnValue('SLOW_CELLULAR');
    const onRefresh = jest.fn(() => {
      throw new Error('refresh failed');
    });
    const { getByTestId } = renderPullToRefresh({
      onRefresh,
    });
    const refreshControl = getByTestId('pull-refresh-scroll-view').props
      .refreshControl;

    await act(async () => {
      refreshControl.props.onRefresh();
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('falls back to the native refresh control when Rive reports an error', () => {
    const { getByTestId, queryByTestId } = renderPullToRefresh();

    act(() => {
      __fireRiveViewError({ message: 'invalid state machine', type: 4 });
    });

    expect(queryByTestId(PullToRefreshTestIds.RIVE)).toBeNull();
    expect(
      getByTestId('pull-refresh-scroll-view').props.refreshControl.props.testID,
    ).toBe(PullToRefreshTestIds.FALLBACK);

    const stateManager = createStateManager();
    act(() => {
      mockGestureCallbacks.onTouchesDown?.(createTouchEvent(0), stateManager);
    });
    expect(stateManager.fail).toHaveBeenCalled();
  });

  it('falls back on low hardware with a slow cellular connection', () => {
    mockGetHardwareTier.mockReturnValue('LOW');
    mockUseNetworkTier.mockReturnValue('SLOW_CELLULAR');

    const { getByTestId, queryByTestId } = renderPullToRefresh();

    expect(queryByTestId(PullToRefreshTestIds.RIVE)).toBeNull();
    expect(
      getByTestId('pull-refresh-scroll-view').props.refreshControl.props.testID,
    ).toBe(PullToRefreshTestIds.FALLBACK);
  });
});
