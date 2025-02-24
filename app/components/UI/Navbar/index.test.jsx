/* eslint-disable react/prop-types */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../util/test/renderWithProvider';
import {
  getNetworkNavbarOptions,
  getTransactionsNavbarOptions,
  getWebviewNavbar,
} from '.';
import { mockTheme } from '../../../util/theme';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getNetworkNavbarOptions', () => {
  const Stack = createStackNavigator();
  const mockNavigation = {
    pop: jest.fn(),
  };

  const TestNavigator = ({ options }) => (
    <Stack.Navigator>
      <Stack.Screen name="TestScreen" component={() => options.header()} />
    </Stack.Navigator>
  );

  it('renders correctly with default options', () => {
    const options = getNetworkNavbarOptions(
      'Test Title',
      false,
      mockNavigation,
    );

    const { getByText } = renderWithProvider(
      <TestNavigator options={options} />,
      {
        state: {},
      },
    );

    expect(getByText('Test Title')).toBeTruthy();
  });
});

describe('getTransactionsNavbarOptions', () => {
  const Stack = createStackNavigator();

  const state = {
    engine: {
      backgroundState: {
        NetworkController: {
          selectedNetworkClientId: 'selectedNetworkClientId',
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              rpcEndpoints: [
                {
                  networkClientId: 'selectedNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
            },
            '0x89': {
              chainId: '0x89',
              rpcEndpoints: [
                {
                  networkClientId: 'otherNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
            },
          },
        },
      },
    },
  };

  const TestNavigator = ({ options }) => (
    <Stack.Navigator>
      <Stack.Screen name="TestScreen" component={() => options.header()} />
    </Stack.Navigator>
  );

  it('renders correctly with title and AccountRightButton', () => {
    const mockHandleRightButtonPress = jest.fn();
    const options = getTransactionsNavbarOptions(
      'transactions_view.title',
      mockTheme.colors,
      null,
      '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092',
      mockHandleRightButtonPress,
    );

    const { getByText } = renderWithProvider(
      <TestNavigator options={options} />,
      {
        state,
      },
    );

    expect(getByText('Transactions')).toBeTruthy();
  });
});

describe('getWebviewNavbar', () => {
  const Stack = createStackNavigator();

  const TestNavigator = ({ options }) => (
    <Stack.Navigator>
      <Stack.Screen name="TestScreen" component={() => options.header()} />
    </Stack.Navigator>
  );

  it('renders correctly with given title and share action', () => {
    const mockNavigation = { pop: jest.fn() };
    const mockDispatch = jest.fn();
    const route = {
      params: { title: 'Webview Title', dispatch: mockDispatch },
    };

    const options = getWebviewNavbar(mockNavigation, route, mockTheme.colors);

    const { getByText } = renderWithProvider(
      <TestNavigator options={options} />,
      { state: {} },
    );

    expect(getByText('Webview Title')).toBeTruthy();
  });
});
