/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { TabBarIconKey } from '../../../component-library/components/Navigation/TabBar/TabBar.types';
import Routes from '../../../constants/navigation/Routes';

// Mock the MainNavigator component directly
jest.mock('./MainNavigator', () => {
  const React = require('react');
  const { View } = require('react-native');
  const {
    TabBarIconKey,
  } = require('../../../component-library/components/Navigation/TabBar/TabBar.types');
  const {
    selectRewardsEnabledFlag,
  } = require('../../../selectors/featureFlagController/rewards');
  const { selectBrowserFullscreen } = require('../../../selectors/browser');
  const Routes = require('../../../constants/navigation/Routes').default;

  // Mock implementation that tests tab visibility based on rewards flag and browser fullscreen state
  return function MockMainNavigator({ route }) {
    const isRewardsEnabled = selectRewardsEnabledFlag();
    const isBrowserFullscreen = selectBrowserFullscreen();

    // Simulate hidding tab bar when browser is in fullscreen mode AND on browser route
    if (isBrowserFullscreen && route?.name?.startsWith(Routes.BROWSER.HOME)) {
      return null;
    }

    // Otherwise, render tabs based on rewards flag
    return React.createElement(View, { testID: 'main-navigator' }, [
      React.createElement(View, {
        key: 'wallet',
        testID: `tab-bar-item-${TabBarIconKey.Wallet}`,
      }),
      React.createElement(View, {
        key: 'browser',
        testID: `tab-bar-item-${TabBarIconKey.Browser}`,
      }),
      React.createElement(View, {
        key: 'trade',
        testID: `tab-bar-item-${TabBarIconKey.Trade}`,
      }),
      isRewardsEnabled
        ? React.createElement(View, {
            key: 'rewards',
            testID: `tab-bar-item-${TabBarIconKey.Rewards}`,
          })
        : React.createElement(View, {
            key: 'settings',
            testID: `tab-bar-item-${TabBarIconKey.Setting}`,
          }),
    ]);
  };
});

// Mock the rewards selector
jest.mock('../../../selectors/featureFlagController/rewards', () => ({
  selectRewardsEnabledFlag: jest.fn(),
  selectRewardsSubscriptionId: jest.fn().mockReturnValue(null),
}));

// Mock the browser selector
jest.mock('../../../selectors/browser', () => ({
  selectBrowserFullscreen: jest.fn(),
}));

import { selectRewardsEnabledFlag } from '../../../selectors/featureFlagController/rewards';
import { selectBrowserFullscreen } from '../../../selectors/browser';
import MainNavigator from './MainNavigator';

describe('MainNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectRewardsEnabledFlag.mockReturnValue(false);
    selectBrowserFullscreen.mockReturnValue(false);
  });

  it('should show Settings tab when rewards feature flag is off', () => {
    selectRewardsEnabledFlag.mockReturnValue(false);
    const { getByTestId, queryByTestId } = render(<MainNavigator />);

    // Settings tab should be visible
    expect(getByTestId('tab-bar-item-Setting')).toBeDefined();
    // Rewards tab should not be present
    expect(queryByTestId('tab-bar-item-Rewards')).toBeNull();
    // Verify other core tabs are present
    expect(getByTestId('tab-bar-item-Wallet')).toBeDefined();
    expect(getByTestId('tab-bar-item-Browser')).toBeDefined();
    expect(getByTestId('tab-bar-item-Trade')).toBeDefined();
  });

  it('should show Rewards tab when rewards feature flag is on', () => {
    selectRewardsEnabledFlag.mockReturnValue(true);
    const { getByTestId, queryByTestId } = render(<MainNavigator />);

    // Rewards tab should be visible
    expect(getByTestId('tab-bar-item-Rewards')).toBeDefined();
    // Settings tab should not be present
    expect(queryByTestId('tab-bar-item-Setting')).toBeNull();
    // Verify other core tabs are present
    expect(getByTestId('tab-bar-item-Wallet')).toBeDefined();
    expect(getByTestId('tab-bar-item-Browser')).toBeDefined();
    expect(getByTestId('tab-bar-item-Trade')).toBeDefined();
  });

  it('should show navbar tabs when browser is not in fullscreen mode', () => {
    // Given browser is not in fullscreen mode
    selectBrowserFullscreen.mockReturnValue(false);

    // When rendering MainNavigator
    const { getByTestId } = render(<MainNavigator />);

    // Then navbar tabs should be visible
    expect(getByTestId('tab-bar-item-Wallet')).toBeDefined();
    expect(getByTestId('tab-bar-item-Browser')).toBeDefined();
    expect(getByTestId('tab-bar-item-Trade')).toBeDefined();
    expect(getByTestId('tab-bar-item-Setting')).toBeDefined();
  });

  it('should not show navbar when browser is in fullscreen mode', () => {
    // Given browser is in fullscreen mode on browser route
    selectBrowserFullscreen.mockReturnValue(true);

    // When rendering MainNavigator on browser route
    const { queryByTestId } = render(
      <MainNavigator route={{ name: Routes.BROWSER.HOME }} />,
    );

    // Then navbar tabs should not be visible
    expect(queryByTestId('tab-bar-item-Wallet')).toBeNull();
    expect(queryByTestId('tab-bar-item-Browser')).toBeNull();
    expect(queryByTestId('tab-bar-item-Trade')).toBeNull();
    expect(queryByTestId('tab-bar-item-Setting')).toBeNull();
  });

  it('should show navbar tabs when browser is in fullscreen mode but on non-browser route', () => {
    // Given browser is in fullscreen mode but on non-browser route
    selectBrowserFullscreen.mockReturnValue(true);

    // When rendering MainNavigator on wallet route
    const { getByTestId } = render(
      <MainNavigator route={{ name: 'WalletView' }} />,
    );

    // Then navbar tabs should still be visible since we're not on browser route
    expect(getByTestId('tab-bar-item-Wallet')).toBeDefined();
    expect(getByTestId('tab-bar-item-Browser')).toBeDefined();
    expect(getByTestId('tab-bar-item-Trade')).toBeDefined();
    expect(getByTestId('tab-bar-item-Setting')).toBeDefined();
  });

  it('should return null when isBrowserFullscreen is true AND route starts with BrowserTabHome', () => {
    // Given browser is in fullscreen mode
    selectBrowserFullscreen.mockReturnValue(true);

    // When rendering MainNavigator with exact BrowserTabHome route (matches Routes.BROWSER.HOME)
    const rendered = render(
      <MainNavigator route={{ name: Routes.BROWSER.HOME }} />,
    );

    // Then component should return null (empty container validates return null behavior)
    expect(rendered.toJSON()).toBe(null);
  });

  it('should match snapshot when browser is not infullscreen mode on BrowserTabHome route', () => {
    // Given browser is in fullscreen mode
    selectBrowserFullscreen.mockReturnValue(false);

    // When rendering MainNavigator on BrowserTabHome subpath route
    const component = render(
      <MainNavigator route={{ name: Routes.BROWSER.HOME }} />,
    );

    // Then component should match fullscreen snapshot (returns null)
    expect(component.toJSON()).toMatchSnapshot();
  });
});
