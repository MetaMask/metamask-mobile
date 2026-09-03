import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import {
  ParamListBase,
  TabNavigationState,
  NavigationHelpers,
} from '@react-navigation/native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import { ActivityScreenEntryPoint } from '../../../../core/Analytics/events/activity';
import { trackExploreSearchOpened } from '../../../../components/Views/TrendingView/search/analytics';
import TabBarFloating from './TabBarFloating';
import {
  HIGHLIGHT_LIFT_ICON_SCALE,
  HIGHLIGHT_LIFT_SCALE,
  TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
  TAB_BAR_FLOATING_TEST_IDS,
} from './TabBarFloating.constants';
import {
  TabBarIconKey,
  ExtendedBottomTabDescriptor,
} from '../TabBar/TabBar.types';

jest.mock('../../../../components/Views/TrendingView/search/analytics', () => ({
  trackExploreSearchOpened: jest.fn(),
}));

const mockNavigateToMoneyHome = jest.fn();
jest.mock('../../../../components/UI/Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: () => ({
    navigateToMoneyHome: mockNavigateToMoneyHome,
  }),
}));

interface TestTabDescriptor {
  options: {
    tabBarIconKey: TabBarIconKey;
    rootScreenName: string;
    callback?: () => void;
    isHidden?: boolean;
    isSelected?: (rootScreenName: string) => boolean;
    onLeave?: () => void;
  };
}

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  emit: jest.fn(),
} as unknown as NavigationHelpers<ParamListBase>;

const mockInitialState = { engine: { backgroundState } };

// Treatment tab set: Home / Explore / Money / Social. No Trade "+".
const state = {
  index: 0,
  routeNames: ['Home', 'Explore', 'Money', 'Social'],
  routes: [
    { key: '1', name: 'Home' },
    { key: '2', name: 'Explore' },
    { key: '3', name: 'Money' },
    { key: '4', name: 'Social' },
  ],
};

const descriptors: Record<string, TestTabDescriptor> = {
  '1': {
    options: {
      tabBarIconKey: TabBarIconKey.Wallet,
      rootScreenName: Routes.WALLET_VIEW,
    },
  },
  '2': {
    options: {
      tabBarIconKey: TabBarIconKey.Trending,
      rootScreenName: Routes.TRENDING_VIEW,
    },
  },
  '3': {
    options: {
      tabBarIconKey: TabBarIconKey.Money,
      rootScreenName: Routes.MONEY.HOME,
    },
  },
  '4': {
    options: {
      tabBarIconKey: TabBarIconKey.Social,
      rootScreenName: Routes.SOCIAL_LEADERBOARD.TAB,
    },
  },
};

const barElement = (
  overrides: Partial<Record<string, TestTabDescriptor>> = {},
  onHeightChange?: (height: number) => void,
  activeIndex = 0,
) => (
  <TabBarFloating
    state={
      { ...state, index: activeIndex } as TabNavigationState<ParamListBase>
    }
    descriptors={
      { ...descriptors, ...overrides } as Record<
        string,
        ExtendedBottomTabDescriptor
      >
    }
    navigation={navigation}
    onHeightChange={onHeightChange}
  />
);

const renderBar = (
  overrides: Partial<Record<string, TestTabDescriptor>> = {},
  onHeightChange?: (height: number) => void,
  activeIndex = 0,
) =>
  renderWithProvider(
    <TabBarFloating
      state={
        { ...state, index: activeIndex } as TabNavigationState<ParamListBase>
      }
      descriptors={
        { ...descriptors, ...overrides } as Record<
          string,
          ExtendedBottomTabDescriptor
        >
      }
      navigation={navigation}
      onHeightChange={onHeightChange}
    />,
    { state: mockInitialState },
  );

// Highlight movement is a reanimated spring, so tests settle it before asserting.
// Jest's Reanimated harness cannot observe a spring mid-flight — only where it
// lands — so these tests cover placement, not the motion itself.
const flushAnimations = () => act(() => jest.advanceTimersByTime(2000));

const SLOT_WIDTH = 80;
const SLOT_HEIGHT = 48;
const TREATMENT_TABS = [
  TabBarIconKey.Wallet,
  TabBarIconKey.Trending,
  TabBarIconKey.Money,
  TabBarIconKey.Social,
];

/** Reports a box for each tab slot, as native layout would after first paint. */
const layoutSlots = (
  getByTestId: ReturnType<typeof renderBar>['getByTestId'],
) => {
  TREATMENT_TABS.forEach((key, slot) => {
    fireEvent(getByTestId(`tab-bar-item-${key}`), 'layout', {
      nativeEvent: {
        layout: {
          x: slot * SLOT_WIDTH,
          y: 0,
          width: SLOT_WIDTH,
          height: SLOT_HEIGHT,
        },
      },
    });
  });
};

describe('TabBarFloating', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterAll(() => jest.useRealTimers());

  it('renders the pill, the four treatment tabs, and the search button', () => {
    const { getByTestId } = renderBar();

    expect(getByTestId(TAB_BAR_FLOATING_TEST_IDS.PILL)).toBeOnTheScreen();
    expect(
      getByTestId(TAB_BAR_FLOATING_TEST_IDS.SEARCH_BUTTON),
    ).toBeOnTheScreen();
    for (const key of [
      TabBarIconKey.Wallet,
      TabBarIconKey.Trending,
      TabBarIconKey.Money,
      TabBarIconKey.Social,
    ]) {
      expect(getByTestId(`tab-bar-item-${key}`)).toBeOnTheScreen();
    }
  });

  it('detaches from layout so content scrolls underneath', () => {
    const { getByTestId } = renderBar();

    expect(getByTestId(TAB_BAR_FLOATING_TEST_IDS.CONTAINER)).toHaveStyle({
      position: 'absolute',
      bottom: 0,
    });
  });

  // Devices reporting no bottom inset (Android emulators, gesture nav) once
  // produced negative padding, dropping the pill onto the system nav bar.
  it('keeps a positive bottom gap when the device reports no bottom inset', () => {
    const { getByTestId } = renderBar();

    const { paddingBottom } = StyleSheet.flatten(
      getByTestId(TAB_BAR_FLOATING_TEST_IDS.CONTAINER).props.style,
    );

    expect(paddingBottom).toBe(TAB_BAR_FLOATING_MIN_BOTTOM_PADDING);
  });

  it('places the shared highlight on the active slot once slots are measured', () => {
    const onHome = renderBar();
    layoutSlots(onHome.getByTestId);
    flushAnimations();

    // Slot 0 sits at translateX 0, same as the unplaced state, so opacity is
    // what proves the highlight actually landed.
    expect(
      onHome.getByTestId(TAB_BAR_FLOATING_TEST_IDS.HIGHLIGHT),
    ).toHaveAnimatedStyle({
      opacity: 1,
      width: SLOT_WIDTH,
      transform: [{ translateX: 0 }, { scaleX: 1 }, { scaleY: 1 }],
    });

    // Money is the third slot, so the highlight rests two widths across.
    const onMoney = renderBar({}, undefined, 2);
    layoutSlots(onMoney.getByTestId);
    flushAnimations();

    expect(
      onMoney.getByTestId(TAB_BAR_FLOATING_TEST_IDS.HIGHLIGHT),
    ).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateX: 2 * SLOT_WIDTH }, { scaleX: 1 }, { scaleY: 1 }],
    });
  });

  it('stays hidden until a slot has been measured', () => {
    const { getByTestId } = renderBar();

    expect(
      getByTestId(TAB_BAR_FLOATING_TEST_IDS.HIGHLIGHT),
    ).toHaveAnimatedStyle({ opacity: 0 });
  });

  // The press writes the target before navigation runs, so the slide is not
  // held up by mounting the destination screen.
  it('slides on press without waiting for navigation to report a new index', () => {
    const { getByTestId } = renderBar();
    layoutSlots(getByTestId);
    flushAnimations();

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Social}`));
    flushAnimations();

    expect(
      getByTestId(TAB_BAR_FLOATING_TEST_IDS.HIGHLIGHT),
    ).toHaveAnimatedStyle({
      transform: [{ translateX: 3 * SLOT_WIDTH }, { scaleX: 1 }, { scaleY: 1 }],
    });
  });

  // Lift is observable here only at rest: springs settle on their exact target,
  // so a held press lands on the full lift and release lands back on none.
  it('lifts the highlight while a finger is down and drops it on release', () => {
    const { getByTestId } = renderBar();
    layoutSlots(getByTestId);
    flushAnimations();
    const home = getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}`);
    const lifted = 1 + HIGHLIGHT_LIFT_SCALE;

    fireEvent(home, 'pressIn');
    flushAnimations();

    expect(
      getByTestId(TAB_BAR_FLOATING_TEST_IDS.HIGHLIGHT),
    ).toHaveAnimatedStyle({
      transform: [{ translateX: 0 }, { scaleX: lifted }, { scaleY: lifted }],
    });

    // The icon under the bubble swells with it. The bubble is centred on Home,
    // so proximity is 1 and the scale is the full amount.
    expect(
      getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}-content`),
    ).toHaveAnimatedStyle({
      transform: [{ scale: 1 + HIGHLIGHT_LIFT_ICON_SCALE }],
    });

    fireEvent(home, 'pressOut');
    flushAnimations();

    expect(
      getByTestId(TAB_BAR_FLOATING_TEST_IDS.HIGHLIGHT),
    ).toHaveAnimatedStyle({
      transform: [{ translateX: 0 }, { scaleX: 1 }, { scaleY: 1 }],
    });
  });

  it('renders no lifted glass disc when glass is unavailable', () => {
    const { queryByTestId } = renderBar();

    expect(queryByTestId(TAB_BAR_FLOATING_TEST_IDS.HIGHLIGHT_GLASS)).toBeNull();
  });

  it('leaves the active background to the shared highlight, not the item', () => {
    const { getByTestId } = renderBar();

    const activeItem = StyleSheet.flatten(
      getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}`).props.style,
    );

    expect(activeItem.backgroundColor).toBe('transparent');
  });

  it('sizes the search button to a circle matching the pill height', () => {
    const { getByTestId } = renderBar();

    fireEvent(getByTestId(TAB_BAR_FLOATING_TEST_IDS.PILL), 'layout', {
      nativeEvent: { layout: { height: 60, width: 300, x: 0, y: 0 } },
    });

    expect(getByTestId(TAB_BAR_FLOATING_TEST_IDS.SEARCH_BUTTON)).toHaveStyle({
      height: 60,
      width: 60,
    });
  });

  it('reports its measured height so scenes can pad for the overlay', () => {
    const onHeightChange = jest.fn();
    const { getByTestId } = renderBar({}, onHeightChange);

    fireEvent(getByTestId(TAB_BAR_FLOATING_TEST_IDS.CONTAINER), 'layout', {
      nativeEvent: { layout: { height: 88, width: 390, x: 0, y: 0 } },
    });

    expect(onHeightChange).toHaveBeenCalledWith(88);
  });

  it('does not re-report height for sub-3px fluctuations (Android inset oscillation)', () => {
    const onHeightChange = jest.fn();
    const { getByTestId } = renderBar({}, onHeightChange);
    const container = getByTestId(TAB_BAR_FLOATING_TEST_IDS.CONTAINER);

    fireEvent(container, 'layout', {
      nativeEvent: { layout: { height: 88, width: 390, x: 0, y: 0 } },
    });
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { height: 89, width: 390, x: 0, y: 0 } },
    });
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { height: 88, width: 390, x: 0, y: 0 } },
    });

    expect(onHeightChange).toHaveBeenCalledTimes(1);
    expect(onHeightChange).toHaveBeenCalledWith(88);
  });

  it('does re-report height when a genuine resize exceeds the threshold', () => {
    const onHeightChange = jest.fn();
    const { getByTestId } = renderBar({}, onHeightChange);
    const container = getByTestId(TAB_BAR_FLOATING_TEST_IDS.CONTAINER);

    fireEvent(container, 'layout', {
      nativeEvent: { layout: { height: 88, width: 390, x: 0, y: 0 } },
    });
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { height: 96, width: 390, x: 0, y: 0 } },
    });

    expect(onHeightChange).toHaveBeenCalledTimes(2);
    expect(onHeightChange).toHaveBeenLastCalledWith(96);
  });

  it('reports zero height on unmount so a hidden bar leaves no gap', () => {
    const onHeightChange = jest.fn();
    const { unmount } = renderBar({}, onHeightChange);

    unmount();

    expect(onHeightChange).toHaveBeenCalledWith(0);
  });

  it('does not render a Trade button', () => {
    const { queryByTestId } = renderBar();

    expect(
      queryByTestId(`tab-bar-item-${TabBarIconKey.Trade}`),
    ).not.toBeOnTheScreen();
  });

  it('opens explore search from the search button', () => {
    const { getByTestId } = renderBar();

    fireEvent.press(getByTestId(TAB_BAR_FLOATING_TEST_IDS.SEARCH_BUTTON));

    expect(trackExploreSearchOpened).toHaveBeenCalledWith('nav_bar');
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.EXPLORE_SEARCH);
  });

  it('navigates to the wallet home from the Home tab', () => {
    const { getByTestId } = renderBar();

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}`));

    expect(navigation.navigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
      screen: Routes.WALLET_VIEW,
    });
  });

  it('navigates to the social tab route from the Social tab', () => {
    const { getByTestId } = renderBar();

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Social}`));

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.TAB,
    );
  });

  it('routes Money through the money navigation hook', () => {
    const { getByTestId } = renderBar();

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Money}`));

    expect(mockNavigateToMoneyHome).toHaveBeenCalled();
  });

  it('passes the bottom-nav entry point when Activity replaces Money', () => {
    const { getByTestId } = renderBar({
      '3': {
        options: {
          tabBarIconKey: TabBarIconKey.Activity,
          rootScreenName: Routes.TRANSACTIONS_VIEW,
        },
      },
    });

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Activity}`));

    expect(navigation.navigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: { entryPoint: ActivityScreenEntryPoint.BottomNavClick },
    });
  });

  it('fires the descriptor callback on press', () => {
    const callback = jest.fn();
    const { getByTestId } = renderBar({
      '1': {
        options: {
          tabBarIconKey: TabBarIconKey.Wallet,
          rootScreenName: Routes.WALLET_VIEW,
          callback,
        },
      },
    });

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}`));

    expect(callback).toHaveBeenCalled();
  });

  // Explore stays mounted on blur, so `onLeave` is its only chance to end the
  // trending session. Dropping it leaves the session running for the whole arm.
  it('fires the previous tab onLeave when switching away', () => {
    const onLeave = jest.fn();
    const { getByTestId } = renderBar(
      {
        '2': {
          options: {
            tabBarIconKey: TabBarIconKey.Trending,
            rootScreenName: Routes.TRENDING_VIEW,
            onLeave,
          },
        },
      },
      undefined,
      1,
    );

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}`));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('does not fire onLeave when re-pressing the active tab', () => {
    const onLeave = jest.fn();
    const { getByTestId } = renderBar(
      {
        '2': {
          options: {
            tabBarIconKey: TabBarIconKey.Trending,
            rootScreenName: Routes.TRENDING_VIEW,
            onLeave,
          },
        },
      },
      undefined,
      1,
    );

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Trending}`));

    expect(onLeave).not.toHaveBeenCalled();
  });

  it('skips hidden descriptors', () => {
    const { queryByTestId } = renderBar({
      '2': {
        options: {
          tabBarIconKey: TabBarIconKey.Trending,
          rootScreenName: Routes.TRENDING_VIEW,
          isHidden: true,
        },
      },
    });

    expect(
      queryByTestId(`tab-bar-item-${TabBarIconKey.Trending}`),
    ).not.toBeOnTheScreen();
  });
});
