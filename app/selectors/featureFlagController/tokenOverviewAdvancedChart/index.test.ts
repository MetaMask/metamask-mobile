import {
  selectTokenOverviewAdvancedChartEnabled,
  TOKEN_DETAILS_ADVANCED_CHARTS_FLAG_KEY,
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

describe('selectTokenOverviewAdvancedChartEnabled', () => {
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

  it('exposes the client-config flag key for registry alignment', () => {
    expect(TOKEN_DETAILS_ADVANCED_CHARTS_FLAG_KEY).toBe(
      'tokenDetailsAdvancedCharts',
    );
  });

  it('returns true when enabled is true and minimum version passes', () => {
    const result = selectTokenOverviewAdvancedChartEnabled.resultFunc({
      [TOKEN_DETAILS_ADVANCED_CHARTS_FLAG_KEY]: {
        value: { enabled: true, minimumVersion: '7.73' },
      },
    });
    expect(result).toBe(true);
  });

  it('returns true for direct version-gated shape (no wrapper)', () => {
    const result = selectTokenOverviewAdvancedChartEnabled.resultFunc({
      [TOKEN_DETAILS_ADVANCED_CHARTS_FLAG_KEY]: {
        enabled: true,
        minimumVersion: '7.73',
      },
    });
    expect(result).toBe(true);
  });

  it('returns false when enabled is false', () => {
    const result = selectTokenOverviewAdvancedChartEnabled.resultFunc({
      [TOKEN_DETAILS_ADVANCED_CHARTS_FLAG_KEY]: {
        value: { enabled: false, minimumVersion: '7.73' },
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when minimum version requirement fails', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);
    const result = selectTokenOverviewAdvancedChartEnabled.resultFunc({
      [TOKEN_DETAILS_ADVANCED_CHARTS_FLAG_KEY]: {
        value: { enabled: true, minimumVersion: '99.0.0' },
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when flag is missing', () => {
    expect(selectTokenOverviewAdvancedChartEnabled.resultFunc({})).toBe(false);
  });

  it('returns false for malformed payload', () => {
    const result = selectTokenOverviewAdvancedChartEnabled.resultFunc({
      [TOKEN_DETAILS_ADVANCED_CHARTS_FLAG_KEY]: {
        value: { variant: 'enabled', minimumVersion: '7.73' },
      },
    });
    expect(result).toBe(false);
  });
});
