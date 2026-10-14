import React from 'react';
import type {
  ScrollView,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { act, renderHook } from '@testing-library/react-hooks';
import type { TabItem } from '../../../../component-library/components-temp/Tabs';
import TokenDetailsV1TabBar, {
  TOKEN_DETAILS_V1_TABS,
  TOKEN_DETAILS_V1_TAB_BAR_TEST_ID,
  resolveSwipeTargetTab,
  useTokenDetailsV1ScrollStabilization,
  useTokenDetailsV1Tabs,
} from './TokenDetailsV1TabBar';

jest.mock('../../../../component-library/components-temp/Tabs', () => ({
  __esModule: true,
  TabsBar: ({
    tabs,
    activeIndex,
    onTabPress,
  }: {
    tabs: TabItem[];
    activeIndex: number;
    onTabPress: (index: number) => void;
  }) => {
    const { View, Pressable, Text } = jest.requireActual('react-native');
    return (
      <View>
        {tabs.map((tab, index) => (
          <Pressable
            key={tab.key}
            testID={tab.testID}
            onPress={() => onTabPress(index)}
          >
            <Text>
              {index === activeIndex
                ? `active:${tab.key}`
                : `inactive:${tab.key}`}
            </Text>
          </Pressable>
        ))}
        <Pressable testID="tab-bar-out-of-range" onPress={() => onTabPress(99)}>
          <Text>out-of-range</Text>
        </Pressable>
      </View>
    );
  },
}));

const renderTabBar = (
  activeTab: (typeof TOKEN_DETAILS_V1_TABS)[number],
  onTabPress = jest.fn(),
) =>
  render(
    <TokenDetailsV1TabBar activeTab={activeTab} onTabPress={onTabPress} />,
  );

describe('TokenDetailsV1TabBar', () => {
  it('renders the Overview, Security and Feed tabs in order', () => {
    const { getAllByText, getByTestId } = renderTabBar('overview');

    expect(getByTestId(TOKEN_DETAILS_V1_TAB_BAR_TEST_ID)).toBeTruthy();
    expect(
      getAllByText(/^(active|inactive):(overview|security|feed)$/).map(
        (node) => node.props.children,
      ),
    ).toStrictEqual(['active:overview', 'inactive:security', 'inactive:feed']);
    expect(TOKEN_DETAILS_V1_TABS).toStrictEqual([
      'overview',
      'security',
      'feed',
    ]);
  });

  it('marks only the active tab as active', () => {
    const { getByText, queryByText } = renderTabBar('feed');

    expect(getByText('active:feed')).toBeTruthy();
    expect(queryByText('active:overview')).toBeNull();
    expect(queryByText('active:security')).toBeNull();
  });

  it('maps the pressed design-system tab index to its tab key', () => {
    const onTabPress = jest.fn();
    const { getByTestId } = renderTabBar('overview', onTabPress);

    fireEvent.press(getByTestId('token-details-v1-tab-security'));

    expect(onTabPress).toHaveBeenCalledTimes(1);
    expect(onTabPress).toHaveBeenCalledWith('security');
  });

  it('forwards onLayout to the tab bar container', () => {
    const onLayout = jest.fn();
    const { getByTestId } = render(
      <TokenDetailsV1TabBar
        activeTab="overview"
        onTabPress={jest.fn()}
        onLayout={onLayout}
      />,
    );

    fireEvent(getByTestId(TOKEN_DETAILS_V1_TAB_BAR_TEST_ID), 'layout', {
      nativeEvent: { layout: { y: 350 } },
    });

    expect(onLayout).toHaveBeenCalledTimes(1);
    expect(onLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        nativeEvent: { layout: { y: 350 } },
      }),
    );
  });
});

describe('useTokenDetailsV1Tabs', () => {
  it('initialises with overview as the active tab and only mounted tab', () => {
    const { result } = renderHook(() => useTokenDetailsV1Tabs());

    expect(result.current.activeTab).toBe('overview');
    expect(result.current.mountedTabs.has('overview')).toBe(true);
    expect(result.current.mountedTabs.has('security')).toBe(false);
    expect(result.current.mountedTabs.has('feed')).toBe(false);
    expect(result.current.swipeGesture).toBeDefined();
  });

  it('activates and lazily mounts new tabs', () => {
    const { result } = renderHook(() => useTokenDetailsV1Tabs());

    act(() => {
      result.current.activateTab('security');
    });

    expect(result.current.activeTab).toBe('security');
    expect(result.current.mountedTabs.has('overview')).toBe(true);
    expect(result.current.mountedTabs.has('security')).toBe(true);

    act(() => {
      result.current.activateTab('security');
    });

    expect(result.current.activeTab).toBe('security');
  });

  it('notifies onTabChange when switching to a different tab', () => {
    const onTabChange = jest.fn();
    const { result } = renderHook(() =>
      useTokenDetailsV1Tabs({ initialTab: 'overview', onTabChange }),
    );

    act(() => {
      result.current.activateTab('security');
    });

    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith('security', 'overview');

    // Activating the already active tab does not trigger onTabChange
    act(() => {
      result.current.activateTab('security');
    });

    expect(onTabChange).toHaveBeenCalledTimes(1);
  });
});

describe('useTokenDetailsV1ScrollStabilization', () => {
  it('clamps scroll position to the tab bar offset when clampScrollToTabBar is called while scrolled down', () => {
    const scrollToMock = jest.fn();
    const mockScrollView = {
      scrollTo: scrollToMock,
    } as unknown as ScrollView;

    const { result } = renderHook(() =>
      useTokenDetailsV1ScrollStabilization({
        scrollViewRef: { current: mockScrollView },
      }),
    );

    act(() => {
      result.current.handleTabBarLayout({
        nativeEvent: { layout: { y: 400, x: 0, width: 375, height: 48 } },
      } as LayoutChangeEvent);
      result.current.handleScroll({
        nativeEvent: { contentOffset: { y: 800, x: 0 } },
      } as NativeSyntheticEvent<NativeScrollEvent>);
      result.current.clampScrollToTabBar();
    });

    expect(scrollToMock).toHaveBeenCalledWith({
      y: 400,
      animated: false,
    });
  });

  it('does not clamp scroll position when clampScrollToTabBar is called before scrolling past the tab bar', () => {
    const scrollToMock = jest.fn();
    const mockScrollView = {
      scrollTo: scrollToMock,
    } as unknown as ScrollView;

    const { result } = renderHook(() =>
      useTokenDetailsV1ScrollStabilization({
        scrollViewRef: { current: mockScrollView },
      }),
    );

    act(() => {
      result.current.handleTabBarLayout({
        nativeEvent: { layout: { y: 400, x: 0, width: 375, height: 48 } },
      } as LayoutChangeEvent);
      result.current.handleScroll({
        nativeEvent: { contentOffset: { y: 200, x: 0 } },
      } as NativeSyntheticEvent<NativeScrollEvent>);
      result.current.clampScrollToTabBar();
    });

    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it('forwards scroll events to the onScroll option', () => {
    const onScroll = jest.fn();
    const { result } = renderHook(() =>
      useTokenDetailsV1ScrollStabilization({ onScroll }),
    );

    const scrollEvent = {
      nativeEvent: { contentOffset: { y: 150, x: 0 } },
    } as NativeSyntheticEvent<NativeScrollEvent>;

    act(() => {
      result.current.handleScroll(scrollEvent);
    });

    expect(onScroll).toHaveBeenCalledWith(scrollEvent);
  });

  it('updates tab content minHeight based on the scroll view layout height', () => {
    const { result } = renderHook(() => useTokenDetailsV1ScrollStabilization());

    act(() => {
      result.current.handleScrollViewLayout({
        nativeEvent: { layout: { height: 900, y: 0, x: 0, width: 375 } },
      } as LayoutChangeEvent);
    });

    expect(
      result.current.tabContentContainerStyle.minHeight,
    ).toBeGreaterThanOrEqual(900);
  });
});

describe('resolveSwipeTargetTab', () => {
  it('swipes to the neighbouring tab when translation exceeds threshold', () => {
    expect(resolveSwipeTargetTab('overview', -120, 0)).toBe('security');
    expect(resolveSwipeTargetTab('security', -120, 0)).toBe('feed');
    expect(resolveSwipeTargetTab('security', 120, 0)).toBe('overview');
    expect(resolveSwipeTargetTab('feed', 120, 0)).toBe('security');
  });

  it('swipes to the neighbouring tab on a fast fling even with small travel', () => {
    expect(resolveSwipeTargetTab('overview', -10, -600)).toBe('security');
  });

  it('ignores indecisive gestures below the translation and velocity thresholds', () => {
    expect(resolveSwipeTargetTab('overview', 30, 0)).toBeNull();
    expect(resolveSwipeTargetTab('overview', 40, 100)).toBeNull();
  });

  it('refuses to swipe past the edges of the tab list', () => {
    expect(resolveSwipeTargetTab('overview', 120, 0)).toBeNull();
    expect(resolveSwipeTargetTab('feed', -120, 0)).toBeNull();
  });
});
