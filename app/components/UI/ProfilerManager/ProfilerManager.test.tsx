import React from 'react';
import { render } from '@testing-library/react-native';
import ProfilerManager from './ProfilerManager';
import ShakeDetector from './ShakeDetector';

jest.mock('react-native-device-info', () => ({
  getBundleId: jest.fn(),
  getVersion: jest.fn(),
}));

jest.mock('react-native-release-profiler', () => ({
  startProfiling: jest.fn(),
  stopProfiling: jest.fn(),
}));

jest.mock('./ShakeDetector', () => jest.fn(() => null));

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
});
