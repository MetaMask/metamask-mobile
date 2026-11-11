import { Platform } from 'react-native';
import { needsLegacyApplePay } from './needsLegacyApplePay';

describe('needsLegacyApplePay', () => {
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  const setPlatform = (os: typeof Platform.OS, version: string | number) => {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    Object.defineProperty(Platform, 'Version', {
      value: version,
      configurable: true,
    });
  };

  afterEach(() => {
    setPlatform(originalOS, originalVersion);
  });

  it.each([
    ['15.1', true],
    ['15.8.3', true],
    ['16.0', false],
    ['17.5', false],
    ['18.2', false],
  ])('returns %s -> %s on iOS', (version, expected) => {
    setPlatform('ios', version);

    expect(needsLegacyApplePay()).toBe(expected);
  });

  it('returns false on Android regardless of version', () => {
    setPlatform('android', 30);

    expect(needsLegacyApplePay()).toBe(false);
  });
});
