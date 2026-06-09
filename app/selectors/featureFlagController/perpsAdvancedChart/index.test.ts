import { selectPerpsAdvancedChartEnabledFlag } from '.';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('selectPerpsAdvancedChartEnabledFlag', () => {
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

  it('returns false by default when no remote flag is set', () => {
    const result = selectPerpsAdvancedChartEnabledFlag.resultFunc({});
    expect(result).toBe(false);
  });

  it('returns true when remote flag is enabled and version requirement is met', () => {
    const result = selectPerpsAdvancedChartEnabledFlag.resultFunc({
      perpsAdvancedChartEnabled: { enabled: true, minimumVersion: '1.0.0' },
    });
    expect(result).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    const result = selectPerpsAdvancedChartEnabledFlag.resultFunc({
      perpsAdvancedChartEnabled: { enabled: false, minimumVersion: '1.0.0' },
    });
    expect(result).toBe(false);
  });

  it('returns false when version requirement is not met', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);
    const result = selectPerpsAdvancedChartEnabledFlag.resultFunc({
      perpsAdvancedChartEnabled: { enabled: true, minimumVersion: '99.0.0' },
    });
    expect(result).toBe(false);
  });

  it('returns false when remote flag is invalid', () => {
    const result = selectPerpsAdvancedChartEnabledFlag.resultFunc({
      perpsAdvancedChartEnabled: { enabled: 'invalid', minimumVersion: 123 },
    });
    expect(result).toBe(false);
  });

  it('returns false when remote feature flags are empty', () => {
    const result = selectPerpsAdvancedChartEnabledFlag.resultFunc({});
    expect(result).toBe(false);
  });
});
