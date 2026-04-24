import React from 'react';
import { render } from '@testing-library/react-native';
import NavigationProvider from './NavigationProvider';
import { useDispatch } from 'react-redux';
import { View, Text } from 'react-native';
import {
  onNavigationReady,
  setCurrentRoute,
} from '../../../actions/navigation';
import NavigationService from '../../../core/NavigationService';
import {
  NavigationContainerRef,
  NavigationState,
  ParamListBase,
} from '@react-navigation/native';
import { endTrace, trace, TraceName } from '../../../util/trace';

/**
 * Captures props passed to NavigationContainer so we can invoke the
 * `onStateChange` handler directly from tests — the real
 * @react-navigation/native machinery does not fire `onStateChange` on mere
 * test-level renders, so capturing the prop is the cleanest way to verify
 * the wiring in isolation.
 */
interface CapturedNavigationContainerProps {
  onReady?: () => void;
  onStateChange?: (state: NavigationState | undefined) => void;
}

const navigationContainerThemeCapture: {
  theme?: { colors?: { background?: string } };
} = {};

jest.mock('../../../util/trace', () => {
  const actual = jest.requireActual('../../../util/trace');
  return {
    ...actual,
    trace: jest.fn(),
    endTrace: jest.fn(),
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

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
  const ReactLocal = require('react') as typeof import('react');
  const captured: {
    onReady?: () => void;
    onStateChange?: (state: unknown) => void;
  } = {};
  const MockedContainer = ReactLocal.forwardRef(
    (
      props: {
        onReady?: () => void;
        onStateChange?: (state: unknown) => void;
        children?: React.ReactNode;
      },
      ref: React.Ref<unknown>,
    ) => {
      captured.onReady = props.onReady;
      captured.onStateChange = props.onStateChange;
      // Provide a minimal ref so NavigationService.navigation becomes a
      // functional stub for consumers of `setNavigationRef` while still
      // letting individual tests overwrite it before render when they need
      // specific behavior (e.g. a custom `getRootState`).
      // Only install a stub ref when the test hasn't pre-populated
      // `NavigationService.navigation` itself; this lets individual tests
      // inject a custom ref (e.g. with a specific `getRootState`) before
      // rendering.
      // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
      const navServiceModule = require('../../../core/NavigationService');
      const NavigationServiceModule =
        navServiceModule.default ?? navServiceModule;
      const existing = NavigationServiceModule.navigation as
        | { getRootState?: unknown }
        | undefined;
      const hasTestRef =
        !!existing && typeof existing.getRootState === 'function';
      const stubRef = hasTestRef
        ? existing
        : {
            navigate: jest.fn(),
            reset: jest.fn(),
            getRootState: jest.fn(),
            getCurrentRoute: jest.fn(),
          };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const refAsAny = ref as any;
      if (typeof refAsAny === 'function') {
        refAsAny(stubRef);
      } else if (refAsAny) {
        refAsAny.current = stubRef;
      }
      props.onReady?.();
      return ReactLocal.createElement(
        ReactLocal.Fragment,
        null,
        props.children,
      );
    },
  );
  (MockedContainer as unknown as { __capturedProps: typeof captured }).__capturedProps =
    captured;
  return {
    ...actual,
    NavigationContainer: MockedContainer,
  };
});

/**
 * `NavigationProvider` wraps its children in a `Stack.Navigator`, which would
 * normally require a full NavigationContainer context. Since we mock
 * NavigationContainer to just render children, we also stub
 * `createStackNavigator` so `<Stack.Navigator>` / `<Stack.Screen>` render
 * transparently and we can focus assertions on the provider's own wiring.
 */
jest.mock('@react-navigation/stack', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
  const ReactLocal = require('react') as typeof import('react');
  const Navigator = ({ children }: { children?: React.ReactNode }) =>
    ReactLocal.createElement(ReactLocal.Fragment, null, children);
  const Screen = ({ children, component: Component }: {
    children?: (() => React.ReactNode) | React.ReactNode;
    component?: React.ComponentType;
  }) => {
    if (typeof children === 'function') {
      return ReactLocal.createElement(
        ReactLocal.Fragment,
        null,
        (children as () => React.ReactNode)(),
      );
    }
    if (Component) {
      return ReactLocal.createElement(Component);
    }
    return ReactLocal.createElement(
      ReactLocal.Fragment,
      null,
      children as React.ReactNode,
    );
  };
  return {
    createStackNavigator: () => ({ Navigator, Screen }),
  };
});

/**
 * Pulls the capture object that the mocked NavigationContainer exposes.
 * Using an accessor so tests can always read the freshest refs across
 * re-renders.
 */
const getCapturedProps = (): CapturedNavigationContainerProps => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
  const { NavigationContainer: MockedContainer } = jest.requireMock(
    '@react-navigation/native',
  );
  return (MockedContainer as unknown as {
    __capturedProps: CapturedNavigationContainerProps;
  }).__capturedProps;
};

describe('NavigationProvider', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    navigationContainerThemeCapture.theme = undefined;
    const captured = getCapturedProps();
    captured.onReady = undefined;
    captured.onStateChange = undefined;
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

  it('dispatches setCurrentRoute with the focused leaf route on state change', () => {
    render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    const onStateChange = getCapturedProps().onStateChange;
    expect(onStateChange).toBeDefined();

    // Shallow state (top-level focused route)
    onStateChange?.({
      index: 0,
      routes: [{ key: 'x', name: 'Login' }],
    } as unknown as NavigationState);

    expect(mockDispatch).toHaveBeenCalledWith(setCurrentRoute('Login'));
  });

  it('walks nested navigation state to find the leaf route', () => {
    render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    // Nested state — the leaf route is inside the child navigator.
    getCapturedProps().onStateChange?.({
      index: 0,
      routes: [
        {
          key: 'parent',
          name: 'MainStack',
          state: {
            index: 1,
            routes: [
              { key: 'home', name: 'WalletView' },
              { key: 'swap', name: 'SwapsAmountView' },
            ],
          },
        },
      ],
    } as unknown as NavigationState);

    expect(mockDispatch).toHaveBeenCalledWith(
      setCurrentRoute('SwapsAmountView'),
    );
  });

  it('does not dispatch setCurrentRoute when state is undefined', () => {
    render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    mockDispatch.mockClear();
    getCapturedProps().onStateChange?.(undefined);

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: setCurrentRoute('x').type }),
    );
  });

  it('seeds setCurrentRoute from onReady using the initial navigation state', () => {
    const rootState = {
      index: 0,
      routes: [
        {
          key: 'app',
          name: 'AppFlow',
          state: {
            index: 0,
            routes: [{ key: 'login', name: 'Login' }],
          },
        },
      ],
    };
    NavigationService.navigation = {
      navigate: jest.fn(),
      getRootState: jest.fn(() => rootState),
    } as unknown as NavigationContainerRef<ParamListBase>;

    render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    expect(mockDispatch).toHaveBeenCalledWith(onNavigationReady());
    expect(mockDispatch).toHaveBeenCalledWith(setCurrentRoute('Login'));
  });

  it('does not dispatch setCurrentRoute from onReady when getRootState is unavailable', () => {
    NavigationService.navigation =
      undefined as unknown as NavigationContainerRef<ParamListBase>;

    render(
      <NavigationProvider>
        <View />
      </NavigationProvider>,
    );

    expect(mockDispatch).toHaveBeenCalledWith(onNavigationReady());
    // No setCurrentRoute dispatched because there's no navigation ref yet.
    const setRouteCalls = mockDispatch.mock.calls.filter(
      ([action]) => action?.type === setCurrentRoute('x').type,
    );
    expect(setRouteCalls).toHaveLength(0);
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
