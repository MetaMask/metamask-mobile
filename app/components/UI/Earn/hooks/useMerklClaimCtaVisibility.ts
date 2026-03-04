import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { TokenI } from '../../Tokens/types';
import { type MerklClaimData } from '../components/MerklRewards/hooks/useMerklBonusClaim';
import { isTokenEligibleForMerklRewards } from '../components/MerklRewards/hooks/useMerklRewards';
import { selectMerklCampaignClaimingEnabledFlag } from '../selectors/featureFlags';
import { useMusdConversionEligibility } from './useMusdConversionEligibility';

/**
 * Hook exposing a helper that decides whether to show the "Claim bonus" Merkl CTA.
 *
 * Centralizes CTA visibility logic by checking:
 * 1. Feature flag (Merkl campaign claiming enabled)
 * 2. Geo-eligibility (user is not in a blocked region)
 * 3. Token eligibility (asset is in the Merkl-eligible token list)
 * 4. Claimable reward exists
 * 5. No pending claim in flight
 *
 * Separated from `useMusdCtaVisibility` to avoid turning it into a
 * god hook with too many subscriptions.
 *
 * @returns Object containing shouldShowBonusClaimCta function
 */
export const useMerklClaimCtaVisibility = () => {
  const isMerklCampaignClaimingEnabled = useSelector(
    selectMerklCampaignClaimingEnabledFlag,
  );
  const { isEligible: isGeoEligible } = useMusdConversionEligibility();

  const shouldShowBonusClaimCta = useCallback(
    (asset?: TokenI, merklClaimData?: MerklClaimData): boolean => {
      if (!isMerklCampaignClaimingEnabled) {
        return false;
      }

      if (!isGeoEligible) {
        return false;
      }

      if (!asset?.chainId || !asset?.address) {
        return false;
      }

      if (
        !isTokenEligibleForMerklRewards(
          asset.chainId as Hex,
          asset.address as Hex | undefined,
        )
      ) {
        return false;
      }

      if (!merklClaimData?.claimableReward) {
        return false;
      }

      if (merklClaimData.hasPendingClaim) {
        return false;
      }

      return true;
    },
    [isMerklCampaignClaimingEnabled, isGeoEligible],
  );

  return { shouldShowBonusClaimCta };
};
