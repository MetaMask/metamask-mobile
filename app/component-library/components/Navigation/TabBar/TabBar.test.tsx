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
import { selectAssetsTrendingTokensEnabled } from '../../../../selectors/featureFlagController/assetsTrendingTokens';

// Minimal descriptor interface for tests - only includes what TabBar component uses
interface TestTabDescriptor {
  options: {
    tabBarIconKey: TabBarIconKey;
    rootScreenName: string;
    callback?: () => void;
  };
}

interface TestDescriptors {
  [key: string]: TestTabDescriptor;
}

// Mock trending tokens feature flag selector
jest.mock('../../../../selectors/featureFlagController/assetsTrendingTokens');

// Mock the navigation object with proper typing
const navigation: NavigationHelpers<ParamListBase> = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  dangerouslyGetParent: jest.fn(),
  dangerouslyGetState: jest.fn(),
  emit: jest.fn(),
};

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
    expect(toJSON()).toMatchSnapshot();
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
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
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
    jest.mocked(selectAssetsTrendingTokensEnabled).mockReturnValue(true);

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

  it('does not navigate to trending when trending feature flag is disabled', () => {
    jest.mocked(selectAssetsTrendingTokensEnabled).mockReturnValue(false);

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
    expect(navigation.navigate).not.toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });
});
