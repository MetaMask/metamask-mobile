// Third party dependencies.
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';

// External dependencies
import renderWithProvider from '../../../../util/test/renderWithProvider';

// Internal dependencies
import TabBar from './TabBar';
import { TabBarIconKey } from './TabBar.types';
import Routes from '../../../../constants/navigation/Routes';

// Mock the navigation object.
const navigation = {
  navigate: jest.fn(),
};

const initialState = {
  wizard: {
    step: 1,
  },
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: {
          type: 'mainnet',
          nickname: 'Ethereum mainnet',
          ticket: 'eth',
          chainId: '1',
        },
      },
    },
  },
};

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(initialState)),
}));

// Define the test cases.
describe('TabBar', () => {
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
        tabBarIconKey: TabBarIconKey.Activity,
        rootScreenName: Routes.TRANSACTIONS_VIEW,
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
        tabBarIconKey: TabBarIconKey.Browser,
        rootScreenName: Routes.BROWSER_VIEW,
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
        descriptors={descriptors as any}
        navigation={navigation as any}
      />,
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to the correct screen when a tab is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TabBar
        state={state as TabNavigationState<ParamListBase>}
        descriptors={descriptors as any}
        navigation={navigation as any}
      />,
      { state: initialState },
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
});
