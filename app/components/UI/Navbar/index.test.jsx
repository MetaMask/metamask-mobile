/* eslint-disable react/prop-types */
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { getNetworkNavbarOptions } from '.';

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
        state: {},
      },
    );

    expect(getByText('Test Title')).toBeTruthy();
  });
});
