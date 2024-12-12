import React from 'react';
import { render } from '@testing-library/react-native';
import NavigationProvider from './NavigationProvider';
import { useDispatch } from 'react-redux';
import { View, Text } from 'react-native';
import { onNavigationReady } from '../../../actions/navigation';
import NavigationService from '../../../core/NavigationService';
import { NavigationContainerRef } from '@react-navigation/native';

jest.mock('../../../core/NavigationService', () => ({
  navigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: jest.fn().mockReturnValue({
    colors: {
      background: {
        default: '#FFFFFF',
      },
    },
  }),
}));

describe('NavigationProvider', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    NavigationService.navigation =
      undefined as unknown as NavigationContainerRef;
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
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

  it('dispatches navigation ready action when ready', async () => {
    render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    expect(mockDispatch).toHaveBeenCalledWith(onNavigationReady());
  });

  it('sets navigation reference correctly', () => {
    expect(NavigationService.navigation).not.toBeDefined();

    render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    expect(NavigationService.navigation).toBeDefined();
    expect(NavigationService.navigation).toHaveProperty('navigate');
  });
});
