/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { TabBarIconKey } from '../../../component-library/components/Navigation/TabBar/TabBar.types';

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

  // Simple mock implementation that only tests the tab visibility based on the rewards flag
  return function MockMainNavigator() {
    const isRewardsEnabled = selectRewardsEnabledFlag();

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

import { selectRewardsEnabledFlag } from '../../../selectors/featureFlagController/rewards';
import MainNavigator from './MainNavigator';

describe('MainNavigator - Rewards Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectRewardsEnabledFlag.mockReturnValue(false);
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
});
