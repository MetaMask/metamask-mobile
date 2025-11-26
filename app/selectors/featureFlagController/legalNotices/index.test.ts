import { selectIsPna25FlagEnabled } from '.';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';

// Helper function to create mock state with extensionUxPna25 flag
function mockStateWith(extensionUxPna25: boolean) {
  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          cacheTimestamp: 0,
          remoteFeatureFlags: {
            extensionUxPna25,
          } as unknown as FeatureFlags,
        },
      },
    },
  };
}

describe('selectIsPna25FlagEnabled', () => {
  it('returns true when extensionUxPna25 flag is true', () => {
    const mockedState = mockStateWith(true);

    const result = selectIsPna25FlagEnabled(mockedState);

    expect(result).toBe(true);
  });

  it('returns false when extensionUxPna25 flag is false', () => {
    const mockedState = mockStateWith(false);

    const result = selectIsPna25FlagEnabled(mockedState);

    expect(result).toBe(false);
  });

  it('returns false when extensionUxPna25 flag is undefined', () => {
    const result = selectIsPna25FlagEnabled(mockedUndefinedFlagsState);

    expect(result).toBe(false);
  });

  it('returns false when remoteFeatureFlags is empty', () => {
    const result = selectIsPna25FlagEnabled(mockedEmptyFlagsState);

    expect(result).toBe(false);
  });
});
