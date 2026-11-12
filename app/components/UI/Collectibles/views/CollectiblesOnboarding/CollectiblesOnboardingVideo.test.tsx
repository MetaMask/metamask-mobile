import React from 'react';
import {
  AccessibilityInfo,
  AppState,
  Image as NativeImage,
  type AppStateStatus,
} from 'react-native';
import { getTotalMemorySync } from 'react-native-device-info';
import { NetInfoStateType, useNetInfo } from '@react-native-community/netinfo';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import CollectiblesOnboardingVideo from './CollectiblesOnboardingVideo';

jest.mock('react-native-video', () => jest.requireActual('react-native').View);
jest.mock('react-native-device-info', () => ({
  getTotalMemorySync: jest.fn(),
}));
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
  NetInfoStateType: { none: 'none' },
}));

// Narrow native-player contract: keep application policy real and control only
// native memory, connectivity, accessibility and lifecycle signals.
describe('Original onboarding footage lifecycle', () => {
  // Select the boolean-change overload; Jest otherwise infers the unrelated
  // announcementFinished overload from the native module's declarations.
  const accessibilityChanges = AccessibilityInfo as {
    addEventListener: (
      event: 'reduceMotionChanged',
      callback: (value: boolean) => void,
    ) => { remove: () => void };
  };
  let stateChanged: (state: AppStateStatus) => void;
  let reduceMotionChanged: (value: boolean) => void;
  const removeApp = jest.fn();
  const removeMotion = jest.fn();
  const originalState = AppState.currentState;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getTotalMemorySync).mockReturnValue(1024 ** 3);
    jest.mocked(useNetInfo).mockReturnValue({
      type: NetInfoStateType.none,
      isConnected: false,
      isInternetReachable: false,
      details: null,
    });
    jest.spyOn(NativeImage, 'resolveAssetSource').mockReturnValue({
      uri: 'file:///bundled/onboarding.mp4',
      width: 1080,
      height: 1920,
      scale: 1,
    });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    jest
      .spyOn(accessibilityChanges, 'addEventListener')
      .mockImplementation((_event, callback) => {
        reduceMotionChanged = callback;
        return { remove: removeMotion };
      });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, callback) => {
        stateChanged = callback;
        return { remove: removeApp };
      });
  });
  afterEach(() => {
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: originalState,
    });
    jest.restoreAllMocks();
  });
  it('plays bundled footage on a LOW device while offline', async () => {
    renderWithProvider(<CollectiblesOnboardingVideo step={0} isActive />);

    const video = await screen.findByTestId('collectibles-onboarding-video', {
      includeHiddenElements: true,
    });

    expect(video).toHaveProp('paused', false);
    expect(video).toHaveProp('source', {
      uri: 'file:///bundled/onboarding.mp4',
    });
  });
  it('pauses video while MetaMask is backgrounded and cleans both subscriptions', async () => {
    const { unmount } = renderWithProvider(
      <CollectiblesOnboardingVideo step={0} isActive />,
    );
    await waitFor(() =>
      expect(
        screen.getByTestId('collectibles-onboarding-video', {
          includeHiddenElements: true,
        }),
      ).toHaveProp('paused', false),
    );
    expect(
      screen.getByTestId('collectibles-onboarding-video', {
        includeHiddenElements: true,
      }),
    ).toHaveProp('source', { uri: 'file:///bundled/onboarding.mp4' });
    act(() => stateChanged('background'));
    expect(
      screen.getByTestId('collectibles-onboarding-video', {
        includeHiddenElements: true,
      }),
    ).toHaveProp('paused', true);
    act(() => stateChanged('active'));
    expect(
      screen.getByTestId('collectibles-onboarding-video', {
        includeHiddenElements: true,
      }),
    ).toHaveProp('paused', false);
    unmount();
    expect(removeApp).toHaveBeenCalledTimes(1);
    expect(removeMotion).toHaveBeenCalledTimes(1);
  });
  it('uses a still poster as soon as Reduce Motion is enabled', async () => {
    renderWithProvider(<CollectiblesOnboardingVideo step={1} isActive />);
    await screen.findByTestId('collectibles-onboarding-video', {
      includeHiddenElements: true,
    });
    act(() => reduceMotionChanged(true));
    expect(
      screen.queryByTestId('collectibles-onboarding-video', {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId('collectibles-onboarding-poster', {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
  });
  it('keeps an unfocused route paused', async () => {
    renderWithProvider(
      <CollectiblesOnboardingVideo step={0} isActive={false} />,
    );
    expect(
      await screen.findByTestId('collectibles-onboarding-video', {
        includeHiddenElements: true,
      }),
    ).toHaveProp('paused', true);
  });
  it('keeps the poster when native video playback fails', async () => {
    renderWithProvider(<CollectiblesOnboardingVideo step={0} isActive />);
    const video = await screen.findByTestId('collectibles-onboarding-video', {
      includeHiddenElements: true,
    });

    fireEvent(video, 'error', { error: { errorString: 'Playback failed' } });

    expect(
      screen.queryByTestId('collectibles-onboarding-video', {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId('collectibles-onboarding-poster', {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
  });
});
