import { selectAiSocialGifApiEnabled } from '.';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('8.19.0'),
}));

describe('selectAiSocialGifApiEnabled', () => {
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
    mockHasMinimumRequiredVersion.mockRestore();
  });

  it('returns true when the remote flag is enabled and the version requirement is met', () => {
    const result = selectAiSocialGifApiEnabled.resultFunc({
      aiSocialGifApi: {
        enabled: true,
        minimumVersion: '8.19.0',
      },
    });

    expect(result).toBe(true);
  });

  it('returns false when the remote flag is disabled', () => {
    const result = selectAiSocialGifApiEnabled.resultFunc({
      aiSocialGifApi: {
        enabled: false,
        minimumVersion: '8.19.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when the version requirement is not met', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);

    const result = selectAiSocialGifApiEnabled.resultFunc({
      aiSocialGifApi: {
        enabled: true,
        minimumVersion: '99.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when the remote flag is absent', () => {
    const result = selectAiSocialGifApiEnabled.resultFunc({});

    expect(result).toBe(false);
  });

  it('returns false when the remote flag has an unexpected shape', () => {
    const result = selectAiSocialGifApiEnabled.resultFunc({
      aiSocialGifApi: {
        enabled: 'invalid',
        minimumVersion: 123,
      },
    });

    expect(result).toBe(false);
  });
});
