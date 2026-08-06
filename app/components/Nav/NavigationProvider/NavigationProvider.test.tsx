import React from 'react';
import { render } from '@testing-library/react-native';
import NavigationProvider from './NavigationProvider';
import { useDispatch } from 'react-redux';
import { View, Text } from 'react-native';
import { onNavigationReady } from '../../../actions/navigation';
import NavigationService from '../../../core/NavigationService';
import {
  DefaultTheme,
  NavigationContainer,
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { getNavIntegration } from '../../../util/sentry/utils';

jest.mock('../../../util/trace', () => {
  const actual = jest.requireActual('../../../util/trace');
  return {
    ...actual,
    trace: jest.fn(),
    endTrace: jest.fn(),
  };
});

jest.mock('../../../util/sentry/utils', () => {
  const mockIntegration = {
    registerNavigationContainer: jest.fn(),
  };
  return {
    getNavIntegration: jest.fn(() => mockIntegration),
  };
});

jest.mock('../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');
  return {
    useTheme: jest.fn(() => mockTheme),
  };
});

// Mock UIStartup to prevent second trace from being called (for testing purposes)
jest.mock('../../../core/Performance/UIStartup', () => jest.fn());

jest.mock('../../../core/NavigationService', () => ({
  navigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

describe('NavigationProvider', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    NavigationService.navigation =
      undefined as unknown as NavigationContainerRef<ParamListBase>;
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

  it('registers the navigation container with Sentry', () => {
    render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    const mockIntegration = jest.mocked(getNavIntegration)();
    expect(mockIntegration.registerNavigationContainer).toHaveBeenCalledTimes(
      1,
    );
    expect(mockIntegration.registerNavigationContainer).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: expect.any(Function) }),
    );
  });

  it('uses DefaultTheme with a transparent background', () => {
    const { UNSAFE_getByType } = render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    const container = UNSAFE_getByType(NavigationContainer);

    expect(container.props.theme).toEqual({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: 'transparent',
      },
    });
  });

  it('Measures performance trace order when navigation provider is initialized', () => {
    // Track calls in array to test for correct order
    const traceCalls: { functionName: string; name: string }[] = [];
    const mockTraceCall =
      (functionName: string) =>
      ({ name }: { name: string }) => {
        traceCalls.push({ functionName, name });
      };
    (trace as jest.Mock).mockImplementation(mockTraceCall('trace'));
    (endTrace as jest.Mock).mockImplementation(mockTraceCall('endTrace'));

    render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    expect(traceCalls).toEqual([
      { functionName: 'trace', name: TraceName.NavInit },
      { functionName: 'endTrace', name: TraceName.NavInit },
    ]);
  });
});
