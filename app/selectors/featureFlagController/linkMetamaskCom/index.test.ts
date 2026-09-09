import { getVersion } from 'react-native-device-info';
import type { Json } from '@metamask/utils';
import { selectLinkMetamaskComEnabled } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

const createState = (flag: Json) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          [FeatureFlagNames.linkMetamaskComEnabled]: flag,
        },
        cacheTimestamp: 0,
      },
    },
  },
});

describe('link.metamask.com feature flag selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getVersion as jest.MockedFunction<typeof getVersion>).mockReturnValue(
      '1.0.0',
    );
  });

  it('returns true when enabled and the minimum version requirement passes', () => {
    const state = createState({
      enabled: true,
      minimumVersion: '1.0.0',
    });

    const result = selectLinkMetamaskComEnabled(state);

    expect(result).toBe(true);
  });

  it('returns false when the minimum version requirement fails', () => {
    const state = createState({
      enabled: true,
      minimumVersion: '99.0.0',
    });

    const result = selectLinkMetamaskComEnabled(state);

    expect(result).toBe(false);
  });

  it('returns false when the flag is disabled', () => {
    const state = createState({
      enabled: false,
      minimumVersion: '0.0.0',
    });

    const result = selectLinkMetamaskComEnabled(state);

    expect(result).toBe(false);
  });

  it('returns false when feature flags are empty', () => {
    const result = selectLinkMetamaskComEnabled(mockedEmptyFlagsState);

    expect(result).toBe(false);
  });

  it('returns false when feature flag state is undefined', () => {
    const result = selectLinkMetamaskComEnabled(mockedUndefinedFlagsState);

    expect(result).toBe(false);
  });

  it.each([
    [true, true],
    [false, false],
  ])('returns %s for a %s boolean override', (flag, expected) => {
    const state = createState(flag);

    const result = selectLinkMetamaskComEnabled(state);

    expect(result).toBe(expected);
  });

  it('returns false when the flag shape is invalid', () => {
    const state = createState({
      enabled: 'true',
      minimumVersion: 100,
    });

    const result = selectLinkMetamaskComEnabled(state);

    expect(result).toBe(false);
  });
});
