import { selectSwapsLimitOrdersEnabled } from './index';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('selectSwapsLimitOrdersEnabled', () => {
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

  it('returns true for an enabled flag that meets the minimum version', () => {
    expect(
      selectSwapsLimitOrdersEnabled.resultFunc({
        swapsLimitOrders: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      }),
    ).toBe(true);
  });

  it('supports the progressive rollout flag shape', () => {
    expect(
      selectSwapsLimitOrdersEnabled.resultFunc({
        swapsLimitOrders: {
          value: {
            enabled: true,
            minimumVersion: '1.0.0',
          },
        },
      }),
    ).toBe(true);
  });

  it('returns false for a disabled flag', () => {
    expect(
      selectSwapsLimitOrdersEnabled.resultFunc({
        swapsLimitOrders: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      }),
    ).toBe(false);
  });

  it('returns false when the minimum version is not met', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);

    expect(
      selectSwapsLimitOrdersEnabled.resultFunc({
        swapsLimitOrders: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      }),
    ).toBe(false);
  });

  it('returns false for a malformed or missing flag', () => {
    expect(selectSwapsLimitOrdersEnabled.resultFunc({})).toBe(false);
    expect(
      selectSwapsLimitOrdersEnabled.resultFunc({
        swapsLimitOrders: {
          enabled: 'true',
          minimumVersion: 1,
        },
      }),
    ).toBe(false);
  });
});
