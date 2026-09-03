import {
  selectTokenDetailsTechnicalIndicatorsEnabled,
  TOKEN_DETAILS_TECHNICAL_INDICATORS_FLAG_KEY,
} from '.';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.73.0'),
}));

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('selectTokenDetailsTechnicalIndicatorsEnabled', () => {
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

  it('exposes the LD flag key', () => {
    expect(TOKEN_DETAILS_TECHNICAL_INDICATORS_FLAG_KEY).toBe(
      'tokenDetailsTechnicalIndicators',
    );
  });

  it('returns true when enabled is true and minimum version passes', () => {
    const result = selectTokenDetailsTechnicalIndicatorsEnabled.resultFunc({
      [TOKEN_DETAILS_TECHNICAL_INDICATORS_FLAG_KEY]: {
        value: { enabled: true, minimumVersion: '7.73' },
      },
    });
    expect(result).toBe(true);
  });

  it('returns true for direct version-gated shape (no wrapper)', () => {
    const result = selectTokenDetailsTechnicalIndicatorsEnabled.resultFunc({
      [TOKEN_DETAILS_TECHNICAL_INDICATORS_FLAG_KEY]: {
        enabled: true,
        minimumVersion: '7.73',
      },
    });
    expect(result).toBe(true);
  });

  it('returns false when enabled is false', () => {
    const result = selectTokenDetailsTechnicalIndicatorsEnabled.resultFunc({
      [TOKEN_DETAILS_TECHNICAL_INDICATORS_FLAG_KEY]: {
        value: { enabled: false, minimumVersion: '7.73' },
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when minimum version requirement fails', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);
    const result = selectTokenDetailsTechnicalIndicatorsEnabled.resultFunc({
      [TOKEN_DETAILS_TECHNICAL_INDICATORS_FLAG_KEY]: {
        value: { enabled: true, minimumVersion: '99.0.0' },
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when flag is missing', () => {
    expect(selectTokenDetailsTechnicalIndicatorsEnabled.resultFunc({})).toBe(
      false,
    );
  });

  it('returns false for malformed payload', () => {
    const result = selectTokenDetailsTechnicalIndicatorsEnabled.resultFunc({
      [TOKEN_DETAILS_TECHNICAL_INDICATORS_FLAG_KEY]: {
        value: { variant: 'enabled', minimumVersion: '7.73' },
      },
    });
    expect(result).toBe(false);
  });
});
