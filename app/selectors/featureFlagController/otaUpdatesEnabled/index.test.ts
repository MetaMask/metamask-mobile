import { selectOTAUpdatesEnabled } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { getVersion } from 'react-native-device-info';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
// eslint-disable-next-line import/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';
import { StateWithPartialEngine } from '../types';

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

const originalEnv = process.env;

describe('OTA Updates Feature Flag Selector (version-gated)', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
    (getVersion as jest.MockedFunction<typeof getVersion>).mockReturnValue(
      '1.0.0',
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    mockHasMinimumRequiredVersion?.mockRestore();
  });

  it('returns false when feature flag state is empty', () => {
    const result = selectOTAUpdatesEnabled(mockedEmptyFlagsState);

    expect(result).toBe(false);
  });

  it('returns false when RemoteFeatureFlagController state is undefined', () => {
    const result = selectOTAUpdatesEnabled(mockedUndefinedFlagsState);

    expect(result).toBe(false);
  });

  it.each`
    flagValue    | minimumVersion | result
    ${false}     | ${false}       | ${false}
    ${false}     | ${'0.0.0'}     | ${false}
    ${true}      | ${'1.0.0'}     | ${true}
    ${true}      | ${'0.0.0'}     | ${true}
    ${true}      | ${'2.0.0'}     | ${false}
    ${undefined} | ${'0.0.0'}     | ${false}
    ${undefined} | ${undefined}   | ${false}
    ${undefined} | ${'1.0.0'}     | ${false}
    ${undefined} | ${'1.0.0'}     | ${false}
  `(
    'returns $result when flagValue is $flagValue and minimumVersion is $minimumVersion',
    ({
      flagValue,
      minimumVersion,
      result,
    }: {
      flagValue: boolean | undefined;
      minimumVersion: string | undefined;
      result: boolean;
    }) => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                otaUpdatesEnabled: {
                  enabled: flagValue,
                  minimumVersion,
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      const isEnabled = selectOTAUpdatesEnabled(
        state as StateWithPartialEngine,
      );

      expect(isEnabled).toBe(result);
    },
  );
});
