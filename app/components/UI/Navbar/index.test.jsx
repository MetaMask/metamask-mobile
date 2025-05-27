/* eslint-disable react/prop-types */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { getNetworkNavbarOptions } from '.';
import { SolScope } from '@metamask/keyring-api';

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default options', () => {
    const options = getNetworkNavbarOptions(
      'Test Title',
      false,
      mockNavigation,
    );

    const { getByText, getByRole } = renderWithProvider(
      <TestNavigator options={options} />,
      {
        state: {
          engine: {
            backgroundState: {
              ...backgroundState,
            },
          },
        },
      },
    );

    expect(getByText('Test Title')).toBeTruthy();
  });
});
