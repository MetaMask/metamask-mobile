import React from 'react';
import { render, act } from '@testing-library/react-native';
import FoxLoader, { _resetAnimationStateForTesting } from './FoxLoader';

// Override the global rive-react-native mock so tests can manually trigger
// onPlay, onStateChanged, and onError instead of having onPlay auto-fire.
const mockFireState = jest.fn();
let mockRiveCallbacks: {
  onPlay?: () => void;
  onStateChanged?: (machine: string, state: string) => void;
  onError?: () => void;
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

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = render(
      <FoxLoader appServicesReady={false} onAnimationComplete={jest.fn()} />,
    );
    expect(toJSON()).toMatchSnapshot();
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
      mockRiveCallbacks.onError?.();
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
      mockRiveCallbacks.onError?.();
    });

    expect(onAnimationComplete).not.toHaveBeenCalled();
  });

  it('does not fire the Start trigger in E2E mode', () => {
    mockIsE2E = true;
    render(
      <FoxLoader appServicesReady={false} onAnimationComplete={jest.fn()} />,
    );

    act(() => {
      mockRiveCallbacks.onPlay?.();
    });

    expect(mockFireState).not.toHaveBeenCalledWith('Splash_animation', 'Start');
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
});
