import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import {
  ParamListBase,
  TabNavigationState,
  NavigationHelpers,
} from '@react-navigation/native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import TabBarFloating from './TabBarFloating';
import { HIGHLIGHT_NAVIGATE_FALLBACK_MS } from './TabBarFloating.constants';
import {
  TabBarIconKey,
  ExtendedBottomTabDescriptor,
} from '../TabBar/TabBar.types';

// The sequencing toggle is a build-time constant, so this file flips it on
// for every test here and leaves the main suite on the default.
jest.mock('./TabBarFloating.constants', () => ({
  ...jest.requireActual('./TabBarFloating.constants'),
  HIGHLIGHT_NAVIGATE_AFTER_SLIDE: true,
}));

jest.mock('../../../../components/Views/TrendingView/search/analytics', () => ({
  trackExploreSearchOpened: jest.fn(),
}));

jest.mock('../../../../components/UI/Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: () => ({ navigateToMoneyHome: jest.fn() }),
}));

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  emit: jest.fn(),
} as unknown as NavigationHelpers<ParamListBase>;

const state = {
  index: 0,
  routeNames: ['Home', 'Explore'],
  routes: [
    { key: '1', name: 'Home' },
    { key: '2', name: 'Explore' },
  ],
} as TabNavigationState<ParamListBase>;

const descriptors = {
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
} as unknown as Record<string, ExtendedBottomTabDescriptor>;

const SLOT_WIDTH = 80;

const renderBar = () =>
  renderWithProvider(
    <TabBarFloating
      state={state}
      descriptors={descriptors}
      navigation={navigation}
    />,
    { state: { engine: { backgroundState } } },
  );

const layoutSlots = (
  getByTestId: ReturnType<typeof renderBar>['getByTestId'],
) => {
  [TabBarIconKey.Wallet, TabBarIconKey.Trending].forEach((key, slot) => {
    fireEvent(getByTestId(`tab-bar-item-${key}`), 'layout', {
      nativeEvent: {
        layout: { x: slot * SLOT_WIDTH, y: 0, width: SLOT_WIDTH, height: 48 },
      },
    });
  });
};

const advance = (ms: number) => act(() => jest.advanceTimersByTime(ms));

describe('TabBarFloating with navigation sequenced after the slide', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterAll(() => jest.useRealTimers());

  it('holds navigation on press and fires it when the bubble lands', () => {
    const { getByTestId } = renderBar();
    layoutSlots(getByTestId);
    advance(2000);

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Trending}`));

    expect(navigation.navigate).not.toHaveBeenCalled();

    // Landing has to arrive before the fallback would, or the fallback is
    // doing the work and the springs have drifted slower than it.
    advance(HIGHLIGHT_NAVIGATE_FALLBACK_MS - 50);

    expect(navigation.navigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });

  // Before layout there is no slot to slide to, so no landing ever happens.
  it('falls back to a timer when no landing can be detected', () => {
    const { getByTestId } = renderBar();

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Trending}`));
    advance(HIGHLIGHT_NAVIGATE_FALLBACK_MS - 50);

    expect(navigation.navigate).not.toHaveBeenCalled();

    advance(50);

    expect(navigation.navigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });

  it('navigates once per press, never twice', () => {
    const { getByTestId } = renderBar();
    layoutSlots(getByTestId);
    advance(2000);

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Trending}`));
    advance(HIGHLIGHT_NAVIGATE_FALLBACK_MS + 500);

    expect(navigation.navigate).toHaveBeenCalledTimes(1);
  });
});
