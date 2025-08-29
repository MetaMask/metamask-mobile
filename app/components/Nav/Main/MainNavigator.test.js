/* eslint-disable react/prop-types */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import configureMockStore from 'redux-mock-store';
import MainNavigator from './MainNavigator';
import { selectRewardsEnabledFlag } from '../../../selectors/featureFlagController/rewards';

// Mock the rewards selector
jest.mock('../../../selectors/featureFlagController/rewards', () => ({
  selectRewardsEnabledFlag: jest.fn(),
}));

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.0',
}));

// Mock problematic components to avoid deep Redux dependencies
jest.mock('../../Views/Wallet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockWallet() {
    return React.createElement(View, { testID: 'wallet-view' });
  };
});

jest.mock('../../Views/Browser', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockBrowser() {
    return React.createElement(View, { testID: 'browser-view' });
  };
});

jest.mock('../../Views/Settings', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockSettings() {
    return React.createElement(View, { testID: 'settings-view' });
  };
});

// Mock TabBar to render tab items with testIDs for testing
jest.mock('../../../component-library/components/Navigation/TabBar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockTabBar({ state, descriptors }) {
    if (!state || !descriptors) {
      return React.createElement(View, { testID: 'tab-bar' });
    }

    return React.createElement(
      View,
      { testID: 'tab-bar' },
      state.routes.map((route) => {
        const descriptor = descriptors[route.key];
        if (!descriptor || !descriptor.options) {
          return React.createElement(View, {
            key: route.key,
            testID: `tab-bar-item-${route.name}`,
          });
        }

        const { options } = descriptor;
        const tabBarIconKey = options.tabBarIconKey;
        const key = `tab-bar-item-${tabBarIconKey}`;
        return React.createElement(View, { key: route.key, testID: key });
      }),
    );
  };
});

const mockStore = configureMockStore([]);

describe('MainNavigator - Rewards Integration', () => {
  const createMockState = () => ({
    // Minimal state for navigation testing
    settings: { primaryCurrency: 'usd' },
    user: { isConnectionRemoved: false },
    browser: { tabs: [] },
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {},
        MultichainNetworkController: {
          isEvmSelected: true,
        },
        AccountTrackerController: {
          accountsByChainId: {},
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account-1',
            accounts: {
              'account-1': {
                id: 'account-1',
                address: '0x123',
                metadata: { name: 'Test Account' },
              },
            },
          },
        },
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    selectRewardsEnabledFlag.mockReturnValue(false);
  });

  const renderMainNavigator = () => {
    const store = mockStore(createMockState());
    return render(
      <Provider store={store}>
        <NavigationContainer>
          <MainNavigator />
        </NavigationContainer>
      </Provider>,
    );
  };

  it('should show Settings tab when rewards feature flag is off', () => {
    selectRewardsEnabledFlag.mockReturnValue(false);
    const { getByTestId, queryByTestId } = renderMainNavigator();

    // Settings tab should be visible
    expect(getByTestId('tab-bar-item-Setting')).toBeDefined();
    // Rewards tab should not be present
    expect(queryByTestId('tab-bar-item-Rewards')).toBeNull();
    // Verify other core tabs are present
    expect(getByTestId('tab-bar-item-Wallet')).toBeDefined();
    expect(getByTestId('tab-bar-item-Browser')).toBeDefined();
    expect(getByTestId('tab-bar-item-Actions')).toBeDefined();
  });

  it('should show Rewards tab when rewards feature flag is on', () => {
    selectRewardsEnabledFlag.mockReturnValue(true);
    const { getByTestId, queryByTestId } = renderMainNavigator();

    // Rewards tab should be visible
    expect(getByTestId('tab-bar-item-Rewards')).toBeDefined();
    // Settings tab should not be present
    expect(queryByTestId('tab-bar-item-Setting')).toBeNull();
    // Verify other core tabs are present
    expect(getByTestId('tab-bar-item-Wallet')).toBeDefined();
    expect(getByTestId('tab-bar-item-Browser')).toBeDefined();
    expect(getByTestId('tab-bar-item-Actions')).toBeDefined();
  });
});
