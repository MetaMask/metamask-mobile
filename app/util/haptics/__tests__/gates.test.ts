import { Platform } from 'react-native';
import { shouldPlayHaptic, type HapticGateOptions } from '../gates';

describe('shouldPlayHaptic', () => {
  const enabledOptions: HapticGateOptions = {
    reducedHaptics: false,
    killSwitchActive: false,
  };

  it('returns true when all gates pass', () => {
    expect(shouldPlayHaptic(enabledOptions)).toBe(true);
  });

  it('returns false when reducedHaptics is true', () => {
    expect(shouldPlayHaptic({ ...enabledOptions, reducedHaptics: true })).toBe(
      false,
    );
  });

  it('returns false when killSwitchActive is true', () => {
    expect(
      shouldPlayHaptic({ ...enabledOptions, killSwitchActive: true }),
    ).toBe(false);
  });

  it('returns false when both reducedHaptics and killSwitchActive are true', () => {
    expect(
      shouldPlayHaptic({ reducedHaptics: true, killSwitchActive: true }),
    ).toBe(false);
  });

  it('returns false on web platform', () => {
    const originalOS = Platform.OS;
    Platform.OS = 'web' as typeof Platform.OS;
    try {
      expect(shouldPlayHaptic(enabledOptions)).toBe(false);
    } finally {
      Platform.OS = originalOS;
    }
  });

  it('returns true on ios platform when gates pass', () => {
    const originalOS = Platform.OS;
    Platform.OS = 'ios';
    try {
      expect(shouldPlayHaptic(enabledOptions)).toBe(true);
    } finally {
      Platform.OS = originalOS;
    }
  });

  it('returns true on android platform when gates pass', () => {
    const originalOS = Platform.OS;
    Platform.OS = 'android';
    try {
      expect(shouldPlayHaptic(enabledOptions)).toBe(true);
    } finally {
      Platform.OS = originalOS;
    }
  });
});
