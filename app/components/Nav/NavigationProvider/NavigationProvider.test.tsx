import React from 'react';
import { render } from '@testing-library/react-native';
import NavigationProvider from './NavigationProvider';
import { useDispatch } from 'react-redux';
import { View, Text } from 'react-native';
import { onNavigationReady } from '../../../actions/navigation';
import NavigationService from '../../../core/NavigationService';
import {
  DefaultTheme,
  NavigationContainerRef,
  NavigationState,
  ParamListBase,
} from '@react-navigation/native';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { getNavIntegration } from '../../../util/sentry/utils';
import { handleDeeplinkNavigationStateChange } from '../../../core/Performance/DeeplinkPerformance';

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

jest.mock('../../../core/Performance/DeeplinkPerformance', () => ({
  handleDeeplinkNavigationStateChange: jest.fn(),
}));

const mockCapturedNavContainerProps: {
  onStateChange?: (state?: NavigationState) => void;
  theme?: typeof DefaultTheme;
} = {};

jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  const actual = jest.requireActual(
    '@react-navigation/native',
  ) as typeof import('@react-navigation/native');

  const NavigationContainer = ReactActual.forwardRef(
    (
      props: {
        children?: ReactActual.ReactNode;
        onReady?: () => void;
        onStateChange?: (state?: NavigationState) => void;
        theme?: typeof actual.DefaultTheme;
      },
      ref: ReactActual.ForwardedRef<{ navigate: jest.Mock }>,
    ) => {
      mockCapturedNavContainerProps.onStateChange = props.onStateChange;
      mockCapturedNavContainerProps.theme = props.theme;

      if (typeof ref === 'function') {
        ref({ navigate: jest.fn() });
      }

      props.onReady?.();

      return props.children ?? null;
    },
  );
  NavigationContainer.displayName = 'NavigationContainer';

  return {
    ...actual,
    NavigationContainer,
  };
});

jest.mock('@react-navigation/native-stack', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');

  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: { children?: ReactActual.ReactNode }) =>
        children ?? null,
      Screen: ({
        children,
      }: {
        children?: ReactActual.ReactNode | (() => ReactActual.ReactNode);
      }) => (typeof children === 'function' ? children() : (children ?? null)),
    }),
  };
});

describe('NavigationProvider', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCapturedNavContainerProps.onStateChange = undefined;
    mockCapturedNavContainerProps.theme = undefined;
    NavigationService.navigation =
      undefined as unknown as NavigationContainerRef<ParamListBase>;
    jest.mocked(useDispatch).mockReturnValue(mockDispatch);
  });

  it('renders children correctly', () => {
    const testMessage = 'Test Child Component';
    const { getByText } = render(
      <NavigationProvider>
        <Text>{testMessage}</Text>
      </NavigationProvider>,
    );

    expect(getByText(testMessage)).toBeOnTheScreen();
  });

  it('dispatches navigation ready action when ready', () => {
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

  it('always registers the navigation container with Sentry regardless of init timing', () => {
    // registerNavigationContainer must be called unconditionally so that a
    // NavigationProvider that mounts before the fire-and-forget setupSentry()
    // finishes still wires up TTID/ui.load spans. E2E/test builds are handled
    // inside getNavIntegration() itself, which returns a no-op stub when
    // hasTestOverrides is true — there is no SDK-client guard here.
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
    render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    expect(mockCapturedNavContainerProps.theme).toEqual({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: 'transparent',
      },
    });
  });

  it('reports the focused route chain to Deeplink Navigated on every state change', () => {
    render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    mockCapturedNavContainerProps.onStateChange?.({
      index: 0,
      routes: [
        {
          name: 'HomeNav',
          state: {
            index: 1,
            routes: [{ name: 'Wallet' }, { name: 'TrendingView' }],
          },
        },
      ],
    } as NavigationState);

    expect(handleDeeplinkNavigationStateChange).toHaveBeenCalledWith({
      focusedRouteNames: ['HomeNav', 'TrendingView'],
    });
  });

  it('ignores an undefined navigation state', () => {
    render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    mockCapturedNavContainerProps.onStateChange?.(undefined);

    expect(handleDeeplinkNavigationStateChange).not.toHaveBeenCalled();
  });

  it('Measures performance trace order when navigation provider is initialized', () => {
    const traceCalls: { functionName: string; name: string }[] = [];
    const mockTraceCall =
      (functionName: string) =>
      ({ name }: { name: string }) => {
        traceCalls.push({ functionName, name });
      };
    jest.mocked(trace).mockImplementation(mockTraceCall('trace'));
    jest.mocked(endTrace).mockImplementation(mockTraceCall('endTrace'));

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
