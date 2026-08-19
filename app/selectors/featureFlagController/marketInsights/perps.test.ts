import { selectMarketInsightsPerpsEnabled } from './perps';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('selectMarketInsightsPerpsEnabled', () => {
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
    const result = selectMarketInsightsPerpsEnabled.resultFunc({
      aiSocialMarketInsightsPerpsEnabled: {
        enabled: true,
        minimumVersion: '1.0.0',
      },
    });
    expect(result).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    const result = selectMarketInsightsPerpsEnabled.resultFunc({
      aiSocialMarketInsightsPerpsEnabled: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when version requirement is not met', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);
    const result = selectMarketInsightsPerpsEnabled.resultFunc({
      aiSocialMarketInsightsPerpsEnabled: {
        enabled: true,
        minimumVersion: '99.0.0',
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when remote flag is invalid', () => {
    const result = selectMarketInsightsPerpsEnabled.resultFunc({
      aiSocialMarketInsightsPerpsEnabled: {
        enabled: 'invalid',
        minimumVersion: 123,
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when remote feature flags are empty', () => {
    const result = selectMarketInsightsPerpsEnabled.resultFunc({});
    expect(result).toBe(false);
  });
});
