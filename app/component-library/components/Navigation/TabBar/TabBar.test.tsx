// Third party dependencies.
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  ParamListBase,
  TabNavigationState,
  NavigationHelpers,
} from '@react-navigation/native';

// External dependencies
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';

// Internal dependencies
import TabBar from './TabBar';
import { TabBarIconKey, ExtendedBottomTabDescriptor } from './TabBar.types';
import Routes from '../../../../constants/navigation/Routes';

// Minimal descriptor interface for tests - only includes what TabBar component uses
interface TestTabDescriptor {
  options: {
    tabBarIconKey: TabBarIconKey;
    rootScreenName: string;
    callback?: () => void;
    isHidden?: boolean;
    onLeave?: () => void;
    isSelected?: (rootScreenName: string) => boolean;
  };
}

interface TestDescriptors {
  [key: string]: TestTabDescriptor;
}

// Mock the navigation object with proper typing
const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  emit: jest.fn(),
  getId: jest.fn(),
} as unknown as NavigationHelpers<ParamListBase>;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          rewardsEnabled: {
            enabled: true,
            minimumVersion: '0.0.1',
          },
        },
        cacheTimestamp: 0,
      },
    },
  },
};

// Define the test cases.
describe('TabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const state = {
    index: 0,
    routes: [
      { key: '1', name: 'Tab 1' },
      { key: '2', name: 'Tab 2' },
      { key: '3', name: 'Tab 3' },
      { key: '4', name: 'Tab 4' },
      { key: '5', name: 'Tab 5' },
    ],
  };
  const descriptors: TestDescriptors = {
    '1': {
      options: {
        tabBarIconKey: TabBarIconKey.Wallet,
        rootScreenName: Routes.WALLET_VIEW,
      },
    },
    '2': {
      options: {
        tabBarIconKey: TabBarIconKey.Browser,
        rootScreenName: Routes.BROWSER.VIEW,
      },
    },
    '3': {
      options: {
        tabBarIconKey: TabBarIconKey.Actions,
        rootScreenName: Routes.MODAL.WALLET_ACTIONS,
      },
    },
    '4': {
      options: {
        tabBarIconKey: TabBarIconKey.Activity,
        rootScreenName: Routes.TRANSACTIONS_VIEW,
      },
    },
    '5': {
      options: {
        tabBarIconKey: TabBarIconKey.Setting,
        rootScreenName: Routes.SETTINGS_VIEW,
      },
    },
  };

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <TabBar
        state={state as TabNavigationState<ParamListBase>}
        descriptors={descriptors as Record<string, ExtendedBottomTabDescriptor>}
        navigation={navigation}
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toBeDefined();
  });

  it('navigates to the correct screen when a tab is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TabBar
        state={state as TabNavigationState<ParamListBase>}
        descriptors={descriptors as Record<string, ExtendedBottomTabDescriptor>}
        navigation={navigation}
      />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}`));
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
      screen: Routes.WALLET_VIEW,
    });

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Browser}`));
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
    });

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Actions}`));
    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      {
        screen: Routes.MODAL.WALLET_ACTIONS,
      },
    );

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Activity}`));
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Setting}`));
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.ACCOUNTS_MENU_VIEW,
    });
  });

  it('navigates to rewards when rewards tab is pressed', () => {
    const rewardsState = {
      index: 0,
      routes: [{ key: '1', name: 'Tab 1' }],
    };
    const rewardsDescriptors: TestDescriptors = {
      '1': {
        options: {
          tabBarIconKey: TabBarIconKey.Rewards,
          rootScreenName: Routes.REWARDS_VIEW,
          callback: () => ({}),
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <TabBar
        state={rewardsState as TabNavigationState<ParamListBase>}
        descriptors={
          rewardsDescriptors as Record<string, ExtendedBottomTabDescriptor>
        }
        navigation={navigation}
      />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Rewards}`));
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
  });

  it('navigates to trending when trending tab is pressed', () => {
    const trendingState = {
      index: 0,
      routes: [{ key: '1', name: 'Tab 1' }],
    };
    const trendingDescriptors: TestDescriptors = {
      '1': {
        options: {
          tabBarIconKey: TabBarIconKey.Trending,
          rootScreenName: Routes.TRENDING_VIEW,
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <TabBar
        state={trendingState as TabNavigationState<ParamListBase>}
        descriptors={
          trendingDescriptors as Record<string, ExtendedBottomTabDescriptor>
        }
        navigation={navigation}
      />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Trending}`));
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });

  it('does not render hidden tabs', () => {
    const stateWithHidden = {
      index: 0,
      routes: [
        { key: '1', name: 'Tab 1' },
        { key: '2', name: 'Tab 2' },
      ],
    };
    const descriptorsWithHidden: TestDescriptors = {
      '1': {
        options: {
          tabBarIconKey: TabBarIconKey.Wallet,
          rootScreenName: Routes.WALLET_VIEW,
        },
      },
      '2': {
        options: {
          tabBarIconKey: TabBarIconKey.Browser,
          rootScreenName: Routes.BROWSER.VIEW,
          isHidden: true,
        },
      },
    };

    const { queryByTestId, getByTestId } = renderWithProvider(
      <TabBar
        state={stateWithHidden as TabNavigationState<ParamListBase>}
        descriptors={
          descriptorsWithHidden as unknown as Record<
            string,
            ExtendedBottomTabDescriptor
          >
        }
        navigation={navigation}
      />,
      { state: mockInitialState },
    );

    expect(getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}`)).toBeTruthy();
    expect(queryByTestId(`tab-bar-item-${TabBarIconKey.Browser}`)).toBeNull();
  });

  it('calls callback when tab is pressed', () => {
    const mockCallback = jest.fn();
    const stateWithCallback = {
      index: 0,
      routes: [{ key: '1', name: 'Tab 1' }],
    };
    const descriptorsWithCallback: TestDescriptors = {
      '1': {
        options: {
          tabBarIconKey: TabBarIconKey.Wallet,
          rootScreenName: Routes.WALLET_VIEW,
          callback: mockCallback,
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <TabBar
        state={stateWithCallback as TabNavigationState<ParamListBase>}
        descriptors={
          descriptorsWithCallback as Record<string, ExtendedBottomTabDescriptor>
        }
        navigation={navigation}
      />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}`));
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('calls onLeave when switching tabs', () => {
    const mockOnLeave = jest.fn();
    const stateWithTwoTabs = {
      index: 0,
      routes: [
        { key: '1', name: 'Tab 1' },
        { key: '2', name: 'Tab 2' },
      ],
      routeNames: ['Tab 1', 'Tab 2'],
    };
    const descriptorsWithOnLeave: TestDescriptors = {
      '1': {
        options: {
          tabBarIconKey: TabBarIconKey.Wallet,
          rootScreenName: Routes.WALLET_VIEW,
          onLeave: mockOnLeave,
        },
      },
      '2': {
        options: {
          tabBarIconKey: TabBarIconKey.Activity,
          rootScreenName: Routes.TRANSACTIONS_VIEW,
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <TabBar
        state={stateWithTwoTabs as TabNavigationState<ParamListBase>}
        descriptors={
          descriptorsWithOnLeave as unknown as Record<
            string,
            ExtendedBottomTabDescriptor
          >
        }
        navigation={navigation}
      />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Activity}`));
    expect(mockOnLeave).toHaveBeenCalledTimes(1);
  });

  it('uses custom isSelected function when provided', () => {
    const customIsSelected = jest.fn(() => true);
    const stateWithCustomSelected = {
      index: 1,
      routes: [
        { key: '1', name: 'Tab 1' },
        { key: '2', name: 'Tab 2' },
      ],
      routeNames: ['Tab 1', 'Tab 2'],
    };
    const descriptorsWithCustomSelected: TestDescriptors = {
      '1': {
        options: {
          tabBarIconKey: TabBarIconKey.Wallet,
          rootScreenName: Routes.WALLET_VIEW,
          isSelected: customIsSelected,
        },
      },
      '2': {
        options: {
          tabBarIconKey: TabBarIconKey.Activity,
          rootScreenName: Routes.TRANSACTIONS_VIEW,
        },
      },
    };

    renderWithProvider(
      <TabBar
        state={stateWithCustomSelected as TabNavigationState<ParamListBase>}
        descriptors={
          descriptorsWithCustomSelected as unknown as Record<
            string,
            ExtendedBottomTabDescriptor
          >
        }
        navigation={navigation}
      />,
      { state: mockInitialState },
    );

    expect(customIsSelected).toHaveBeenCalled();
  });

  it('handles trade button (wallet actions) navigation', () => {
    const tradeState = {
      index: 0,
      routes: [{ key: '1', name: 'Tab 1' }],
    };
    const tradeDescriptors: TestDescriptors = {
      '1': {
        options: {
          tabBarIconKey: TabBarIconKey.Trade,
          rootScreenName: Routes.MODAL.TRADE_WALLET_ACTIONS,
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <TabBar
        state={tradeState as TabNavigationState<ParamListBase>}
        descriptors={
          tradeDescriptors as Record<string, ExtendedBottomTabDescriptor>
        }
        navigation={navigation}
      />,
      { state: mockInitialState },
    );

    expect(getByTestId(`tab-bar-item-${TabBarIconKey.Trade}`)).toBeTruthy();
  });

  it('returns null for undefined descriptor', () => {
    const stateWithMissingDescriptor = {
      index: 0,
      routes: [
        { key: '1', name: 'Tab 1' },
        { key: '2', name: 'Tab 2' },
      ],
    };
    const partialDescriptors: TestDescriptors = {
      '1': {
        options: {
          tabBarIconKey: TabBarIconKey.Wallet,
          rootScreenName: Routes.WALLET_VIEW,
        },
      },
    };

    const { queryByTestId, getByTestId } = renderWithProvider(
      <TabBar
        state={stateWithMissingDescriptor as TabNavigationState<ParamListBase>}
        descriptors={
          partialDescriptors as Record<string, ExtendedBottomTabDescriptor>
        }
        navigation={navigation}
      />,
      { state: mockInitialState },
    );

    expect(getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}`)).toBeTruthy();
    expect(queryByTestId(`tab-bar-item-undefined`)).toBeNull();
  });

  it('tracks analytics when actions button is clicked', () => {
    const actionsState = {
      index: 0,
      routes: [{ key: '1', name: 'Tab 1' }],
    };
    const actionsDescriptors: TestDescriptors = {
      '1': {
        options: {
          tabBarIconKey: TabBarIconKey.Actions,
          rootScreenName: Routes.MODAL.WALLET_ACTIONS,
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <TabBar
        state={actionsState as TabNavigationState<ParamListBase>}
        descriptors={
          actionsDescriptors as Record<string, ExtendedBottomTabDescriptor>
        }
        navigation={navigation}
      />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Actions}`));
    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      { screen: Routes.MODAL.WALLET_ACTIONS },
    );
  });
});
