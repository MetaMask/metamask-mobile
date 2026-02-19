import { selectTokenDetailsLayoutTestVariant } from '.';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.66.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

describe('selectTokenDetailsLayoutTestVariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it('returns "treatment" for a valid treatment flag', () => {
    const result = selectTokenDetailsLayoutTestVariant.resultFunc({
      tokenDetailsV2AbTest: {
        value: { variant: 'treatment', minimumVersion: '7.66.0' },
      },
    });
    expect(result).toBe('treatment');
  });

  it('returns "control" for a valid control flag', () => {
    const result = selectTokenDetailsLayoutTestVariant.resultFunc({
      tokenDetailsV2AbTest: {
        value: { variant: 'control', minimumVersion: '7.66.0' },
      },
    });
    expect(result).toBe('control');
  });

  it('returns null when version check fails', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);
    const result = selectTokenDetailsLayoutTestVariant.resultFunc({
      tokenDetailsV2AbTest: {
        value: { variant: 'treatment', minimumVersion: '99.0.0' },
      },
    });
    expect(result).toBeNull();
  });

  it('returns null when flag is missing', () => {
    const result = selectTokenDetailsLayoutTestVariant.resultFunc({});
    expect(result).toBeNull();
  });

  it('returns null when flag is null', () => {
    const result = selectTokenDetailsLayoutTestVariant.resultFunc({
      tokenDetailsV2AbTest: null,
    });
    expect(result).toBeNull();
  });

  it('returns null for an invalid variant string', () => {
    const result = selectTokenDetailsLayoutTestVariant.resultFunc({
      tokenDetailsV2AbTest: {
        value: { variant: 'unknown_variant', minimumVersion: '7.66.0' },
      },
    });
    expect(result).toBeNull();
  });

  it('returns null when variant is not a string', () => {
    const result = selectTokenDetailsLayoutTestVariant.resultFunc({
      tokenDetailsV2AbTest: {
        value: { variant: 123, minimumVersion: '7.66.0' },
      },
    });
    expect(result).toBeNull();
  });

  it('returns null when flag is a plain boolean', () => {
    const result = selectTokenDetailsLayoutTestVariant.resultFunc({
      tokenDetailsV2AbTest: true,
    });
    expect(result).toBeNull();
  });

  it('returns null when flag is a plain string', () => {
    const result = selectTokenDetailsLayoutTestVariant.resultFunc({
      tokenDetailsV2AbTest: 'treatment',
    });
    expect(result).toBeNull();
  });

  it('skips version check when minimumVersion is not a string', () => {
    const result = selectTokenDetailsLayoutTestVariant.resultFunc({
      tokenDetailsV2AbTest: {
        value: { variant: 'treatment', minimumVersion: 123 },
      },
    });
    expect(hasMinimumRequiredVersion).not.toHaveBeenCalled();
    expect(result).toBe('treatment');
  });

  it('returns variant when minimumVersion is absent', () => {
    const result = selectTokenDetailsLayoutTestVariant.resultFunc({
      tokenDetailsV2AbTest: {
        value: { variant: 'control' },
      },
    });
    expect(hasMinimumRequiredVersion).not.toHaveBeenCalled();
    expect(result).toBe('control');
  });

  it('returns null when value property is missing from flag object', () => {
    const result = selectTokenDetailsLayoutTestVariant.resultFunc({
      tokenDetailsV2AbTest: { name: 'Control is ON' },
    });
    expect(result).toBeNull();
  });
});
