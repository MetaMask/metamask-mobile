import { selectComplianceEnabled } from './compliance';
import { FeatureFlagNames } from '../../constants/featureFlags';
import { hasMinimumRequiredVersion } from '../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

describe('selectComplianceEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
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
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);

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

  it('returns true when boolean local override is true (aligns with init)', () => {
    const result = selectComplianceEnabled.resultFunc({
      [FeatureFlagNames.complianceEnabled]: true,
    });

    expect(result).toBe(true);
  });

  it('returns false when boolean local override is false (aligns with init)', () => {
    const result = selectComplianceEnabled.resultFunc({
      [FeatureFlagNames.complianceEnabled]: false,
    });

    expect(result).toBe(false);
  });
});
