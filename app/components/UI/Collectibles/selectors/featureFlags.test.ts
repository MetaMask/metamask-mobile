import { selectCollectiblesEnabledFlag } from './featureFlags';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('8.23.0'),
}));

jest.mock(
  '../../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('selectCollectiblesEnabledFlag', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  afterEach(() => {
    mockHasMinimumRequiredVersion?.mockRestore();
  });

  it.each([
    [
      'enabled with version met',
      { collectiblesEnabled: { enabled: true, minimumVersion: '8.0.0' } },
      true,
      true,
    ],
    [
      'disabled',
      { collectiblesEnabled: { enabled: false, minimumVersion: '8.0.0' } },
      true,
      false,
    ],
    [
      'version not met',
      { collectiblesEnabled: { enabled: true, minimumVersion: '999.0.0' } },
      false,
      false,
    ],
    ['missing', {}, true, false],
    ['invalid', { collectiblesEnabled: 'invalid' }, true, false],
  ])('returns %s: %s', (_description, remoteFlags, versionMet, expected) => {
    mockHasMinimumRequiredVersion.mockReturnValue(versionMet);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = selectCollectiblesEnabledFlag.resultFunc(remoteFlags as any);
    expect(result).toBe(expected);
  });
});
