import React from 'react';
import { render, act, screen } from '@testing-library/react-native';
import FoxLoader, { _resetAnimationStateForTesting } from './FoxLoader';
import { FoxLoaderSelectorsIDs } from './FoxLoader.testIds';
import { hideAsync } from 'expo-splash-screen';
import Logger from '../../../util/Logger';

// Override the global rive-react-native mock so tests can manually trigger
// onPlay, onStateChanged, and onError instead of having onPlay auto-fire.
const mockFireState = jest.fn();
let mockRiveCallbacks: {
  onPlay?: () => void;
  onStateChanged?: (machine: string, state: string) => void;
  onError?: (error: { message: string; type: string }) => void;
} = {};

jest.mock('rive-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockRive = MockReact.forwardRef((props: any, ref: any) => {
    // Capture latest callbacks on every render so tests can trigger them
    mockRiveCallbacks = {
      onPlay: props.onPlay,
      onStateChanged: props.onStateChanged,
      onError: props.onError,
    };
    MockReact.useImperativeHandle(
      ref,
      () => ({ fireState: mockFireState }),
      [],
    );
    return MockReact.createElement(View, { testID: 'mock-rive-animation' });
  });
  MockRive.displayName = 'Rive';

  return {
    __esModule: true,
    default: MockRive,
    Fit: { Contain: 'contain' },
    Alignment: { Center: 'center' },
    RiveRenderer: { defaultRenderer: jest.fn() },
    RiveRendererIOS: { Rive: 'Rive' },
    RiveRendererAndroid: { Canvas: 'Canvas' },
  };
});

// Getter pattern so individual tests can flip isE2E without re-mocking the module
let mockIsE2E = false;
jest.mock('../../../util/test/utils', () => ({
  get isE2E() {
    return mockIsE2E;
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
}));

describe('FoxLoader', () => {
  beforeEach(() => {
    // Reset module-level animation flags so each test starts with a clean state
    _resetAnimationStateForTesting();
    jest.clearAllMocks();
    mockRiveCallbacks = {};
    mockIsE2E = false;
  });

  it('renders the container, static fox, and Rive wrapper', () => {
    render(
      <FoxLoader appServicesReady={false} onAnimationComplete={jest.fn()} />,
    );

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

  it('calls onAnimationComplete when Rive reaches ExitState', () => {
    const onAnimationComplete = jest.fn();
    render(
      <FoxLoader appServicesReady onAnimationComplete={onAnimationComplete} />,
    );

    // Rive starts playing
    act(() => {
      mockRiveCallbacks.onPlay?.();
    });
    // Fox enters idle state — appServicesReady=true means stopAnimation fires immediately,
    // setting exitTriggered=true
    act(() => {
      mockRiveCallbacks.onStateChanged?.(
        'Splash_animation',
        'Blink and look around (Shorter)',
      );
    });
    // Exit animation completes
    act(() => {
      mockRiveCallbacks.onStateChanged?.('Splash_animation', 'ExitState');
    });

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onAnimationComplete on ExitState when stop was never triggered', () => {
    const onAnimationComplete = jest.fn();
    // appServicesReady=false means stopAnimation never fires when fox goes idle,
    // so exitTriggered stays false and ExitState should be ignored
    render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    act(() => {
      mockRiveCallbacks.onPlay?.();
    });
    act(() => {
      mockRiveCallbacks.onStateChanged?.('Splash_animation', 'ExitState');
    });

    expect(onAnimationComplete).not.toHaveBeenCalled();
  });

  it('calls onAnimationComplete immediately on Rive load failure before animation starts', () => {
    const onAnimationComplete = jest.fn();
    render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    // onError fires before onPlay — Rive failed to load the asset
    act(() => {
      mockRiveCallbacks.onError?.({
        message: 'File not found',
        type: 'FileNotFound',
      });
    });

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
  });

  it('ignores Rive runtime errors after the animation has already started', () => {
    const onAnimationComplete = jest.fn();
    render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    act(() => {
      mockRiveCallbacks.onPlay?.();
    });
    // onError fires mid-playback — treated as non-fatal
    act(() => {
      mockRiveCallbacks.onError?.({
        message: 'Runtime error',
        type: 'MalformedFile',
      });
    });

    expect(onAnimationComplete).not.toHaveBeenCalled();
  });

  it('fires the Start trigger only once even when the component remounts', () => {
    const onAnimationComplete = jest.fn();
    const { unmount } = render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    act(() => {
      mockRiveCallbacks.onPlay?.();
    });
    expect(mockFireState).toHaveBeenCalledWith('Splash_animation', 'Start');
    expect(mockFireState).toHaveBeenCalledTimes(1);

    unmount();
    mockFireState.mockClear();

    // Remount — animationStarted is still true at module level, so Start must not fire again
    render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );
    act(() => {
      mockRiveCallbacks.onPlay?.();
    });

    expect(mockFireState).not.toHaveBeenCalledWith('Splash_animation', 'Start');
  });

  it('calls onAnimationComplete immediately on remount if animation already completed this session', () => {
    const onAnimationComplete = jest.fn();

    // First mount: run the animation to completion
    const { unmount } = render(
      <FoxLoader appServicesReady onAnimationComplete={onAnimationComplete} />,
    );
    act(() => {
      mockRiveCallbacks.onPlay?.();
    });
    act(() => {
      mockRiveCallbacks.onStateChanged?.(
        'Splash_animation',
        'Blink and look around (Shorter)',
      );
    });
    act(() => {
      mockRiveCallbacks.onStateChanged?.('Splash_animation', 'ExitState');
    });
    expect(onAnimationComplete).toHaveBeenCalledTimes(1);

    unmount();
    onAnimationComplete.mockClear();

    // Remount — animationComplete=true at module level, so callback fires on mount immediately
    render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );
    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
  });

  it('forces onAnimationComplete via timeout if animation never completes', () => {
    jest.useFakeTimers();
    const onAnimationComplete = jest.fn();
    render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    // Animation starts but state machine gets stuck — ExitState never fires
    act(() => {
      mockRiveCallbacks.onPlay?.();
    });
    expect(onAnimationComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('calls hideAsync when the static fox image finishes loading', () => {
    render(
      <FoxLoader appServicesReady={false} onAnimationComplete={jest.fn()} />,
    );

    act(() => {
      screen.getByTestId(FoxLoaderSelectorsIDs.STATIC_FOX).props.onLoad();
    });

    expect(hideAsync).toHaveBeenCalled();
  });

  it('logs an error when hideAsync rejects during static fox onLoad', async () => {
    jest.mocked(hideAsync).mockRejectedValueOnce(new Error('hide failed'));
    render(
      <FoxLoader appServicesReady={false} onAnimationComplete={jest.fn()} />,
    );

    await act(async () => {
      screen.getByTestId(FoxLoaderSelectorsIDs.STATIC_FOX).props.onLoad();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to hide splash screen',
    );
  });

  it('logs an error when fireState throws during animation start', () => {
    mockFireState.mockImplementationOnce(() => {
      throw new Error('fireState failed');
    });
    render(
      <FoxLoader appServicesReady={false} onAnimationComplete={jest.fn()} />,
    );

    act(() => {
      mockRiveCallbacks.onPlay?.();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Error triggering splash screen Rive animation',
    );
  });

  it('logs an error when fireState throws during animation stop', () => {
    mockFireState
      .mockImplementationOnce(() => {
        // Start call succeeds
      })
      .mockImplementationOnce(() => {
        throw new Error('stop failed');
      });
    render(<FoxLoader appServicesReady onAnimationComplete={jest.fn()} />);

    act(() => {
      mockRiveCallbacks.onPlay?.();
    });
    act(() => {
      mockRiveCallbacks.onStateChanged?.(
        'Splash_animation',
        'Blink and look around (Shorter)',
      );
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Error stopping splash screen Rive animation',
    );
  });

  it('fires the Stop trigger only once when stopAnimation is called again after exitTriggered is set', () => {
    const onAnimationComplete = jest.fn();
    const { rerender } = render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    act(() => {
      mockRiveCallbacks.onPlay?.();
    });
    // Fox goes idle while services not yet ready
    act(() => {
      mockRiveCallbacks.onStateChanged?.(
        'Splash_animation',
        'Blink and look around (Shorter)',
      );
    });
    // Services become ready → exitTriggered=false → Stop fires
    rerender(
      <FoxLoader appServicesReady onAnimationComplete={onAnimationComplete} />,
    );
    expect(mockFireState).toHaveBeenCalledWith('Splash_animation', 'Stop');
    mockFireState.mockClear();

    // isIdle flips false then true again — effect re-runs but exitTriggered=true → no second Stop
    act(() => {
      mockRiveCallbacks.onStateChanged?.('Splash_animation', 'SomeOtherState');
    });
    act(() => {
      mockRiveCallbacks.onStateChanged?.(
        'Splash_animation',
        'Blink and look around (Shorter)',
      );
    });

    expect(mockFireState).not.toHaveBeenCalledWith('Splash_animation', 'Stop');
  });

  it('ignores onStateChanged events once animation has already completed', () => {
    const onAnimationComplete = jest.fn();
    render(
      <FoxLoader appServicesReady onAnimationComplete={onAnimationComplete} />,
    );

    act(() => {
      mockRiveCallbacks.onPlay?.();
    });
    act(() => {
      mockRiveCallbacks.onStateChanged?.(
        'Splash_animation',
        'Blink and look around (Shorter)',
      );
    });
    act(() => {
      mockRiveCallbacks.onStateChanged?.('Splash_animation', 'ExitState');
    });
    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
    onAnimationComplete.mockClear();

    // Subsequent state changes after completion must be silently ignored
    act(() => {
      mockRiveCallbacks.onStateChanged?.('Splash_animation', 'ExitState');
    });

    expect(onAnimationComplete).not.toHaveBeenCalled();
  });

  it('logs an error when hideAsync rejects in the timeout fallback', async () => {
    jest.useFakeTimers();
    jest.mocked(hideAsync).mockRejectedValueOnce(new Error('hide failed'));
    render(
      <FoxLoader appServicesReady={false} onAnimationComplete={jest.fn()} />,
    );

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to hide splash screen in timeout fallback',
    );
    jest.useRealTimers();
  });

  it('logs an error when hideAsync rejects during the onError bail-out', async () => {
    jest.mocked(hideAsync).mockRejectedValueOnce(new Error('hide failed'));
    render(
      <FoxLoader appServicesReady={false} onAnimationComplete={jest.fn()} />,
    );

    await act(async () => {
      mockRiveCallbacks.onError?.({
        message: 'File not found',
        type: 'FileNotFound',
      });
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to hide splash screen on Rive error',
    );
  });
});
