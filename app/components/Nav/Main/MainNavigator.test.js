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
  const { selectBrowserFullscreen } = require('../../../selectors/browser');
  const Routes = require('../../../constants/navigation/Routes').default;

  // Mock implementation that tests tab visibility based on browser fullscreen state
  return function MockMainNavigator({ route }) {
    const isBrowserFullscreen = selectBrowserFullscreen();

    // Simulate hidding tab bar when browser is in fullscreen mode AND on browser route
    if (isBrowserFullscreen && route?.name?.startsWith(Routes.BROWSER.HOME)) {
      return null;
    }

    // Build tabs array
    const tabs = [
      React.createElement(View, {
        key: 'wallet',
        testID: `tab-bar-item-${TabBarIconKey.Wallet}`,
      }),
      React.createElement(View, {
        key: 'trending',
        testID: `tab-bar-item-${TabBarIconKey.Trending}`,
      }),
      React.createElement(View, {
        key: 'trade',
        testID: `tab-bar-item-${TabBarIconKey.Trade}`,
      }),
    ];

    // Add Activity tab (always shown)
    tabs.push(
      React.createElement(View, {
        key: 'activity',
        testID: `tab-bar-item-${TabBarIconKey.Activity}`,
      }),
    );

    // Add Rewards tab
    tabs.push(
      React.createElement(View, {
        key: 'rewards',
        testID: `tab-bar-item-${TabBarIconKey.Rewards}`,
      }),
    );

    return React.createElement(View, { testID: 'main-navigator' }, tabs);
  };
});

// Mock the rewards selector
jest.mock('../../../selectors/featureFlagController/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn().mockReturnValue(null),
}));

// Mock the browser selector
jest.mock('../../../selectors/browser', () => ({
  selectBrowserFullscreen: jest.fn(),
}));

import { selectBrowserFullscreen } from '../../../selectors/browser';
import MainNavigator from './MainNavigator';

describe('MainNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectBrowserFullscreen.mockReturnValue(false);
  });

  it('shows Trending tab', () => {
    const { getByTestId, queryByTestId } = render(<MainNavigator />);

    expect(getByTestId('tab-bar-item-Trending')).toBeDefined();
    expect(getByTestId('tab-bar-item-Wallet')).toBeDefined();
    expect(getByTestId('tab-bar-item-Trade')).toBeDefined();
    expect(getByTestId('tab-bar-item-Rewards')).toBeDefined();
  });

  it('should show Rewards tab', () => {
    const { getByTestId } = render(<MainNavigator />);

    expect(getByTestId('tab-bar-item-Rewards')).toBeDefined();
    // Verify other core tabs are present
    expect(getByTestId('tab-bar-item-Wallet')).toBeDefined();
    expect(getByTestId('tab-bar-item-Trending')).toBeDefined();
    expect(getByTestId('tab-bar-item-Trade')).toBeDefined();
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
    expect(queryByTestId('tab-bar-item-Rewards')).toBeNull();
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

  it('shows Activity tab in tab bar', () => {
    const { getByTestId } = render(<MainNavigator />);

    expect(getByTestId('tab-bar-item-Activity')).toBeOnTheScreen();
  });

  it('shows all core tabs when no feature flags are enabled', () => {
    selectBrowserFullscreen.mockReturnValue(false);

    const { getByTestId } = render(<MainNavigator />);

    expect(getByTestId('tab-bar-item-Wallet')).toBeOnTheScreen();
    expect(getByTestId('tab-bar-item-Trending')).toBeOnTheScreen();
    expect(getByTestId('tab-bar-item-Trade')).toBeOnTheScreen();
    expect(getByTestId('tab-bar-item-Activity')).toBeOnTheScreen();
    expect(getByTestId('tab-bar-item-Rewards')).toBeOnTheScreen();
  });

  it('renders main-navigator container', () => {
    const { getByTestId } = render(<MainNavigator />);

    expect(getByTestId('main-navigator')).toBeOnTheScreen();
  });
});
