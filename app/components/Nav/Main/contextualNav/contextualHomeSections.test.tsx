import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { TabBarIconKey } from '../../../../component-library/components/Navigation/TabBar/TabBar.types';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import ContextualExploreTabBar from './ContextualExploreTabBar';
import ContextualHomeFooter from './ContextualHomeFooter';
import ContextualHomeSectionOverlay from './ContextualHomeSectionOverlay';
import ContextualMoneyTabBar from './ContextualMoneyTabBar';
import ContextualNativeHomeChrome from './ContextualNativeHomeChrome';
import {
  enterExploreSection,
  enterMoneySection,
  exitContextualSection,
  getContextualNavState,
  setContextualTab,
} from './contextualSection';

jest.mock('../../../../util/haptics');
jest.mock('../../../../components/Views/TrendingView/search/analytics', () => ({
  trackExploreSearchOpened: jest.fn(),
}));
jest.mock('../../../../components/UI/Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: () => ({ navigateToMoneyHome: jest.fn() }),
}));
jest.mock(
  '../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation',
  () => ({
    navigateToSocialTab: jest.fn(),
  }),
);
jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { navigate: jest.fn() } },
}));

describe('contextual Money and Explore footers', () => {
  const onHomePress = jest.fn();

  afterEach(() => {
    act(() => {
      exitContextualSection();
    });
    onHomePress.mockClear();
  });

  it('selects Payments and marks it selected', () => {
    enterMoneySection();

    const { getByTestId } = renderWithProvider(
      <ContextualMoneyTabBar onHomePress={onHomePress} />,
    );

    fireEvent.press(getByTestId('contextual-money-tab-payments'));

    expect(getContextualNavState()).toEqual({
      section: 'money',
      tab: 'payments',
    });
    expect(
      getByTestId('contextual-money-tab-payments').props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      getByTestId('contextual-money-tab-account').props.accessibilityState,
    ).toEqual({ selected: false });
    expect(
      getByTestId('contextual-money-tab-payments').props.accessibilityLabel,
    ).toBe('Payments');
  });

  it('returns to the wallet footer from the Money Home circle', () => {
    enterMoneySection();

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ContextualMoneyTabBar onHomePress={onHomePress} />,
    );
    const homeButton = getByTestId('contextual-money-home-button');

    expect(queryByTestId('contextual-money-search-button')).toBeNull();
    expect(homeButton.props.accessibilityLabel).toBe(
      strings('bottom_nav.home'),
    );
    expect(homeButton.props.accessibilityState).toEqual({ selected: false });
    expect(homeButton.props.hitSlop).toEqual({
      top: 4,
      bottom: 4,
      left: 4,
      right: 4,
    });

    fireEvent.press(homeButton);

    expect(onHomePress).toHaveBeenCalledTimes(1);
    expect(getContextualNavState().tab).toBe('account');
  });

  it('selects Browser in the Explore pill', () => {
    enterExploreSection();

    const { getByTestId } = renderWithProvider(
      <ContextualExploreTabBar onHomePress={onHomePress} />,
    );

    fireEvent.press(getByTestId('contextual-explore-tab-browser'));

    expect(getContextualNavState()).toEqual({
      section: 'explore',
      tab: 'browser',
    });
    expect(
      getByTestId('contextual-explore-tab-browser').props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      getByTestId('contextual-explore-home-button').props.accessibilityState,
    ).toEqual({ selected: false });
  });

  it('keeps Search as an Explore tab', () => {
    enterExploreSection();

    const { getByRole, getByTestId } = renderWithProvider(
      <>
        <ContextualExploreTabBar onHomePress={onHomePress} />
        <ContextualHomeSectionOverlay />
      </>,
    );

    fireEvent.press(getByTestId('contextual-explore-tab-search'));

    expect(getContextualNavState()).toEqual({
      section: 'explore',
      tab: 'search',
    });
    expect(
      getByTestId('contextual-explore-tab-search').props.accessibilityState,
    ).toEqual({ selected: true });
    expect(getByRole('header')).toHaveTextContent('Search');
  });

  it('shows a Payments placeholder with a header', () => {
    enterMoneySection();
    setContextualTab('payments');

    const { getByTestId, getByRole } = renderWithProvider(
      <ContextualHomeSectionOverlay />,
    );

    expect(getByTestId('contextual-section-placeholder')).toBeOnTheScreen();
    expect(getByRole('header')).toHaveTextContent('Payments');
  });

  it('leaves the Explore feed uncovered', () => {
    enterExploreSection();

    const { queryByTestId } = renderWithProvider(
      <ContextualHomeSectionOverlay />,
    );

    expect(queryByTestId('contextual-section-placeholder')).toBeNull();
  });

  it('swaps the home pill when Explore is pressed, before the tab route changes', () => {
    const navigate = jest.fn();
    const { getByTestId, getByText } = renderWithProvider(
      <ContextualHomeFooter
        state={{
          stale: false,
          type: 'tab',
          key: 'tab-home',
          index: 0,
          routeNames: [
            Routes.WALLET.HOME,
            Routes.TRENDING_VIEW,
            Routes.MONEY.ROOT,
          ],
          routes: [
            { key: 'home', name: Routes.WALLET.HOME },
            { key: 'explore', name: Routes.TRENDING_VIEW },
            { key: 'money', name: Routes.MONEY.ROOT },
          ],
          history: [],
          preloadedRouteKeys: [],
        }}
        descriptors={{
          home: {
            options: {
              tabBarIconKey: TabBarIconKey.Wallet,
              rootScreenName: Routes.WALLET_VIEW,
            },
          },
          explore: {
            options: {
              tabBarIconKey: TabBarIconKey.Trending,
              rootScreenName: Routes.TRENDING_VIEW,
              callback: () => enterExploreSection(),
            },
          },
          money: {
            options: {
              tabBarIconKey: TabBarIconKey.Money,
              rootScreenName: Routes.MONEY.HOME,
              callback: () => enterMoneySection(),
            },
          },
        }}
        navigation={{ navigate }}
        trailingAction="search"
      />,
    );

    fireEvent.press(getByText(strings('bottom_nav.trending')));

    expect(getContextualNavState().section).toBe('explore');
    expect(getByTestId('contextual-explore-tab-news')).toBeOnTheScreen();
    expect(getByTestId('contextual-explore-home-button')).toBeOnTheScreen();
    expect(navigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });

  it('swaps the home pill when Money is pressed, before the tab route changes', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <ContextualHomeFooter
        state={{
          stale: false,
          type: 'tab',
          key: 'tab-home',
          index: 0,
          routeNames: [
            Routes.WALLET.HOME,
            Routes.TRENDING_VIEW,
            Routes.MONEY.ROOT,
          ],
          routes: [
            { key: 'home', name: Routes.WALLET.HOME },
            { key: 'explore', name: Routes.TRENDING_VIEW },
            { key: 'money', name: Routes.MONEY.ROOT },
          ],
          history: [],
          preloadedRouteKeys: [],
        }}
        descriptors={{
          home: {
            options: {
              tabBarIconKey: TabBarIconKey.Wallet,
              rootScreenName: Routes.WALLET_VIEW,
            },
          },
          explore: {
            options: {
              tabBarIconKey: TabBarIconKey.Trending,
              rootScreenName: Routes.TRENDING_VIEW,
              callback: () => enterExploreSection(),
            },
          },
          money: {
            options: {
              tabBarIconKey: TabBarIconKey.Money,
              rootScreenName: Routes.MONEY.HOME,
              callback: () => enterMoneySection(),
            },
          },
        }}
        navigation={{ navigate: jest.fn() }}
        trailingAction="search"
      />,
    );

    fireEvent.press(getByText(strings('bottom_nav.money')));

    expect(getContextualNavState().section).toBe('money');
    expect(getByTestId('contextual-money-tab-account')).toBeOnTheScreen();
    expect(getByTestId('contextual-money-tab-payments')).toBeOnTheScreen();
    expect(getByTestId('contextual-money-home-button')).toBeOnTheScreen();
  });

  it('draws the Explore pill over the native tab bar once that tab is pressed', () => {
    enterExploreSection();

    const { getByTestId } = renderWithProvider(<ContextualNativeHomeChrome />);

    expect(getByTestId('contextual-native-home-chrome')).toBeOnTheScreen();
    expect(getByTestId('contextual-explore-tab-browser')).toBeOnTheScreen();
    expect(getByTestId('contextual-explore-tab-search')).toBeOnTheScreen();
    expect(getByTestId('contextual-explore-home-button')).toBeOnTheScreen();

    fireEvent.press(getByTestId('contextual-explore-home-button'));

    expect(getContextualNavState().section).toBeNull();
    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.HOME_TABS,
      {
        screen: Routes.WALLET.HOME,
        params: { screen: Routes.WALLET_VIEW },
      },
    );
  });
});
