import { getFeatureFlagValue } from './env';

describe('getFeatureFlagValue', () => {
  it('should return true when envValue is "true" regardless of remoteValue', () => {
    expect(getFeatureFlagValue('true', false)).toBe(true);
    expect(getFeatureFlagValue('true', true)).toBe(true);
  });

  it('should return false when envValue is "false" regardless of remoteValue', () => {
    expect(getFeatureFlagValue('false', true)).toBe(false);
    expect(getFeatureFlagValue('false', false)).toBe(false);
  });

  it('should return remoteValue when envValue is undefined', () => {
    expect(getFeatureFlagValue(undefined, true)).toBe(true);
    expect(getFeatureFlagValue(undefined, false)).toBe(false);
  });

  it('should return remoteValue when envValue is any other string', () => {
    expect(getFeatureFlagValue('random', true)).toBe(true);
    expect(getFeatureFlagValue('random', false)).toBe(false);
    expect(getFeatureFlagValue('', true)).toBe(true);
    expect(getFeatureFlagValue('', false)).toBe(false);
  });
});
