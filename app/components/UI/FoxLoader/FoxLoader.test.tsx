import React from 'react';
import { render, act, screen, waitFor } from '@testing-library/react-native';
import FoxLoader, { _resetAnimationStateForTesting } from './FoxLoader';
import { FoxLoaderSelectorsIDs } from './FoxLoader.testIds';
import { hideAsync } from 'expo-splash-screen';
import Logger from '../../../util/Logger';

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
    _resetAnimationStateForTesting();
    jest.clearAllMocks();
    mockHasTestOverrides = false;
  });

  it('renders the container and static fox', () => {
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
    await waitFor(() => expect(onAnimationComplete).toHaveBeenCalledTimes(1));
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps the loader up while app services are still loading', () => {
    const onAnimationComplete = jest.fn();

    renderFoxLoader({ onAnimationComplete });

    expect(onAnimationComplete).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(FoxLoaderSelectorsIDs.STATIC_FOX),
    ).toBeOnTheScreen();
  });

  it('dismisses the loader when app services are ready', () => {
    const onAnimationComplete = jest.fn();

    renderFoxLoader({ appServicesReady: true, onAnimationComplete });

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });

  it('dismisses the loader once when app services stay ready', () => {
    const onAnimationComplete = jest.fn();
    const { rerender } = renderFoxLoader({
      appServicesReady: true,
      onAnimationComplete,
    });

    rerender(
      <FoxLoader appServicesReady onAnimationComplete={onAnimationComplete} />,
    );

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
  });

  it('dismisses immediately on remount after the loader was already dismissed', () => {
    const onAnimationComplete = jest.fn();
    const { unmount } = renderFoxLoader({
      appServicesReady: true,
      onAnimationComplete,
    });

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);

    unmount();
    onAnimationComplete.mockClear();

    renderFoxLoader({ onAnimationComplete });

    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
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

  it('logs an error when hideAsync rejects while dismissing the loader', async () => {
    jest.mocked(hideAsync).mockRejectedValueOnce(new Error('hide failed'));

    renderFoxLoader({ appServicesReady: true });

    await act(async () => {
      await Promise.resolve();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to hide splash screen',
    );
  });

  it('logs an error when hideAsync rejects in E2E mode', async () => {
    mockHasTestOverrides = true;
    jest.mocked(hideAsync).mockRejectedValueOnce(new Error('hide failed'));

    renderFoxLoader();

    await waitFor(() =>
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Failed to hide splash screen in E2E mode',
      ),
    );
  });
});
