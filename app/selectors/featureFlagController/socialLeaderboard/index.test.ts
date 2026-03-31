import { selectSocialLeaderboardEnabled } from '.';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.72.0'),
}));

describe('selectSocialLeaderboardEnabled', () => {
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

  it('returns true when remote flag is enabled and version requirement is met', () => {
    const result = selectSocialLeaderboardEnabled.resultFunc({
      aiSocialLeaderboardEnabled: { enabled: true, minimumVersion: '7.72.0' },
    });

    expect(result).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    const result = selectSocialLeaderboardEnabled.resultFunc({
      aiSocialLeaderboardEnabled: { enabled: false, minimumVersion: '7.72.0' },
    });

    expect(result).toBe(false);
  });

  it('returns false when version requirement is not met', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);
    const result = selectSocialLeaderboardEnabled.resultFunc({
      aiSocialLeaderboardEnabled: { enabled: true, minimumVersion: '99.0.0' },
    });

    expect(result).toBe(false);
  });

  it('returns false when remote flag is absent', () => {
    const result = selectSocialLeaderboardEnabled.resultFunc({});

    expect(result).toBe(false);
  });

  it('returns false when remote flag has an invalid shape', () => {
    const result = selectSocialLeaderboardEnabled.resultFunc({
      aiSocialLeaderboardEnabled: { enabled: 'invalid', minimumVersion: 123 },
    });

    expect(result).toBe(false);
  });
});
