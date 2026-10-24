import { selectSocialPostTranslationEnabled } from '.';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.72.0'),
}));

describe('selectSocialPostTranslationEnabled', () => {
  const originalEnv = process.env.MM_SOCIAL_POST_TRANSLATION_ENABLED;
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MM_SOCIAL_POST_TRANSLATION_ENABLED;
    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  afterEach(() => {
    mockHasMinimumRequiredVersion.mockRestore();
    if (originalEnv === undefined) {
      delete process.env.MM_SOCIAL_POST_TRANSLATION_ENABLED;
    } else {
      process.env.MM_SOCIAL_POST_TRANSLATION_ENABLED = originalEnv;
    }
  });

  it('returns true when the remote flag is enabled and the version matches', () => {
    const result = selectSocialPostTranslationEnabled.resultFunc(
      {
        socialPostTranslationEnabled: {
          enabled: true,
          minimumVersion: '7.72.0',
        },
      },
      false,
    );

    expect(result).toBe(true);
  });

  it('returns false when the remote flag is disabled', () => {
    const result = selectSocialPostTranslationEnabled.resultFunc(
      {
        socialPostTranslationEnabled: {
          enabled: false,
          minimumVersion: '7.72.0',
        },
      },
      false,
    );

    expect(result).toBe(false);
  });

  it('returns false when the version requirement is not met', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);

    const result = selectSocialPostTranslationEnabled.resultFunc(
      {
        socialPostTranslationEnabled: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      },
      false,
    );

    expect(result).toBe(false);
  });

  it('returns false when the remote flag is absent', () => {
    const result = selectSocialPostTranslationEnabled.resultFunc({}, false);

    expect(result).toBe(false);
  });

  it('returns false when the remote flag has an unexpected shape', () => {
    const result = selectSocialPostTranslationEnabled.resultFunc(
      {
        socialPostTranslationEnabled: { enabled: 'yes', minimumVersion: 1 },
      },
      false,
    );

    expect(result).toBe(false);
  });

  it('uses the env fallback when the remote flag is absent', () => {
    process.env.MM_SOCIAL_POST_TRANSLATION_ENABLED = 'true';

    const result = selectSocialPostTranslationEnabled.resultFunc(
      {},
      process.env.MM_SOCIAL_POST_TRANSLATION_ENABLED === 'true',
    );

    expect(result).toBe(true);
  });
});
