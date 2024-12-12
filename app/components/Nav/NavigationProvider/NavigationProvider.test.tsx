import React from 'react';
import { render } from '@testing-library/react-native';
import NavigationProvider from './NavigationProvider';
import { useDispatch } from 'react-redux';
import { useTheme } from '../../../util/theme';
import { Text } from 'react-native';
import NavigationService from '../../../core/NavigationService';
import { onNavigationReady } from '../../../actions/navigation';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: any }) => children(),
  }),
}));

describe('NavigationProvider', () => {
  const mockDispatch = jest.fn();
  const mockSetNavigationRef = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useTheme as jest.Mock).mockReturnValue({
      colors: {
        background: {
          default: '#FFFFFF',
        },
      },
    });
  });

  it('renders children correctly', () => {
    const testMessage = 'Test Child Component';
    const { getByText } = render(
      <NavigationProvider>
        <Text>{testMessage}</Text>
      </NavigationProvider>,
    );

    expect(getByText(testMessage)).toBeTruthy();
  });

  it('dispatches navigation ready action when ready', () => {
    const { getByText } = render(
      <NavigationProvider>
        <Text>Test</Text>
      </NavigationProvider>,
    );

    // Get the NavigationContainer props from the mock
    const navContainer = jest.requireMock(
      '@react-navigation/native',
    ).NavigationContainer;
    const mockProps = navContainer.mock.calls[0][0];

    // Call onReady
    mockProps.onReady();

    expect(mockDispatch).toHaveBeenCalledWith(onNavigationReady());
  });

  it('sets navigation reference correctly', () => {
    const mockRef = {};

    render(
      <NavigationProvider>
        <Text>Test</Text>
      </NavigationProvider>,
    );

    // Get the NavigationContainer props from the mock
    const navContainer = jest.requireMock(
      '@react-navigation/native',
    ).NavigationContainer;
    const mockProps = navContainer.mock.calls[0][0];

    // Call ref callback
    mockProps.ref(mockRef);

    expect(NavigationService.navigation).toBe(mockRef);
  });

  it('applies theme correctly', () => {
    render(
      <NavigationProvider>
        <Text>Test</Text>
      </NavigationProvider>,
    );

    // Get the NavigationContainer props from the mock
    const navContainer = jest.requireMock(
      '@react-navigation/native',
    ).NavigationContainer;
    const mockProps = navContainer.mock.calls[0][0];

    expect(mockProps.theme).toEqual({
      colors: {
        background: '#FFFFFF',
      },
    });
  });
});
