import React from 'react';
import {
  act,
  fireEvent,
  render,
  type RenderAPI,
} from '@testing-library/react-native';
import { AccessibilityInfo, FlatList, StyleSheet, View } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { strings } from '../../../../locales/i18n';
import PullToRefresh, {
  PULL_REFRESH_THRESHOLD,
  PullToRefreshScrollView,
  PullToRefreshTestIds,
} from './index';
import {
  getResistedPullDistance,
  RIVE_HEIGHT,
  RIVE_WIDTH,
} from './pullToRefreshConstants';
import {
  __fireRiveViewError,
  __getRivePropertySetter,
  __resetRiveMocks,
  __setRivePropertyAvailability,
} from '../../../__mocks__/rive-app-react-native';
import { getHardwareTier } from '../../../util/deviceCapability';
import { fireImpact, ImpactMoment } from '../../../util/haptics';
import { useNetworkTier } from '../../../hooks/useNetworkTier';

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

jest.mock('../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(() => 'WIFI'),
}));

jest.mock('../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

jest.mock('../../../util/haptics', () => ({
  fireImpact: jest.fn(),
  ImpactMoment: {
    PullToRefreshEngage: 'pullToRefreshEngage',
    PullToRefresh: 'pullToRefresh',
  },
}));

jest.mock('../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');
  return {
    useTheme: (): typeof mockTheme => mockTheme,
  };
});

const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockGetHardwareTier = jest.mocked(getHardwareTier);
const mockFireImpact = jest.mocked(fireImpact);
const mockIsScreenReaderEnabled = jest.spyOn(
  AccessibilityInfo,
  'isScreenReaderEnabled',
);

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

const renderPullToRefreshScrollView = (
  props: Partial<React.ComponentProps<typeof PullToRefreshScrollView>> = {},
): RenderAPI =>
  render(
    <PullToRefreshScrollView
      refreshing={false}
      onRefresh={jest.fn()}
      scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
      {...props}
    >
      <View testID="pull-refresh-content" />
    </PullToRefreshScrollView>,
  );

describe('PullToRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockUseNetworkTier.mockReturnValue('WIFI');
    mockGetHardwareTier.mockReturnValue('HIGH');
    mockIsScreenReaderEnabled.mockResolvedValue(false);
    mockGestureCallbacks.onTouchesDown = undefined;
    mockGestureCallbacks.onTouchesMove = undefined;
    mockGestureCallbacks.onUpdate = undefined;
    mockGestureCallbacks.onEnd = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the Rive animation after binding is ready', () => {
    const { getByTestId } = renderPullToRefreshScrollView();

    expect(getByTestId(PullToRefreshTestIds.RIVE)).toBeOnTheScreen();
  });

  it('supports container-agnostic virtualized lists via render prop', async () => {
    const onRefresh = jest.fn();
    let capturedIsCustomActive = false;

    const { getByTestId } = render(
      <PullToRefresh refreshing={false} onRefresh={onRefresh}>
        {({ scrollProps, refreshControl, isCustomGestureActive }) => {
          capturedIsCustomActive = isCustomGestureActive;
          return (
            <FlatList
              testID="pull-refresh-flat-list"
              data={[{ id: '1' }]}
              keyExtractor={(item) => item.id}
              renderItem={() => <View testID="flat-list-item" />}
              {...scrollProps}
              refreshControl={refreshControl}
            />
          );
        }}
      </PullToRefresh>,
    );

    const flatList = getByTestId('pull-refresh-flat-list');
    expect(capturedIsCustomActive).toBe(true);
    expect(flatList.props.refreshControl).toBeUndefined();
    expect(flatList.props.bounces).toBe(false);
    expect(flatList.props.overScrollMode).toBe('never');

    const stateManager = createStateManager();
    await act(async () => {
      mockGestureCallbacks.onTouchesDown?.(createTouchEvent(0), stateManager);
      mockGestureCallbacks.onTouchesMove?.(
        createTouchEvent(PULL_REFRESH_THRESHOLD),
        stateManager,
      );
      mockGestureCallbacks.onEnd?.({ translationY: PULL_REFRESH_THRESHOLD });
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('omits scrollProps.onScroll and reads external scrollY shared value when provided', () => {
    let externalScrollY!: SharedValue<number>;
    let receivedOnScroll: unknown;

    const ExternalScrollHarness = (): React.JSX.Element => {
      const scrollY = useSharedValue(0);
      externalScrollY = scrollY;

      return (
        <PullToRefresh
          refreshing={false}
          onRefresh={jest.fn()}
          scrollY={scrollY}
        >
          {({ scrollProps, refreshControl }) => {
            receivedOnScroll = scrollProps.onScroll;
            return (
              <FlatList
                testID="external-scroll-list"
                data={[]}
                renderItem={() => null}
                {...scrollProps}
                refreshControl={refreshControl}
              />
            );
          }}
        </PullToRefresh>
      );
    };

    render(<ExternalScrollHarness />);

    expect(receivedOnScroll).toBeUndefined();

    const scrolledStateManager = createStateManager();
    act(() => {
      externalScrollY.value = 120;
      mockGestureCallbacks.onTouchesDown?.(
        createTouchEvent(0),
        scrolledStateManager,
      );
      mockGestureCallbacks.onTouchesMove?.(
        createTouchEvent(PULL_REFRESH_THRESHOLD / 2),
        scrolledStateManager,
      );
    });
    expect(scrolledStateManager.activate).not.toHaveBeenCalled();

    const atTopStateManager = createStateManager();
    act(() => {
      externalScrollY.value = 0;
      mockGestureCallbacks.onTouchesDown?.(
        createTouchEvent(0),
        atTopStateManager,
      );
      mockGestureCallbacks.onTouchesMove?.(
        createTouchEvent(PULL_REFRESH_THRESHOLD / 2),
        atTopStateManager,
      );
    });
    expect(atTopStateManager.activate).toHaveBeenCalled();
  });

  it('respects topScrollOffset for scrollables with negative top contentInset', () => {
    const { getByTestId } = renderPullToRefreshScrollView({
      topScrollOffset: -120,
    });
    const scrollView = getByTestId('pull-refresh-scroll-view');

    const atRestStateManager = createStateManager();
    act(() => {
      mockGestureCallbacks.onTouchesDown?.(
        createTouchEvent(0),
        atRestStateManager,
      );
      mockGestureCallbacks.onTouchesMove?.(
        createTouchEvent(PULL_REFRESH_THRESHOLD / 2),
        atRestStateManager,
      );
    });
    expect(atRestStateManager.activate).toHaveBeenCalled();

    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { y: -100 } },
    });
    const scrolledDownStateManager = createStateManager();
    act(() => {
      mockGestureCallbacks.onTouchesDown?.(
        createTouchEvent(0),
        scrolledDownStateManager,
      );
      mockGestureCallbacks.onTouchesMove?.(
        createTouchEvent(PULL_REFRESH_THRESHOLD / 2),
        scrolledDownStateManager,
      );
    });
    expect(scrolledDownStateManager.activate).not.toHaveBeenCalled();
  });

  it('updates the top scroll baseline when the inset changes after mount', () => {
    const onRefresh = jest.fn();
    const { rerender } = renderPullToRefreshScrollView({
      onRefresh,
      topScrollOffset: 0,
    });

    act(() => {
      rerender(
        <PullToRefreshScrollView
          refreshing={false}
          onRefresh={onRefresh}
          topScrollOffset={-120}
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefreshScrollView>,
      );
    });

    const stateManager = createStateManager();
    act(() => {
      mockGestureCallbacks.onTouchesDown?.(createTouchEvent(0), stateManager);
      mockGestureCallbacks.onTouchesMove?.(
        createTouchEvent(PULL_REFRESH_THRESHOLD / 2),
        stateManager,
      );
    });

    expect(stateManager.activate).toHaveBeenCalled();
    expect(stateManager.fail).not.toHaveBeenCalled();
  });

  it('unmounts Rive and disables custom gesture when isActive is false', () => {
    const onRefresh = jest.fn();
    const { getByTestId, queryByTestId, rerender } =
      renderPullToRefreshScrollView({
        onRefresh,
        isActive: true,
      });

    expect(getByTestId(PullToRefreshTestIds.RIVE)).toBeOnTheScreen();

    act(() => {
      rerender(
        <PullToRefreshScrollView
          refreshing={false}
          onRefresh={onRefresh}
          isActive={false}
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefreshScrollView>,
      );
    });

    expect(queryByTestId(PullToRefreshTestIds.RIVE)).toBeNull();
    expect(
      getByTestId('pull-refresh-scroll-view').props.refreshControl.props.testID,
    ).toBe(PullToRefreshTestIds.FALLBACK);

    act(() => {
      rerender(
        <PullToRefreshScrollView
          refreshing={false}
          onRefresh={onRefresh}
          isActive
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefreshScrollView>,
      );
    });

    expect(getByTestId(PullToRefreshTestIds.RIVE)).toBeOnTheScreen();
  });

  it('adds an accessibility action for the custom gesture', () => {
    const { getByTestId } = renderPullToRefreshScrollView();

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
    const { getByTestId } = renderPullToRefreshScrollView({
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
    ).toEqual(
      expect.objectContaining({
        height: RIVE_HEIGHT,
        width: RIVE_WIDTH,
      }),
    );
  });

  it('commits refresh from the accessibility activate action', async () => {
    const onRefresh = jest.fn();
    const { getByTestId } = renderPullToRefreshScrollView({ onRefresh });

    await act(async () => {
      getByTestId('pull-refresh-scroll-view').props.onAccessibilityAction({
        nativeEvent: { actionName: 'activate' },
      });
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(__getRivePropertySetter('isRefreshing')).toHaveBeenCalledWith(true);
  });

  it('writes pull progress during an active gesture', async () => {
    renderPullToRefreshScrollView();

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
      await Promise.resolve();
    });

    expect(stateManager.activate).toHaveBeenCalled();
    expect(__getRivePropertySetter('isPulling')).toHaveBeenCalledWith(true);
    expect(__getRivePropertySetter('pullProgress')).toHaveBeenCalledWith(50);
  });

  it('commits refresh after a threshold release', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderPullToRefreshScrollView({ onRefresh });

    const stateManager = createStateManager();
    await act(async () => {
      mockGestureCallbacks.onTouchesDown?.(createTouchEvent(0), stateManager);
      mockGestureCallbacks.onTouchesMove?.(
        createTouchEvent(PULL_REFRESH_THRESHOLD),
        stateManager,
      );
      mockGestureCallbacks.onEnd?.({
        translationY: PULL_REFRESH_THRESHOLD,
      });
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(mockFireImpact).toHaveBeenNthCalledWith(
      1,
      ImpactMoment.PullToRefreshEngage,
    );
    expect(mockFireImpact).toHaveBeenNthCalledWith(
      2,
      ImpactMoment.PullToRefresh,
    );
    expect(__getRivePropertySetter('isRefreshing')).toHaveBeenCalledWith(true);
  });

  it('clamps pull progress before writing it to Rive', async () => {
    renderPullToRefreshScrollView();

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

  it('applies resistance after the pull threshold', () => {
    const translationY = PULL_REFRESH_THRESHOLD * 2;

    expect(getResistedPullDistance(translationY)).toBe(
      PULL_REFRESH_THRESHOLD * 1.2,
    );
  });

  it('resets Rive bindings after a sub-threshold release', async () => {
    const onRefresh = jest.fn();
    renderPullToRefreshScrollView({ onRefresh });

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

  it('does not activate while the scroll view stays below the top', () => {
    const onRefresh = jest.fn();
    const { getByTestId } = renderPullToRefreshScrollView({ onRefresh });
    const scrollView = getByTestId('pull-refresh-scroll-view');
    const stateManager = createStateManager();

    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { y: 100 } },
    });
    act(() => {
      mockGestureCallbacks.onTouchesDown?.(createTouchEvent(0), stateManager);
      mockGestureCallbacks.onTouchesMove?.(
        createTouchEvent(PULL_REFRESH_THRESHOLD),
        stateManager,
      );
      mockGestureCallbacks.onEnd?.({ translationY: PULL_REFRESH_THRESHOLD });
    });

    expect(stateManager.activate).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('activates seamlessly when a single drag scrolls to the top and keeps pulling', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderPullToRefreshScrollView({ onRefresh });
    const scrollView = getByTestId('pull-refresh-scroll-view');
    const stateManager = createStateManager();

    // Start scrolled partway down the page
    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { y: 200 } },
    });
    await act(async () => {
      mockGestureCallbacks.onTouchesDown?.(createTouchEvent(0), stateManager);
      mockGestureCallbacks.onTouchesMove?.(createTouchEvent(150), stateManager);
      await Promise.resolve();
    });
    expect(stateManager.activate).not.toHaveBeenCalled();
    expect(stateManager.fail).not.toHaveBeenCalled();

    // Scroll view reaches top during the same drag
    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { y: 0 } },
    });
    await act(async () => {
      mockGestureCallbacks.onTouchesMove?.(createTouchEvent(220), stateManager);
      await Promise.resolve();
    });
    expect(stateManager.activate).toHaveBeenCalledTimes(1);

    // Pre-top travel (220px) is subtracted so progress stays at 0 rather than jumping to 100
    await act(async () => {
      mockGestureCallbacks.onUpdate?.({ translationY: 220 });
      await Promise.resolve();
    });
    expect(__getRivePropertySetter('isPulling')).toHaveBeenLastCalledWith(true);
    expect(__getRivePropertySetter('pullProgress')).toHaveBeenLastCalledWith(0);

    // Pulling halfway past the activation point yields 50% progress
    await act(async () => {
      mockGestureCallbacks.onUpdate?.({
        translationY: 220 + PULL_REFRESH_THRESHOLD / 2,
      });
      await Promise.resolve();
    });
    expect(__getRivePropertySetter('pullProgress')).toHaveBeenLastCalledWith(
      50,
    );

    // Releasing past PULL_REFRESH_THRESHOLD from the activation point commits refresh
    await act(async () => {
      mockGestureCallbacks.onEnd?.({
        translationY: 220 + PULL_REFRESH_THRESHOLD,
      });
      await Promise.resolve();
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not commit refresh when released shortly after reaching the top', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderPullToRefreshScrollView({ onRefresh });
    const scrollView = getByTestId('pull-refresh-scroll-view');
    const stateManager = createStateManager();

    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { y: 200 } },
    });
    await act(async () => {
      mockGestureCallbacks.onTouchesDown?.(createTouchEvent(0), stateManager);
      mockGestureCallbacks.onTouchesMove?.(createTouchEvent(190), stateManager);
      await Promise.resolve();
    });

    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { y: 0 } },
    });
    await act(async () => {
      mockGestureCallbacks.onTouchesMove?.(createTouchEvent(210), stateManager);
      mockGestureCallbacks.onUpdate?.({ translationY: 210 });
      // Only pulled 20px past top (well below PULL_REFRESH_THRESHOLD), even though total translationY is 230
      mockGestureCallbacks.onEnd?.({ translationY: 230 });
      await Promise.resolve();
    });

    expect(stateManager.activate).toHaveBeenCalledTimes(1);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('fails the gesture when scrolling deeper down or swiping horizontally while below the top', () => {
    const { getByTestId } = renderPullToRefreshScrollView();
    const scrollView = getByTestId('pull-refresh-scroll-view');

    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { y: 150 } },
    });

    const scrollDeeperManager = createStateManager();
    act(() => {
      mockGestureCallbacks.onTouchesDown?.(
        createTouchEvent(100),
        scrollDeeperManager,
      );
      mockGestureCallbacks.onTouchesMove?.(
        createTouchEvent(80),
        scrollDeeperManager,
      );
    });
    expect(scrollDeeperManager.fail).toHaveBeenCalled();
    expect(scrollDeeperManager.activate).not.toHaveBeenCalled();

    const horizontalSwipeManager = createStateManager();
    act(() => {
      mockGestureCallbacks.onTouchesDown?.(
        createTouchEvent(100, 100),
        horizontalSwipeManager,
      );
      mockGestureCallbacks.onTouchesMove?.(
        createTouchEvent(102, 130),
        horizontalSwipeManager,
      );
    });
    expect(horizontalSwipeManager.fail).toHaveBeenCalled();
    expect(horizontalSwipeManager.activate).not.toHaveBeenCalled();
  });

  it('maps a programmatic refresh to the Rive refresh lifecycle', () => {
    const onRefresh = jest.fn();
    const { getByTestId, rerender } = renderPullToRefreshScrollView({
      onRefresh,
    });
    const props = {
      refreshing: true,
      onRefresh,
      scrollViewProps: { testID: 'pull-refresh-scroll-view' },
      children: <View testID="pull-refresh-content" />,
    };

    act(() => {
      rerender(<PullToRefreshScrollView {...props} />);
    });

    expect(__getRivePropertySetter('isRefreshing')).toHaveBeenCalledWith(true);
    expect(
      getByTestId('pull-refresh-scroll-view').props.accessibilityState,
    ).toEqual(expect.objectContaining({ busy: true }));

    act(() => {
      rerender(<PullToRefreshScrollView {...props} refreshing={false} />);
    });

    expect(__getRivePropertySetter('isRefreshing')).toHaveBeenLastCalledWith(
      false,
    );
    expect(__getRivePropertySetter('pullProgress')).toHaveBeenLastCalledWith(0);
  });

  it('announces programmatic refresh lifecycle changes using default common strings', () => {
    const announceForAccessibility = jest.spyOn(
      AccessibilityInfo,
      'announceForAccessibility',
    );
    const onRefresh = jest.fn();
    const { rerender } = renderPullToRefreshScrollView({ onRefresh });

    act(() => {
      rerender(
        <PullToRefreshScrollView
          refreshing
          onRefresh={onRefresh}
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefreshScrollView>,
      );
    });

    act(() => {
      rerender(
        <PullToRefreshScrollView
          refreshing={false}
          onRefresh={onRefresh}
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefreshScrollView>,
      );
    });

    expect(announceForAccessibility).toHaveBeenNthCalledWith(
      1,
      strings('common.refreshing'),
    );
    expect(announceForAccessibility).toHaveBeenNthCalledWith(
      2,
      strings('common.updated'),
    );
  });

  it('supports custom accessibility announcements', () => {
    const announceForAccessibility = jest.spyOn(
      AccessibilityInfo,
      'announceForAccessibility',
    );
    const onRefresh = jest.fn();
    const { rerender } = renderPullToRefreshScrollView({
      onRefresh,
      refreshingAnnouncement: 'Updating feed',
      updatedAnnouncement: 'Feed updated',
    });

    act(() => {
      rerender(
        <PullToRefreshScrollView
          refreshing
          onRefresh={onRefresh}
          refreshingAnnouncement="Updating feed"
          updatedAnnouncement="Feed updated"
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefreshScrollView>,
      );
    });

    act(() => {
      rerender(
        <PullToRefreshScrollView
          refreshing={false}
          onRefresh={onRefresh}
          refreshingAnnouncement="Updating feed"
          updatedAnnouncement="Feed updated"
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefreshScrollView>,
      );
    });

    expect(announceForAccessibility).toHaveBeenNthCalledWith(
      1,
      'Updating feed',
    );
    expect(announceForAccessibility).toHaveBeenNthCalledWith(2, 'Feed updated');
  });

  it('does not let a previous outro timer unlock a newer refresh', () => {
    jest.useFakeTimers();
    const onRefresh = jest.fn();
    const { getByTestId, rerender } = renderPullToRefreshScrollView({
      onRefresh,
    });
    const stateManager = createStateManager();

    act(() => {
      rerender(
        <PullToRefreshScrollView
          refreshing
          onRefresh={onRefresh}
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefreshScrollView>,
      );
    });
    act(() => {
      rerender(
        <PullToRefreshScrollView
          refreshing={false}
          onRefresh={onRefresh}
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefreshScrollView>,
      );
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    act(() => {
      rerender(
        <PullToRefreshScrollView
          refreshing
          onRefresh={onRefresh}
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefreshScrollView>,
      );
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => {
      rerender(
        <PullToRefreshScrollView
          refreshing={false}
          onRefresh={onRefresh}
          scrollViewProps={{ testID: 'pull-refresh-scroll-view' }}
        >
          <View testID="pull-refresh-content" />
        </PullToRefreshScrollView>,
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
    const { getByTestId } = renderPullToRefreshScrollView({
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
    const { getByTestId, queryByTestId } = renderPullToRefreshScrollView();

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

  it('uses the native refresh control when a Rive property is unavailable', () => {
    __setRivePropertyAvailability('pullProgress', false);

    const { getByTestId, queryByTestId } = renderPullToRefreshScrollView({
      indicatorTopInset: 120,
      refreshControlTopInset: 0,
    });

    expect(queryByTestId(PullToRefreshTestIds.RIVE)).not.toBeOnTheScreen();
    expect(
      getByTestId('pull-refresh-scroll-view').props.refreshControl.props,
    ).toEqual(
      expect.objectContaining({
        progressViewOffset: 0,
        testID: PullToRefreshTestIds.FALLBACK,
      }),
    );
  });

  it('uses the native refresh control for screen reader users', async () => {
    mockIsScreenReaderEnabled.mockResolvedValue(true);

    const { getByTestId, queryByTestId } = renderPullToRefreshScrollView();

    await act(async () => {
      await Promise.resolve();
    });

    expect(queryByTestId(PullToRefreshTestIds.RIVE)).not.toBeOnTheScreen();
    expect(
      getByTestId('pull-refresh-scroll-view').props.refreshControl.props.testID,
    ).toBe(PullToRefreshTestIds.FALLBACK);
  });

  it('falls back on low hardware with a slow cellular connection', () => {
    mockGetHardwareTier.mockReturnValue('LOW');
    mockUseNetworkTier.mockReturnValue('SLOW_CELLULAR');

    const { getByTestId, queryByTestId } = renderPullToRefreshScrollView();

    expect(queryByTestId(PullToRefreshTestIds.RIVE)).toBeNull();
    expect(
      getByTestId('pull-refresh-scroll-view').props.refreshControl.props.testID,
    ).toBe(PullToRefreshTestIds.FALLBACK);
  });
});
