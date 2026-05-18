import { selectExploreSearchV2EnabledFlag } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.79.0'),
}));

describe('Explore Search V2 feature flag selector', () => {
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

  it('returns true when flag is enabled and version requirement is met', () => {
    const result = selectExploreSearchV2EnabledFlag.resultFunc({
      exploreSearchV2Enabled: { enabled: true, minimumVersion: '7.79.0' },
    });
    expect(result).toBe(true);
  });

  it('returns false when flag is disabled', () => {
    const result = selectExploreSearchV2EnabledFlag.resultFunc({
      exploreSearchV2Enabled: { enabled: false, minimumVersion: '7.79.0' },
    });
    expect(result).toBe(false);
  });

  it('returns false when version requirement is not met', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);
    const result = selectExploreSearchV2EnabledFlag.resultFunc({
      exploreSearchV2Enabled: { enabled: true, minimumVersion: '99.0.0' },
    });
    expect(result).toBe(false);
  });

  it('returns false when flag is missing', () => {
    const result = selectExploreSearchV2EnabledFlag.resultFunc({});
    expect(result).toBe(false);
  });

  it('returns false when flag has an invalid shape', () => {
    const result = selectExploreSearchV2EnabledFlag.resultFunc({
      exploreSearchV2Enabled: true,
    });
    expect(result).toBe(false);
  });
});
