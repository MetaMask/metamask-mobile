/* eslint-disable react/prop-types */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { getNetworkNavbarOptions, getPaymentRequestOptionsTitle } from '.';
import { mockTheme } from '../../../util/theme';
import { RequestPaymentViewSelectors } from '../../../../e2e/selectors/Receive/RequestPaymentView.selectors';

describe('getNetworkNavbarOptions', () => {
  const Stack = createStackNavigator();

  const mockNavigation = {
    pop: jest.fn(),
  };

  const TestNavigator = ({ options }) => (
    <Stack.Navigator>
      <Stack.Screen
        name="TestScreen"
        component={() => null}
        options={options}
      />
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
      mockTheme.colors
    );

    const { getByText } = renderWithProvider(
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

describe('getPaymentRequestOptionsTitle', () => {
  const Stack = createStackNavigator();

  const mockNavigation = {
    pop: jest.fn(),
  };

  const TestNavigator = ({ options }) => (
    <Stack.Navigator>
      <Stack.Screen 
        name="TestScreen" 
        component={() => null}
        options={options}
      />
    </Stack.Navigator>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });


  it('should match snapshot with goBack function', () => {
    const mockGoBack = jest.fn();
    const options = getPaymentRequestOptionsTitle(
      'Payment Request',
      mockNavigation,
      { params: { dispatch: mockGoBack } },
      mockTheme.colors
    );

    const rendered = renderWithProvider(
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

    expect(rendered).toMatchSnapshot();
  });

  it('renders title and close button when no goBack provided', () => {
    const options = getPaymentRequestOptionsTitle(
      'Payment Request',
      mockNavigation,
      { params: {} },
      mockTheme.colors
    );

    const { getByText, getByTestId } = renderWithProvider(
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

    // Check if title is rendered
    expect(getByText('Payment Request')).toBeTruthy();

    // Check if close button works
    const closeButton = getByTestId(RequestPaymentViewSelectors.BACK_BUTTON_ID);
    fireEvent.press(closeButton);
    expect(mockNavigation.pop).toHaveBeenCalled();
  });
});
