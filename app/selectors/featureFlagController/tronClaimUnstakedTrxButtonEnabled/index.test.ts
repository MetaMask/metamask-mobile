import { Json } from '@metamask/utils';
import { selectTronClaimUnstakedTrxButtonEnabled } from '.';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

describe('Tron claim unstaked TRX button enabled feature flag selector', () => {
  describe('selectTronClaimUnstakedTrxButtonEnabled', () => {
    it('returns true when remote flag is explicitly true', () => {
      const result = selectTronClaimUnstakedTrxButtonEnabled.resultFunc({
        [FeatureFlagNames.tronClaimUnstakedTrxButtonEnabled]: true,
      });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is explicitly false', () => {
      const result = selectTronClaimUnstakedTrxButtonEnabled.resultFunc({
        [FeatureFlagNames.tronClaimUnstakedTrxButtonEnabled]: false,
      });

      expect(result).toBe(false);
    });

    it('returns default value when remote flag is not set', () => {
      const result = selectTronClaimUnstakedTrxButtonEnabled.resultFunc({});

      expect(result).toBe(
        DEFAULT_FEATURE_FLAG_VALUES[
          FeatureFlagNames.tronClaimUnstakedTrxButtonEnabled
        ],
      );
    });

    it('returns default value when remote flag is undefined', () => {
      const result = selectTronClaimUnstakedTrxButtonEnabled.resultFunc({
        [FeatureFlagNames.tronClaimUnstakedTrxButtonEnabled]:
          undefined as unknown as Json,
      });

      expect(result).toBe(
        DEFAULT_FEATURE_FLAG_VALUES[
          FeatureFlagNames.tronClaimUnstakedTrxButtonEnabled
        ],
      );
    });
  });
});
