import { Json } from '@metamask/utils';
import { selectAssetsDefiPositionsEnabled } from '.';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

describe('Assets DeFi Positions Feature Flag Selector', () => {
  describe('selectAssetsDefiPositionsEnabled', () => {
    it('returns true when remote flag is explicitly true', () => {
      const result = selectAssetsDefiPositionsEnabled.resultFunc({
        [FeatureFlagNames.assetsDefiPositionsEnabled]: true,
      });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is explicitly false', () => {
      const result = selectAssetsDefiPositionsEnabled.resultFunc({
        [FeatureFlagNames.assetsDefiPositionsEnabled]: false,
      });

      expect(result).toBe(false);
    });

    it('returns default value when remote flag is not set', () => {
      const result = selectAssetsDefiPositionsEnabled.resultFunc({});

      expect(result).toBe(
        DEFAULT_FEATURE_FLAG_VALUES[
          FeatureFlagNames.assetsDefiPositionsEnabled
        ],
      );
    });

    it('returns default value when remote flag is undefined', () => {
      const result = selectAssetsDefiPositionsEnabled.resultFunc({
        [FeatureFlagNames.assetsDefiPositionsEnabled]:
          undefined as unknown as Json,
      });

      expect(result).toBe(
        DEFAULT_FEATURE_FLAG_VALUES[
          FeatureFlagNames.assetsDefiPositionsEnabled
        ],
      );
    });
  });
});
