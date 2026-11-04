import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { TabBarIconKey } from '../../../../component-library/components/Navigation/TabBar/TabBar.types';
import { TAB_BAR_FLOATING_TEST_IDS } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import ContextualHomeFooter from './ContextualHomeFooter';
import ContextualHomeSectionOverlay from './ContextualHomeSectionOverlay';
import ContextualMoneyTabBar from './ContextualMoneyTabBar';
import ContextualNativeHomeChrome from './ContextualNativeHomeChrome';
import {
  enterMoneySection,
  exitContextualSection,
  getContextualNavState,
  setContextualTab,
} from './contextualSection';

jest.mock('../../../../util/haptics');
jest.mock('../../../UI/Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: () => ({ navigateToMoneyHome: jest.fn() }),
}));
jest.mock('../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: () => false,
}));
jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { navigate: jest.fn() } },
}));

const homeFooter = (navigate = jest.fn()) => (
  <ContextualHomeFooter
    state={{
      stale: false,
      type: 'tab',
      key: 'tab-home',
      index: 0,
      routeNames: [
        Routes.WALLET.HOME,
        Routes.TRENDING_VIEW,
        Routes.TRADE_DASHBOARD,
        Routes.MONEY.ROOT,
        Routes.SOCIAL.TAB,
      ],
      routes: [
        { key: 'home', name: Routes.WALLET.HOME },
        { key: 'explore', name: Routes.TRENDING_VIEW },
        { key: 'trade', name: Routes.TRADE_DASHBOARD },
        { key: 'money', name: Routes.MONEY.ROOT },
        { key: 'social', name: Routes.SOCIAL.TAB },
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
        },
      },
      trade: {
        options: {
          tabBarIconKey: TabBarIconKey.Actions,
          rootScreenName: Routes.TRADE_DASHBOARD,
        },
      },
      money: {
        options: {
          tabBarIconKey: TabBarIconKey.Money,
          rootScreenName: Routes.MONEY.HOME,
          callback: () => enterMoneySection(),
        },
      },
      social: {
        options: {
          tabBarIconKey: TabBarIconKey.Social,
          rootScreenName: Routes.SOCIAL.TAB,
        },
      },
    }}
    navigation={{ navigate }}
  />
);

describe('contextual home and Money footers', () => {
  const onHomePress = jest.fn();

  afterEach(() => {
    act(() => {
      exitContextualSection();
    });
    onHomePress.mockClear();
  });

  it('selects Card and marks it selected', () => {
    enterMoneySection();

    const { getByTestId } = renderWithProvider(
      <ContextualMoneyTabBar onHomePress={onHomePress} />,
    );

    fireEvent.press(getByTestId('contextual-money-tab-card'));

    expect(getContextualNavState()).toEqual({
      section: 'money',
      tab: 'card',
    });
    expect(
      getByTestId('contextual-money-tab-card').props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      getByTestId('contextual-money-tab-account').props.accessibilityState,
    ).toEqual({ selected: false });
    expect(
      getByTestId('contextual-money-tab-home').props.accessibilityState,
    ).toEqual({ selected: false });
    expect(
      getByTestId('contextual-money-tab-card').props.accessibilityLabel,
    ).toBe('Card');
  });

  it('returns to the default footer from the Money Home tab', () => {
    enterMoneySection();

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ContextualMoneyTabBar onHomePress={onHomePress} />,
    );
    const homeTab = getByTestId('contextual-money-tab-home');

    expect(queryByTestId('contextual-money-home-button')).toBeNull();
    expect(homeTab.props.accessibilityLabel).toBe(strings('bottom_nav.home'));
    expect(homeTab.props.accessibilityState).toEqual({ selected: false });

    fireEvent.press(homeTab);

    expect(onHomePress).toHaveBeenCalledTimes(1);
  });

  it('shows a Card placeholder with a header', () => {
    enterMoneySection();
    setContextualTab('card');

    const { getByTestId, getByRole } = renderWithProvider(
      <ContextualHomeSectionOverlay />,
    );

    expect(getByTestId('contextual-section-placeholder')).toBeOnTheScreen();
    expect(getByRole('header')).toHaveTextContent('Card');
  });

  it('leaves the Money account screen uncovered', () => {
    enterMoneySection();

    const { queryByTestId } = renderWithProvider(
      <ContextualHomeSectionOverlay />,
    );

    expect(queryByTestId('contextual-section-placeholder')).toBeNull();
  });

  it('keeps Trending on the default footer and opens the trade set with nothing selected', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(homeFooter());

    expect(getByTestId('footer-tab-trending')).toBeOnTheScreen();
    expect(queryByTestId('trade-hub-tab-swap')).toBeNull();
    expect(queryByTestId(TAB_BAR_FLOATING_TEST_IDS.SEARCH_BUTTON)).toBeNull();

    fireEvent.press(getByTestId('footer-tab-trade'));

    expect(getContextualNavState()).toEqual({
      section: 'trading',
      tab: 'dashboard',
    });
    expect(getByTestId('trade-hub-tab-swap')).toBeOnTheScreen();
    expect(getByTestId('trade-hub-tab-collectibles')).toBeOnTheScreen();
    expect(getByTestId('trade-hub-tab-swap').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(getByTestId('trade-hub-tab-home').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(getByTestId('trade-hub-tab-perps').props.accessibilityState).toEqual(
      { selected: false },
    );
  });

  it('swaps the home pill when Money is pressed, before the tab route changes', () => {
    const { getByTestId, getByText, queryByTestId } =
      renderWithProvider(homeFooter());

    fireEvent.press(getByTestId('footer-tab-money'));

    expect(getContextualNavState().section).toBe('money');
    expect(getByTestId('contextual-money-tab-home')).toBeOnTheScreen();
    expect(getByTestId('contextual-money-tab-account')).toBeOnTheScreen();
    expect(getByTestId('contextual-money-tab-card')).toBeOnTheScreen();
    expect(getByTestId('contextual-money-tab-earn')).toBeOnTheScreen();
    expect(queryByTestId('contextual-money-home-button')).toBeNull();
  });

  it('draws the Money pill over the native tab bar after that section is entered', () => {
    const { getByTestId } = renderWithProvider(
      <ContextualNativeHomeChrome />,
    );

    expect(getByTestId('contextual-footer')).toBeOnTheScreen();
    expect(getByTestId('footer-tab-home')).toBeOnTheScreen();

    act(() => {
      enterMoneySection();
    });

    expect(getByTestId('contextual-money-tab-account')).toBeOnTheScreen();
    expect(
      getByTestId('contextual-money-tab-account').props.accessibilityState,
    ).toEqual({ selected: true });

    fireEvent.press(getByTestId('contextual-money-tab-home'));

    expect(getContextualNavState().section).toBeNull();
    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.HOME_TABS,
      {
        screen: Routes.WALLET.HOME,
        params: { screen: Routes.WALLET_VIEW },
      },
    );
  });

  it('covers the native Money screen with an Earn placeholder', () => {
    enterMoneySection();

    const { getByRole, getByTestId } = renderWithProvider(
      <ContextualNativeHomeChrome />,
    );

    fireEvent.press(getByTestId('contextual-money-tab-earn'));

    expect(getContextualNavState().tab).toBe('earn');
    expect(getByRole('header')).toHaveTextContent('Earn');
  });
});
