import { selectComplianceEnabled } from './compliance';
import { FeatureFlagNames } from '../../constants/featureFlags';
// eslint-disable-next-line import/no-namespace
import * as remoteFeatureFlagModule from '../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('selectComplianceEnabled', () => {
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

  it('returns true when remote flag is valid and enabled', () => {
    const result = selectComplianceEnabled.resultFunc({
      [FeatureFlagNames.complianceEnabled]: {
        enabled: true,
        minimumVersion: '1.0.0',
      },
    });

    expect(result).toBe(true);
  });

  it('returns false when remote flag is valid but disabled', () => {
    const result = selectComplianceEnabled.resultFunc({
      [FeatureFlagNames.complianceEnabled]: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when version check fails', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);

    const result = selectComplianceEnabled.resultFunc({
      [FeatureFlagNames.complianceEnabled]: {
        enabled: true,
        minimumVersion: '99.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when remote flag is invalid', () => {
    const result = selectComplianceEnabled.resultFunc({
      [FeatureFlagNames.complianceEnabled]: {
        enabled: 'invalid',
        minimumVersion: 123,
      } as unknown as { enabled: boolean; minimumVersion: string },
    });

    expect(result).toBe(false);
  });

  it('returns false when remote feature flags are empty', () => {
    const result = selectComplianceEnabled.resultFunc({});

    expect(result).toBe(false);
  });

  it('returns false when complianceEnabled property is missing', () => {
    const result = selectComplianceEnabled.resultFunc({
      someOtherFlag: true,
    });

    expect(result).toBe(false);
  });
});
