import { selectTokenListLayoutV2Enabled } from '.';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

describe('selectTokenListLayoutV2Enabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it('returns true when flag is valid and enabled', () => {
    const result = selectTokenListLayoutV2Enabled.resultFunc({
      tokenListItemV2AbtestVersioned: {
        enabled: true,
        minimumVersion: '1.0.0',
      },
    });
    expect(result).toBe(true);
  });

  it('returns false when flag is valid but disabled', () => {
    const result = selectTokenListLayoutV2Enabled.resultFunc({
      tokenListItemV2AbtestVersioned: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when version check fails', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);
    const result = selectTokenListLayoutV2Enabled.resultFunc({
      tokenListItemV2AbtestVersioned: {
        enabled: true,
        minimumVersion: '99.0.0',
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when flag has invalid types', () => {
    const result = selectTokenListLayoutV2Enabled.resultFunc({
      tokenListItemV2AbtestVersioned: {
        enabled: 'invalid',
        minimumVersion: 123,
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when remote feature flags are empty', () => {
    const result = selectTokenListLayoutV2Enabled.resultFunc({});
    expect(result).toBe(false);
  });

  it('returns false when tokenListItemV2AbtestVersioned flag is missing', () => {
    const result = selectTokenListLayoutV2Enabled.resultFunc({
      someOtherFlag: true,
    });
    expect(result).toBe(false);
  });

  it('returns false when flag is a plain boolean (legacy shape)', () => {
    const result = selectTokenListLayoutV2Enabled.resultFunc({
      tokenListItemV2AbtestVersioned: true,
    });
    expect(result).toBe(false);
  });

  it('handles progressive rollout wrapper shape', () => {
    const result = selectTokenListLayoutV2Enabled.resultFunc({
      tokenListItemV2AbtestVersioned: {
        name: 'token-list-item-v2-abtest',
        value: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      },
    });
    expect(result).toBe(true);
  });
});
