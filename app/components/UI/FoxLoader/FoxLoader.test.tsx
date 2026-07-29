import React from 'react';
import { render, act, screen, waitFor } from '@testing-library/react-native';
import { RiveErrorType } from '@rive-app/react-native';
import FoxLoader, { _resetAnimationStateForTesting } from './FoxLoader';
import { FoxLoaderSelectorsIDs } from './FoxLoader.testIds';
import { hideAsync } from 'expo-splash-screen';
import Logger from '../../../util/Logger';

// Override the global Rive mock so tests control when the view becomes ready
// (the global mock makes riveViewRef available immediately) and can fire onError.
const mockTriggerInput = jest.fn();
let mockRiveViewReady = false;
let mockOnErrorCallback:
  | ((error: { message: string; type: RiveErrorType }) => void)
  | undefined;

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual('../../../__mocks__/rive-app-react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  // Stable across renders; triggerInput delegates lazily (the hoisted factory
  // runs before the mockTriggerInput const initializer).
  const mockRiveMethods = {
    triggerInput: (...args: unknown[]) => mockTriggerInput(...args),
  };
  const mockRiveRefContainer: { current: unknown } = { current: null };
  const mockSetHybridRef = { f: jest.fn() };

  const MockRiveView = (props: {
    onError?: typeof mockOnErrorCallback;
    testID?: string;
  }) => {
    // Capture the latest onError on every render so tests can trigger it
    mockOnErrorCallback = props.onError;
    return MockReact.createElement(View, {
      testID: props.testID ?? 'mock-rive-animation',
    });
  };

  return {
    ...actual,
    RiveView: MockRiveView,
    useRive: () => {
      mockRiveRefContainer.current = mockRiveViewReady ? mockRiveMethods : null;
      return {
        riveRef: mockRiveRefContainer,
        riveViewRef: mockRiveRefContainer.current,
        setHybridRef: mockSetHybridRef,
      };
    },
  };
});

// Stable handlers so component effects depending on riveHandlers don't re-run
const mockRiveHandlers = { onPlay: jest.fn(), onError: jest.fn() };
jest.mock('../../../hooks/performance/useRivePerformance', () => ({
  useRivePerformance: () => ({ riveHandlers: mockRiveHandlers }),
}));

// Getter pattern so individual tests can flip hasTestOverrides without re-mocking the module
let mockHasTestOverrides = false;
jest.mock('../../../util/test/utils', () => ({
  get hasTestOverrides() {
    return mockHasTestOverrides;
  },
}));

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: {},
      animationWrapper: {},
      riveAnimation: {},
      staticFox: {},
      hidden: {},
    },
  })),
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

const renderFoxLoader = ({
  appServicesReady = false,
  onAnimationComplete = jest.fn(),
}: {
  appServicesReady?: boolean;
  onAnimationComplete?: jest.Mock;
} = {}) =>
  render(
    <FoxLoader
      appServicesReady={appServicesReady}
      onAnimationComplete={onAnimationComplete}
    />,
  );

describe('FoxLoader', () => {
  beforeEach(() => {
    // Reset module-level animation flags so each test starts with a clean state
    _resetAnimationStateForTesting();
    jest.clearAllMocks();
    mockRiveViewReady = false;
    mockOnErrorCallback = undefined;
    mockHasTestOverrides = false;
  });

  it('renders the container, static fox, and Rive wrapper', () => {
    renderFoxLoader();

    expect(
      screen.getByTestId(FoxLoaderSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(FoxLoaderSelectorsIDs.ANIMATION_WRAPPER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(FoxLoaderSelectorsIDs.STATIC_FOX),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(FoxLoaderSelectorsIDs.RIVE_WRAPPER),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('mock-rive-animation')).toBeOnTheScreen();
  });

  it('returns null and completes immediately in E2E', async () => {
    mockHasTestOverrides = true;
    const onAnimationComplete = jest.fn();

    renderFoxLoader({ onAnimationComplete });

    expect(screen.queryByTestId(FoxLoaderSelectorsIDs.CONTAINER)).toBeNull();
    expect(
      screen.queryByTestId(FoxLoaderSelectorsIDs.ANIMATION_WRAPPER),
    ).toBeNull();
    expect(screen.queryByTestId(FoxLoaderSelectorsIDs.STATIC_FOX)).toBeNull();
    expect(screen.queryByTestId(FoxLoaderSelectorsIDs.RIVE_WRAPPER)).toBeNull();
    expect(screen.queryByTestId('mock-rive-animation')).toBeNull();
    await waitFor(() => expect(onAnimationComplete).toHaveBeenCalledTimes(1));
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });

  it('fires the Start trigger once the Rive view becomes ready', () => {
    const onAnimationComplete = jest.fn();
    const { rerender } = renderFoxLoader({ onAnimationComplete });

    // View not ready yet — nothing fired
    expect(mockTriggerInput).not.toHaveBeenCalled();

    // View becomes ready (the nitro equivalent of the legacy onPlay signal)
    mockRiveViewReady = true;
    rerender(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    // triggerInput takes only the trigger name; the state machine is the
    // stateMachineName view prop
    expect(mockTriggerInput).toHaveBeenCalledWith('Start');
    expect(mockTriggerInput).toHaveBeenCalledTimes(1);
  });

  it('fires the Start trigger only once even when the component remounts', () => {
    mockRiveViewReady = true;
    const { unmount } = renderFoxLoader();

    expect(mockTriggerInput).toHaveBeenCalledWith('Start');
    expect(mockTriggerInput).toHaveBeenCalledTimes(1);

    unmount();
    mockTriggerInput.mockClear();

    // Remount — animationStarted is still true at module level, so Start must not fire again
    renderFoxLoader();

    expect(mockTriggerInput).not.toHaveBeenCalledWith('Start');
  });

  it('fires Stop and completes after the exit animation delay when app services are ready', () => {
    jest.useFakeTimers();
    mockRiveViewReady = true;
    const onAnimationComplete = jest.fn();
    renderFoxLoader({ appServicesReady: true, onAnimationComplete });

    // Start fires on play, Stop fires immediately because services are ready
    expect(mockTriggerInput).toHaveBeenCalledWith('Start');
    expect(mockTriggerInput).toHaveBeenCalledWith('Stop');
    expect(mockTriggerInput).toHaveBeenCalledTimes(2);
    // Completion is timed — the nitro runtime has no onStateChanged/ExitState
    expect(onAnimationComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('fires the Stop trigger only once across rerenders', () => {
    jest.useFakeTimers();
    mockRiveViewReady = true;
    const onAnimationComplete = jest.fn();
    const { rerender } = renderFoxLoader({
      appServicesReady: true,
      onAnimationComplete,
    });

    expect(mockTriggerInput).toHaveBeenCalledWith('Stop');
    mockTriggerInput.mockClear();

    rerender(
      <FoxLoader appServicesReady onAnimationComplete={onAnimationComplete} />,
    );

    expect(mockTriggerInput).not.toHaveBeenCalledWith('Stop');
    jest.useRealTimers();
  });

  it('forces onAnimationComplete via the global timeout if the exit never runs', () => {
    jest.useFakeTimers();
    mockRiveViewReady = true;
    const onAnimationComplete = jest.fn();
    // appServicesReady=false — Stop is never fired, animation would spin forever
    renderFoxLoader({ onAnimationComplete });

    expect(onAnimationComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3_000);
    });

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
    expect(hideAsync).toHaveBeenCalled();
    expect(Logger.log).toHaveBeenCalledWith(
      'FoxLoader: forcing app reveal after timeout',
    );
    jest.useRealTimers();
  });

  it('calls onAnimationComplete immediately on Rive failure before playback starts', () => {
    const onAnimationComplete = jest.fn();
    // View never becomes ready — Rive failed to load the asset
    renderFoxLoader({ onAnimationComplete });

    act(() => {
      mockOnErrorCallback?.({
        message: 'File not found',
        type: RiveErrorType.FileNotFound,
      });
    });

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
    expect(hideAsync).toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'FoxLoader: Rive failed before playback (FileNotFound)',
    );
  });

  it('ignores Rive runtime errors after the animation has already started', () => {
    mockRiveViewReady = true;
    const onAnimationComplete = jest.fn();
    renderFoxLoader({ onAnimationComplete });

    // onError fires mid-playback — treated as non-fatal
    act(() => {
      mockOnErrorCallback?.({
        message: 'Runtime error',
        type: RiveErrorType.MalformedFile,
      });
    });

    expect(onAnimationComplete).not.toHaveBeenCalled();
  });

  it('calls onAnimationComplete immediately on remount if animation already completed this session', () => {
    jest.useFakeTimers();
    mockRiveViewReady = true;
    const onAnimationComplete = jest.fn();

    // First mount: run the animation to completion
    const { unmount } = renderFoxLoader({
      appServicesReady: true,
      onAnimationComplete,
    });
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(onAnimationComplete).toHaveBeenCalledTimes(1);

    unmount();
    onAnimationComplete.mockClear();

    // Remount — animationComplete=true at module level, so callback fires on mount immediately
    renderFoxLoader({ onAnimationComplete });
    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('calls hideAsync when the static fox image finishes loading', () => {
    renderFoxLoader();

    act(() => {
      screen.getByTestId(FoxLoaderSelectorsIDs.STATIC_FOX).props.onLoad();
    });

    expect(hideAsync).toHaveBeenCalled();
  });

  it('logs an error when hideAsync rejects during static fox onLoad', async () => {
    jest.mocked(hideAsync).mockRejectedValueOnce(new Error('hide failed'));
    renderFoxLoader();

    await act(async () => {
      screen.getByTestId(FoxLoaderSelectorsIDs.STATIC_FOX).props.onLoad();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to hide splash screen',
    );
  });

  it('logs an error when triggerInput throws during animation start', () => {
    mockTriggerInput.mockImplementationOnce(() => {
      throw new Error('triggerInput failed');
    });
    mockRiveViewReady = true;
    renderFoxLoader();

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Error triggering splash screen Rive animation',
    );
  });

  it('logs an error when triggerInput throws during animation stop', () => {
    mockTriggerInput
      .mockImplementationOnce(() => {
        // Start call succeeds
      })
      .mockImplementationOnce(() => {
        throw new Error('stop failed');
      });
    mockRiveViewReady = true;
    renderFoxLoader({ appServicesReady: true });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Error stopping splash screen Rive animation',
    );
  });

  it('logs an error when hideAsync rejects in the timeout fallback', async () => {
    jest.useFakeTimers();
    jest.mocked(hideAsync).mockRejectedValueOnce(new Error('hide failed'));
    renderFoxLoader();

    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to hide splash screen in timeout fallback',
    );
    jest.useRealTimers();
  });

  it('logs an error when hideAsync rejects during the onError bail-out', async () => {
    jest.mocked(hideAsync).mockRejectedValueOnce(new Error('hide failed'));
    renderFoxLoader();

    await act(async () => {
      mockOnErrorCallback?.({
        message: 'File not found',
        type: RiveErrorType.FileNotFound,
      });
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to hide splash screen on Rive error',
    );
  });
});
