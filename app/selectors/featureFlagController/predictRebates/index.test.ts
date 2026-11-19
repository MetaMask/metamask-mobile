import { selectPredictRebatesEnabled } from '.';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('selectPredictRebatesEnabled', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasMinimumRequiredVersion = jest
      .spyOn(remoteFeatureFlagModule, 'hasMinimumRequiredVersion')
      .mockReturnValue(true);
  });

  afterEach(() => {
    mockHasMinimumRequiredVersion.mockRestore();
  });

  it('returns true for an enabled flag that meets the version requirement', () => {
    const result = selectPredictRebatesEnabled.resultFunc({
      predictRebatesEnabled: {
        enabled: true,
        minimumVersion: '1.0.0',
      },
    });

    expect(result).toBe(true);
  });

  it('returns false for a disabled flag', () => {
    const result = selectPredictRebatesEnabled.resultFunc({
      predictRebatesEnabled: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when the version requirement is not met', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);

    const result = selectPredictRebatesEnabled.resultFunc({
      predictRebatesEnabled: {
        enabled: true,
        minimumVersion: '99.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false for an invalid flag', () => {
    const result = selectPredictRebatesEnabled.resultFunc({
      predictRebatesEnabled: {
        enabled: 'invalid',
        minimumVersion: 123,
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when the flag is missing', () => {
    const result = selectPredictRebatesEnabled.resultFunc({});

    expect(result).toBe(false);
  });
});
