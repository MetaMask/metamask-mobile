import { Json } from '@metamask/utils';
import { selectAssetsDefiPositionsV2Enabled } from '.';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

describe('Assets DeFi Positions V2 Feature Flag Selector', () => {
  describe('selectAssetsDefiPositionsV2Enabled', () => {
    it('returns true when remote flag is explicitly true', () => {
      const result = selectAssetsDefiPositionsV2Enabled.resultFunc({
        [FeatureFlagNames.assetsDefiPositionsV2Enabled]: true,
      });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is explicitly false', () => {
      const result = selectAssetsDefiPositionsV2Enabled.resultFunc({
        [FeatureFlagNames.assetsDefiPositionsV2Enabled]: false,
      });

      expect(result).toBe(false);
    });

    it('returns default value when remote flag is not set', () => {
      const result = selectAssetsDefiPositionsV2Enabled.resultFunc({});

      expect(result).toBe(
        DEFAULT_FEATURE_FLAG_VALUES[
          FeatureFlagNames.assetsDefiPositionsV2Enabled
        ],
      );
    });

    it('returns default value when remote flag is undefined', () => {
      const result = selectAssetsDefiPositionsV2Enabled.resultFunc({
        [FeatureFlagNames.assetsDefiPositionsV2Enabled]:
          undefined as unknown as Json,
      });

      expect(result).toBe(
        DEFAULT_FEATURE_FLAG_VALUES[
          FeatureFlagNames.assetsDefiPositionsV2Enabled
        ],
      );
    });
  });
});
