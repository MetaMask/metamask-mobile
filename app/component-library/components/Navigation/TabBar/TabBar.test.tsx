// Third party dependencies.
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';

// External dependencies
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';

// Internal dependencies
import TabBar from './TabBar';
import { TabBarIconKey } from './TabBar.types';
import Routes from '../../../../constants/navigation/Routes';

// Mock the navigation object.
const navigation = {
  navigate: jest.fn(),
};

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          rewards: true,
        },
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
  const descriptors = {
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
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        descriptors={descriptors as any}
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigation={navigation as any}
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to the correct screen when a tab is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TabBar
        state={state as TabNavigationState<ParamListBase>}
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        descriptors={descriptors as any}
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigation={navigation as any}
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
      screen: 'Settings',
    });
  });

  it('navigates to rewards when rewards tab is pressed', () => {
    const rewardsState = {
      index: 0,
      routes: [{ key: '1', name: 'Tab 1' }],
    };
    const rewardsDescriptors = {
      '1': {
        options: {
          tabBarIconKey: TabBarIconKey.Rewards,
          rootScreenName: Routes.REWARDS_VIEW,
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <TabBar
        state={rewardsState as TabNavigationState<ParamListBase>}
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        descriptors={rewardsDescriptors as any}
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigation={navigation as any}
      />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Rewards}`));
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
  });
});
