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
      _ref: React.Ref<unknown>,
    ) => {
      captured.onReady = props.onReady;
      captured.onStateChange = props.onStateChange;
      // Fire onReady synchronously so existing assertions still pass.
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

    expect(capturedContainerProps.onStateChange).toBeDefined();

    // Shallow state (top-level focused route)
    capturedContainerProps.onStateChange?.({
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
    capturedContainerProps.onStateChange?.({
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
    capturedContainerProps.onStateChange?.(undefined);

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: setCurrentRoute('x').type }),
    );
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
