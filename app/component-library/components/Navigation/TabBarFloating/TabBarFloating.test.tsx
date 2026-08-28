import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
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
import { TAB_BAR_FLOATING_TEST_IDS } from './TabBarFloating.constants';
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

describe('TabBarFloating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('fades content out behind the bar with a transparent-to-background scrim', () => {
    const { getByTestId } = renderBar();

    const [top, bottom] = getByTestId(TAB_BAR_FLOATING_TEST_IDS.SCRIM).props
      .colors;

    // Colors arrive processed to ARGB ints, so read the alpha byte. The exact
    // bottom alpha is a design dial; only the fade direction is asserted.
    expect(top >>> 24).toBe(0);
    expect(bottom >>> 24).toBeGreaterThan(0);
  });

  it('highlights only the active tab, and follows it when the tab changes', () => {
    const highlightOf = (element: ReactTestInstance) =>
      StyleSheet.flatten(element.props.style).backgroundColor;

    const onHome = renderBar();
    const homeHighlight = highlightOf(
      onHome.getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}`),
    );
    expect(
      highlightOf(onHome.getByTestId(`tab-bar-item-${TabBarIconKey.Money}`)),
    ).not.toBe(homeHighlight);

    // Money active instead of Home: the highlight moves with it.
    const onMoney = renderBar({}, undefined, 2);
    expect(
      highlightOf(onMoney.getByTestId(`tab-bar-item-${TabBarIconKey.Money}`)),
    ).toBe(homeHighlight);
    expect(
      highlightOf(onMoney.getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}`)),
    ).not.toBe(homeHighlight);
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
