import { selectRampsUnifiedBuyV2Enabled } from './rampsUnifiedBuyV2';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('selectRampsUnifiedBuyV2Enabled', () => {
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
    const result = selectRampsUnifiedBuyV2Enabled.resultFunc({
      rampsUnifiedBuyV2: {
        enabled: true,
        minimumVersion: '1.0.0',
      },
    });
    expect(result).toBe(true);
  });

  it('returns false when remote flag is valid but disabled', () => {
    const result = selectRampsUnifiedBuyV2Enabled.resultFunc({
      rampsUnifiedBuyV2: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when version check fails', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);
    const result = selectRampsUnifiedBuyV2Enabled.resultFunc({
      rampsUnifiedBuyV2: {
        enabled: true,
        minimumVersion: '99.0.0',
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when remote flag is invalid', () => {
    const result = selectRampsUnifiedBuyV2Enabled.resultFunc({
      rampsUnifiedBuyV2: {
        enabled: 'invalid',
        minimumVersion: 123,
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when remote feature flags are empty', () => {
    const result = selectRampsUnifiedBuyV2Enabled.resultFunc({});
    expect(result).toBe(false);
  });

  it('returns false when rampsUnifiedBuyV2 is null', () => {
    const result = selectRampsUnifiedBuyV2Enabled.resultFunc({
      rampsUnifiedBuyV2: null,
    });
    expect(result).toBe(false);
  });
});
