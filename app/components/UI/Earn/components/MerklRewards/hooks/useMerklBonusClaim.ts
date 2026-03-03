import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { TokenI } from '../../../../Tokens/types';
import {
  useMerklRewards,
  isTokenEligibleForMerklRewards,
} from './useMerklRewards';
import { usePendingMerklClaim } from './usePendingMerklClaim';
import { useMerklClaim } from './useMerklClaim';
import {
  DEFAULT_MERKL_CLAIM_DATA,
  type MerklClaimData,
} from './MerklClaimHandler';
import { selectMerklCampaignClaimingEnabledFlag } from '../../../selectors/featureFlags';
import { useMusdConversionEligibility } from '../../../hooks/useMusdConversionEligibility';

/**
 * Composing hook that replaces the MerklClaimHandler headless component pattern.
 *
 * Combines `useMerklRewards`, `usePendingMerklClaim`, and `useMerklClaim`
 * into a single hook that can be called unconditionally in token list items.
 *
 * For ineligible or geo-blocked assets, `undefined` is passed to the underlying
 * hooks which causes them to no-op (no API calls, no side effects).
 *
 * @param asset - The token to check for Merkl bonus claim eligibility
 * @returns MerklClaimData with claim state and actions
 */
export const useMerklBonusClaim = (
  asset: TokenI | undefined,
): MerklClaimData => {
  const isMerklCampaignClaimingEnabled = useSelector(
    selectMerklCampaignClaimingEnabledFlag,
  );
  const { isEligible: isGeoEligible } = useMusdConversionEligibility();

  const isEligible = useMemo(() => {
    if (!isMerklCampaignClaimingEnabled || !isGeoEligible) {
      return false;
    }
    if (!asset?.chainId || !asset?.address) {
      return false;
    }
    return isTokenEligibleForMerklRewards(
      asset.chainId as Hex,
      asset.address as Hex | undefined,
    );
  }, [
    isMerklCampaignClaimingEnabled,
    isGeoEligible,
    asset?.chainId,
    asset?.address,
  ]);

  const eligibleAsset = isEligible ? asset : undefined;

  const { claimableReward } = useMerklRewards({ asset: eligibleAsset });
  const { hasPendingClaim } = usePendingMerklClaim();
  const { claimRewards, isClaiming } = useMerklClaim(eligibleAsset);

  return useMemo(() => {
    if (!isEligible) {
      return DEFAULT_MERKL_CLAIM_DATA;
    }

    return {
      claimableReward,
      hasPendingClaim,
      claimRewards,
      isClaiming,
    };
  }, [isEligible, claimableReward, hasPendingClaim, claimRewards, isClaiming]);
};
