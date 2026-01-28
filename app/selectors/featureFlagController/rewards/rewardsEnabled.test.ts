import {
  selectRewardsEnabledRawFlag,
  selectRewardsEnabledFlag,
  selectMusdHoldingEnabledRawFlag,
  selectMusdHoldingEnabledFlag,
  selectBitcoinRewardsEnabledRawFlag,
  selectBitcoinRewardsEnabledFlag,
  selectTronRewardsEnabledRawFlag,
  selectTronRewardsEnabledFlag,
  REWARDS_ENABLED_FLAG_NAME,
  MUSD_HOLDING_FLAG_NAME,
  BITCOIN_REWARDS_FLAG_NAME,
  TRON_REWARDS_FLAG_NAME,
} from './rewardsEnabled';
// eslint-disable-next-line import/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('Rewards Enabled Feature Flag Selectors', () => {
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

  describe('selectRewardsEnabledRawFlag', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectRewardsEnabledRawFlag.resultFunc({
        [REWARDS_ENABLED_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectRewardsEnabledRawFlag.resultFunc({
        [REWARDS_ENABLED_FLAG_NAME]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);

      const result = selectRewardsEnabledRawFlag.resultFunc({
        [REWARDS_ENABLED_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectRewardsEnabledRawFlag.resultFunc({
        [REWARDS_ENABLED_FLAG_NAME]: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectRewardsEnabledRawFlag.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when flag property is missing', () => {
      const result = selectRewardsEnabledRawFlag.resultFunc({
        someOtherFlag: true,
      });

      expect(result).toBe(false);
    });
  });

  describe('selectRewardsEnabledFlag', () => {
    it('returns true when basic functionality is enabled and raw flag is true', () => {
      const result = selectRewardsEnabledFlag.resultFunc(true, true);

      expect(result).toBe(true);
    });

    it('returns false when basic functionality is enabled and raw flag is false', () => {
      const result = selectRewardsEnabledFlag.resultFunc(true, false);

      expect(result).toBe(false);
    });

    it('returns false when basic functionality is disabled even if raw flag is true', () => {
      const result = selectRewardsEnabledFlag.resultFunc(false, true);

      expect(result).toBe(false);
    });

    it('returns false when basic functionality is disabled and raw flag is false', () => {
      const result = selectRewardsEnabledFlag.resultFunc(false, false);

      expect(result).toBe(false);
    });
  });

  describe('selectMusdHoldingEnabledRawFlag', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectMusdHoldingEnabledRawFlag.resultFunc({
        [MUSD_HOLDING_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectMusdHoldingEnabledRawFlag.resultFunc({
        [MUSD_HOLDING_FLAG_NAME]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);

      const result = selectMusdHoldingEnabledRawFlag.resultFunc({
        [MUSD_HOLDING_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectMusdHoldingEnabledRawFlag.resultFunc({
        [MUSD_HOLDING_FLAG_NAME]: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectMusdHoldingEnabledRawFlag.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when flag property is missing', () => {
      const result = selectMusdHoldingEnabledRawFlag.resultFunc({
        someOtherFlag: true,
      });

      expect(result).toBe(false);
    });
  });

  describe('selectMusdHoldingEnabledFlag', () => {
    it('returns true when basic functionality is enabled and raw flag is true', () => {
      const result = selectMusdHoldingEnabledFlag.resultFunc(true, true);

      expect(result).toBe(true);
    });

    it('returns false when basic functionality is enabled and raw flag is false', () => {
      const result = selectMusdHoldingEnabledFlag.resultFunc(true, false);

      expect(result).toBe(false);
    });

    it('returns false when basic functionality is disabled even if raw flag is true', () => {
      const result = selectMusdHoldingEnabledFlag.resultFunc(false, true);

      expect(result).toBe(false);
    });

    it('returns false when basic functionality is disabled and raw flag is false', () => {
      const result = selectMusdHoldingEnabledFlag.resultFunc(false, false);

      expect(result).toBe(false);
    });
  });

  describe('selectBitcoinRewardsEnabledRawFlag', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectBitcoinRewardsEnabledRawFlag.resultFunc({
        [BITCOIN_REWARDS_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectBitcoinRewardsEnabledRawFlag.resultFunc({
        [BITCOIN_REWARDS_FLAG_NAME]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);

      const result = selectBitcoinRewardsEnabledRawFlag.resultFunc({
        [BITCOIN_REWARDS_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectBitcoinRewardsEnabledRawFlag.resultFunc({
        [BITCOIN_REWARDS_FLAG_NAME]: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectBitcoinRewardsEnabledRawFlag.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when flag property is missing', () => {
      const result = selectBitcoinRewardsEnabledRawFlag.resultFunc({
        someOtherFlag: true,
      });

      expect(result).toBe(false);
    });
  });

  describe('selectBitcoinRewardsEnabledFlag', () => {
    it('returns true when basic functionality is enabled and raw flag is true', () => {
      const result = selectBitcoinRewardsEnabledFlag.resultFunc(true, true);

      expect(result).toBe(true);
    });

    it('returns false when basic functionality is enabled and raw flag is false', () => {
      const result = selectBitcoinRewardsEnabledFlag.resultFunc(true, false);

      expect(result).toBe(false);
    });

    it('returns false when basic functionality is disabled even if raw flag is true', () => {
      const result = selectBitcoinRewardsEnabledFlag.resultFunc(false, true);

      expect(result).toBe(false);
    });

    it('returns false when basic functionality is disabled and raw flag is false', () => {
      const result = selectBitcoinRewardsEnabledFlag.resultFunc(false, false);

      expect(result).toBe(false);
    });
  });

  describe('selectTronRewardsEnabledRawFlag', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectTronRewardsEnabledRawFlag.resultFunc({
        [TRON_REWARDS_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectTronRewardsEnabledRawFlag.resultFunc({
        [TRON_REWARDS_FLAG_NAME]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);

      const result = selectTronRewardsEnabledRawFlag.resultFunc({
        [TRON_REWARDS_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectTronRewardsEnabledRawFlag.resultFunc({
        [TRON_REWARDS_FLAG_NAME]: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectTronRewardsEnabledRawFlag.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when flag property is missing', () => {
      const result = selectTronRewardsEnabledRawFlag.resultFunc({
        someOtherFlag: true,
      });

      expect(result).toBe(false);
    });
  });

  describe('selectTronRewardsEnabledFlag', () => {
    it('returns true when basic functionality is enabled and raw flag is true', () => {
      const result = selectTronRewardsEnabledFlag.resultFunc(true, true);

      expect(result).toBe(true);
    });

    it('returns false when basic functionality is enabled and raw flag is false', () => {
      const result = selectTronRewardsEnabledFlag.resultFunc(true, false);

      expect(result).toBe(false);
    });

    it('returns false when basic functionality is disabled even if raw flag is true', () => {
      const result = selectTronRewardsEnabledFlag.resultFunc(false, true);

      expect(result).toBe(false);
    });

    it('returns false when basic functionality is disabled and raw flag is false', () => {
      const result = selectTronRewardsEnabledFlag.resultFunc(false, false);

      expect(result).toBe(false);
    });
  });
});
