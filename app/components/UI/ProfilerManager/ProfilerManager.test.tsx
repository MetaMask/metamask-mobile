import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Platform, Share } from 'react-native';
import RNFS from 'react-native-fs';
import { startProfiling, stopProfiling } from 'react-native-release-profiler';
import ShakeDetector from './ShakeDetector';
import ProfilerManager, {
  PERFORMANCE_PROFILER_TEST_IDS,
} from './ProfilerManager';

jest.mock('react-native-device-info', () => ({
  getBundleId: jest.fn(),
  getVersion: jest.fn(),
}));

jest.mock('react-native-release-profiler', () => ({
  startProfiling: jest.fn(),
  stopProfiling: jest.fn(),
}));

jest.mock('./ShakeDetector', () => jest.fn(() => null));

// Provide a local mock for RNFS so we can control paths and behaviors in tests
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/documents',
  exists: jest.fn(),
  copyFile: jest.fn(),
}));

describe('ProfilerManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('environment-based enabling', () => {
    it('enables profiler when enabled prop is true', () => {
      render(<ProfilerManager enabled />);

      expect(ShakeDetector).toHaveBeenCalled();
    });

    it('disables profiler when enabled prop is false', () => {
      const { toJSON } = render(<ProfilerManager enabled={false} />);

      expect(toJSON()).toBeNull();
      expect(ShakeDetector).not.toHaveBeenCalled();
    });

    it('disables profiler when enabled prop is undefined and no environment set', () => {
      const { toJSON } = render(<ProfilerManager />);

      expect(toJSON()).toBeNull();
      expect(ShakeDetector).not.toHaveBeenCalled();
    });
  });

  describe('forced enabling via props', () => {
    it('enables profiler when forced via props regardless of environment', () => {
      render(<ProfilerManager enabled />);

      expect(ShakeDetector).toHaveBeenCalled();
    });

    it('disables profiler when explicitly disabled via props', () => {
      const { toJSON } = render(<ProfilerManager enabled={false} />);

      expect(toJSON()).toBeNull();
      expect(ShakeDetector).not.toHaveBeenCalled();
    });
  });

  describe('performance test Appium controls', () => {
    it('hides Appium profiler controls when performanceTestControls is false', () => {
      const { queryByTestId } = render(
        <ProfilerManager enabled performanceTestControls={false} />,
      );

      expect(
        queryByTestId(PERFORMANCE_PROFILER_TEST_IDS.start),
      ).toBeNull();
      expect(queryByTestId(PERFORMANCE_PROFILER_TEST_IDS.stop)).toBeNull();
    });

    it('starts and stops profiling from Appium controls', async () => {
      const mockProfilePath = '/sdcard/Download/mock-profile.cpuprofile';
      (startProfiling as jest.Mock).mockResolvedValue(undefined);
      (stopProfiling as jest.Mock).mockResolvedValue(mockProfilePath);

      const { getByTestId, queryByTestId } = render(
        <ProfilerManager enabled performanceTestControls />,
      );

      expect(
        queryByTestId(PERFORMANCE_PROFILER_TEST_IDS.recordingReady),
      ).toBeNull();

      await act(async () => {
        fireEvent.press(getByTestId(PERFORMANCE_PROFILER_TEST_IDS.start));
      });

      expect(startProfiling).toHaveBeenCalledTimes(1);
      expect(
        getByTestId(PERFORMANCE_PROFILER_TEST_IDS.recordingReady),
      ).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByTestId(PERFORMANCE_PROFILER_TEST_IDS.stop));
      });

      expect(stopProfiling).toHaveBeenCalledWith(true);
      expect(
        queryByTestId(PERFORMANCE_PROFILER_TEST_IDS.recordingReady),
      ).toBeNull();
      expect(
        getByTestId(PERFORMANCE_PROFILER_TEST_IDS.resultReady),
      ).toBeTruthy();
      expect(
        getByTestId(PERFORMANCE_PROFILER_TEST_IDS.resultReady).props
          .accessibilityLabel,
      ).toBe(
        `${PERFORMANCE_PROFILER_TEST_IDS.resultReady}:${mockProfilePath}`,
      );
    });

    it('surfaces stop error when Appium stop is pressed without an active session', async () => {
      const { getByTestId } = render(
        <ProfilerManager enabled performanceTestControls />,
      );

      await act(async () => {
        fireEvent.press(getByTestId(PERFORMANCE_PROFILER_TEST_IDS.stop));
      });

      expect(getByTestId(PERFORMANCE_PROFILER_TEST_IDS.error)).toBeTruthy();
      expect(
        getByTestId(PERFORMANCE_PROFILER_TEST_IDS.error).props
          .accessibilityLabel,
      ).toContain('no active profiling session');
    });
  });

  describe('UI interactions and profiling flow', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('toggles visibility on shake and can be closed via the close button on iOS', async () => {
      Platform.OS = 'ios';
      const { queryByText, getByText, getByTestId } = render(
        <ProfilerManager enabled />,
      );
      expect(queryByText('Performance Profiler')).toBeNull();
      // Trigger shake
      const firstCallProps = (ShakeDetector as jest.Mock).mock.calls[0][0];
      act(() => {
        firstCallProps.onShake();
      });
      expect(getByText('Performance Profiler')).toBeTruthy();
      expect(getByText('Shake device to toggle this menu.')).toBeTruthy();
      expect(
        queryByText(
          'You can find the profiling file in the Android Downloads folder.',
        ),
      ).toBeFalsy();
      expect(getByText('Start')).toBeTruthy();
      expect(getByText('Export')).toBeTruthy();
      // Close via "x"
      fireEvent.press(getByTestId('close-profiler-button'));
      expect(queryByText('Performance Profiler')).toBeNull();
    });

    it('toggles visibility on shake and calls exportTrace when Export is pressed', async () => {
      Platform.OS = 'ios';
      const { queryByText, getByText } = render(<ProfilerManager enabled />);
      expect(queryByText('Performance Profiler')).toBeNull();

      const firstCallProps = (ShakeDetector as jest.Mock).mock.calls[0][0];
      act(() => {
        firstCallProps.onShake();
      });

      const mockProfilePath = '/tmp/mock-profile.cpuprofile';
      (startProfiling as jest.Mock).mockResolvedValue(undefined);
      (stopProfiling as jest.Mock).mockResolvedValue(mockProfilePath);
      (RNFS.exists as jest.Mock).mockResolvedValue(true);
      (RNFS.copyFile as jest.Mock).mockResolvedValue(undefined);
      jest.spyOn(Share, 'share').mockResolvedValue({
        action: Share.sharedAction,
      });

      await act(async () => {
        fireEvent.press(getByText('Start'));
      });
      await act(async () => {
        fireEvent.press(getByText('Stop'));
      });

      await act(async () => {
        fireEvent.press(getByText('Export'));
      });

      expect(RNFS.exists).toHaveBeenCalledWith(mockProfilePath);
      expect(RNFS.copyFile).toHaveBeenCalledWith(
        mockProfilePath,
        expect.stringMatching(/^\/documents\/.+\.cpuprofile$/),
      );
      expect(Share.share).toHaveBeenCalledWith({
        url: expect.stringMatching(/^file:\/\/\/documents\/.+\.cpuprofile$/),
      });
    });

    it('toggles visibility on shake and can be closed via the close button on Android', async () => {
      Platform.OS = 'android';
      const { queryByText, getByText, getByTestId } = render(
        <ProfilerManager enabled />,
      );
      expect(queryByText('Performance Profiler')).toBeNull();
      // Trigger shake
      const firstCallProps = (ShakeDetector as jest.Mock).mock.calls[0][0];
      act(() => {
        firstCallProps.onShake();
      });
      expect(getByText('Performance Profiler')).toBeTruthy();
      expect(
        getByText(
          'Shake device to toggle this menu. You can find the profiling file in the Android Downloads folder.',
        ),
      ).toBeTruthy();
      expect(getByText('Start')).toBeTruthy();
      expect(queryByText('Export')).toBeFalsy();
      // Close via "x"
      fireEvent.press(getByTestId('close-profiler-button'));
      expect(queryByText('Performance Profiler')).toBeNull();
    });
  });
});
