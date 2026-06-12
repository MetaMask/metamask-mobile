import { Json } from '@metamask/utils';
import { selectAddDeviceSyncEnabled } from '.';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

describe('Add Device Sync feature flag selector', () => {
  describe('selectAddDeviceSyncEnabled', () => {
    it('returns true when remote flag is explicitly true', () => {
      const result = selectAddDeviceSyncEnabled.resultFunc({
        [FeatureFlagNames.addDeviceSyncEnabled]: true,
      });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is explicitly false', () => {
      const result = selectAddDeviceSyncEnabled.resultFunc({
        [FeatureFlagNames.addDeviceSyncEnabled]: false,
      });

      expect(result).toBe(false);
    });

    it('returns default value when remote flag is not set', () => {
      const result = selectAddDeviceSyncEnabled.resultFunc({});

      expect(result).toBe(
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.addDeviceSyncEnabled],
      );
    });

    it('returns default value when remote flag is undefined', () => {
      const result = selectAddDeviceSyncEnabled.resultFunc({
        [FeatureFlagNames.addDeviceSyncEnabled]: undefined as unknown as Json,
      });

      expect(result).toBe(
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.addDeviceSyncEnabled],
      );
    });
  });
});
