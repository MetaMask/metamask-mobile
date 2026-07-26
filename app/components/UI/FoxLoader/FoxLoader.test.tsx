import React from 'react';
import { render, act, screen, waitFor } from '@testing-library/react-native';
import FoxLoader, { _resetAnimationStateForTesting } from './FoxLoader';
import { FoxLoaderSelectorsIDs } from './FoxLoader.testIds';
import { hideAsync } from 'expo-splash-screen';
import Logger from '../../../util/Logger';

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
      staticFox: {},
    },
  })),
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

describe('FoxLoader', () => {
  beforeEach(() => {
    // Reset module-level animation flags so each test starts with a clean state
    _resetAnimationStateForTesting();
    jest.clearAllMocks();
    mockHasTestOverrides = false;
  });

  it('renders the container, animation wrapper, and static fox', () => {
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
  });

  it('returns null and completes immediately in E2E', async () => {
    mockHasTestOverrides = true;
    const onAnimationComplete = jest.fn();

    render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    expect(screen.queryByTestId(FoxLoaderSelectorsIDs.CONTAINER)).toBeNull();
    expect(
      screen.queryByTestId(FoxLoaderSelectorsIDs.ANIMATION_WRAPPER),
    ).toBeNull();
    expect(screen.queryByTestId(FoxLoaderSelectorsIDs.STATIC_FOX)).toBeNull();
    await waitFor(() => expect(onAnimationComplete).toHaveBeenCalledTimes(1));
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });

  it('calls onAnimationComplete immediately when mounted with appServicesReady', () => {
    const onAnimationComplete = jest.fn();
    render(
      <FoxLoader appServicesReady onAnimationComplete={onAnimationComplete} />,
    );

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onAnimationComplete when appServicesReady becomes true', () => {
    const onAnimationComplete = jest.fn();
    const { rerender } = render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    // Not ready yet — reveal has not been triggered
    expect(onAnimationComplete).not.toHaveBeenCalled();

    // Services report ready → reveal fires once
    rerender(
      <FoxLoader appServicesReady onAnimationComplete={onAnimationComplete} />,
    );

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onAnimationComplete before services are ready or timeout elapses', () => {
    const onAnimationComplete = jest.fn();
    render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    expect(onAnimationComplete).not.toHaveBeenCalled();
  });

  it('forces onAnimationComplete via the timeout fallback if services never report ready', () => {
    jest.useFakeTimers();
    const onAnimationComplete = jest.fn();
    render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    expect(onAnimationComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3_000);
    });

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
    expect(hideAsync).toHaveBeenCalledTimes(1);
    expect(Logger.log).toHaveBeenCalledWith(
      'FoxLoader: forcing app reveal after timeout',
    );
    jest.useRealTimers();
  });

  it('calls onAnimationComplete immediately on remount if reveal already completed this session', () => {
    const onAnimationComplete = jest.fn();

    // First mount: services ready triggers reveal, persisting the module-level flag
    const { unmount } = render(
      <FoxLoader appServicesReady onAnimationComplete={onAnimationComplete} />,
    );
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

  it('does not fire reveal on remount once state has been reset for testing', () => {
    const onAnimationComplete = jest.fn();

    // Complete a session
    const { unmount } = render(
      <FoxLoader appServicesReady onAnimationComplete={onAnimationComplete} />,
    );
    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
    unmount();
    onAnimationComplete.mockClear();

    // Reset clears the persisted flag
    _resetAnimationStateForTesting();

    // Remount with services not ready — reveal must not fire
    render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    expect(onAnimationComplete).not.toHaveBeenCalled();
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

  it('logs an error when hideAsync rejects in the timeout fallback', async () => {
    jest.useFakeTimers();
    jest.mocked(hideAsync).mockRejectedValueOnce(new Error('hide failed'));
    render(
      <FoxLoader appServicesReady={false} onAnimationComplete={jest.fn()} />,
    );

    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to hide splash screen in timeout fallback',
    );
    jest.useRealTimers();
  });
});
