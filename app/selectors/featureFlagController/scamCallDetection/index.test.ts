import { selectScamCallDetectionEnabled } from '.';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';

const mockedStateWithScamCallDetectionEnabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          scamCallDetectionEnabled: true,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithScamCallDetectionDisabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          scamCallDetectionEnabled: false,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithoutScamCallDetectionFlag = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          someOtherFlag: true,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

describe('Scam Call Detection Feature Flag Selector', () => {
  it('returns true when scamCallDetectionEnabled is true', () => {
    const result = selectScamCallDetectionEnabled(
      mockedStateWithScamCallDetectionEnabled,
    );
    expect(result).toBe(true);
  });

  it('returns false when scamCallDetectionEnabled is explicitly false', () => {
    const result = selectScamCallDetectionEnabled(
      mockedStateWithScamCallDetectionDisabled,
    );
    expect(result).toBe(false);
  });

  it('returns false when scamCallDetectionEnabled flag is missing', () => {
    const result = selectScamCallDetectionEnabled(
      mockedStateWithoutScamCallDetectionFlag,
    );
    expect(result).toBe(false);
  });

  it('returns false when feature flag state is empty', () => {
    const result = selectScamCallDetectionEnabled(mockedEmptyFlagsState);
    expect(result).toBe(false);
  });

  it('returns false when RemoteFeatureFlagController state is undefined', () => {
    const result = selectScamCallDetectionEnabled(mockedUndefinedFlagsState);
    expect(result).toBe(false);
  });
});
