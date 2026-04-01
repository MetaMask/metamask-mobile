import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { TokenI } from '../../../../Tokens/types';
import { isClaimableBonusAboveThreshold } from '../MerklRewards.utils';
import {
  useMerklRewards,
  isTokenEligibleForMerklRewards,
} from './useMerklRewards';
import { usePendingMerklClaim } from './usePendingMerklClaim';
import { useMerklClaimTransaction } from './useMerklClaimTransaction';
import { selectMerklCampaignClaimingEnabledFlag } from '../../../selectors/featureFlags';
import { useMusdConversionEligibility } from '../../../hooks/useMusdConversionEligibility';
import { selectNetworkConfigurationByChainId } from '../../../../../../selectors/networkController';
import { RootState } from '../../../../../../reducers';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';

export interface MerklClaimData {
  /** Claimable reward string when amount >= MIN_CLAIMABLE_BONUS_USD; null otherwise (e.g. "< 0.01" or below threshold). */
  claimableReward: string | null;
  hasPendingClaim: boolean;
  isClaiming: boolean;
  claimRewards: () => Promise<
    | {
        txHash: string;
        transactionMeta: Record<string, unknown>;
      }
    | undefined
  >;
}

const DEFAULT_MERKL_CLAIM_DATA: MerklClaimData = {
  claimableReward: null,
  hasPendingClaim: false,
  isClaiming: false,
  claimRewards: async () => undefined,
};

const getBonusAmountRange = (bonusAmount: string): string => {
  if (bonusAmount.startsWith('<')) return '< 0.01';
  const value = parseFloat(bonusAmount);
  if (value < 1) return '0.01 - 0.99';
  if (value < 10) return '1.00 - 9.99';
  if (value < 100) return '10.00 - 99.99';
  if (value < 1000) return '100.00 - 999.99';
  return '1000.00+';
};

/**
 * Combines `useMerklRewards`, `usePendingMerklClaim`, and `useMerklClaimTransaction`
 * into a single hook that can be called unconditionally in token list items.
 *
 * For ineligible or geo-blocked assets, `undefined` is passed to the underlying
 * hooks which causes them to no-op (no API calls, no side effects).
 *
 * Fires `MUSD_CLAIM_BONUS_CTA_DISPLAYED` at most once per mount when the claim
 * CTA is both eligible and physically visible in the viewport.
 *
 * @param asset - The token to check for Merkl bonus claim eligibility
 * @param location - Where the claim CTA is rendered; used for analytics
 * @param isVisible - Whether the component is currently visible in the viewport.
 * @returns MerklClaimData with claim state and actions
 */
export const useMerklBonusClaim = (
  asset: TokenI | undefined,
  location: string,
  isVisible = true,
): MerklClaimData => {
  const isMerklCampaignClaimingEnabled = useSelector(
    selectMerklCampaignClaimingEnabledFlag,
  );
  const { isEligible: isGeoEligible } = useMusdConversionEligibility();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset?.chainId as Hex),
  );

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

  const { claimableReward, hasClaimedBefore, rewardsFetchVersion } =
    useMerklRewards({
      asset: eligibleAsset,
    });
  const { hasPendingClaim } = usePendingMerklClaim();
  const { claimRewards, isClaiming } = useMerklClaimTransaction(eligibleAsset);
  const [claimLockFetchVersion, setClaimLockFetchVersion] = useState<
    number | null
  >(null);
  const latestRewardsFetchVersionRef = useRef(rewardsFetchVersion);
  useEffect(() => {
    latestRewardsFetchVersionRef.current = rewardsFetchVersion;
  }, [rewardsFetchVersion]);
  const isClaimLocked =
    claimLockFetchVersion !== null &&
    claimLockFetchVersion === rewardsFetchVersion;

  const claimRewardsWithSessionLock = useCallback(async () => {
    const claimResult = await claimRewards();
    // Keep CTA hidden until the next rewards refetch resolves.
    if (claimResult) {
      setClaimLockFetchVersion(latestRewardsFetchVersionRef.current);
    }
    return claimResult;
  }, [claimRewards]);

  const hasClaimableBonus =
    isEligible &&
    isClaimableBonusAboveThreshold(claimableReward) &&
    !hasPendingClaim &&
    !isClaimLocked;

  const hasFiredCtaAvailableEvent = useRef(false);

  useEffect(() => {
    if (
      !hasClaimableBonus ||
      !isVisible ||
      !claimableReward ||
      hasFiredCtaAvailableEvent.current
    ) {
      return;
    }
    hasFiredCtaAvailableEvent.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_CLAIM_BONUS_CTA_DISPLAYED)
        .addProperties({
          location,
          view_trigger: 'component_mounted',
          button_text: 'Claim bonus',
          network_chain_id: asset?.chainId,
          network_name: network?.name,
          asset_symbol: asset?.symbol,
          bonus_amount_range: getBonusAmountRange(claimableReward),
          has_claimed_before: hasClaimedBefore,
        })
        .build(),
    );
  }, [
    hasClaimableBonus,
    isVisible,
    trackEvent,
    createEventBuilder,
    location,
    asset?.chainId,
    asset?.symbol,
    network?.name,
    claimableReward,
    hasClaimedBefore,
  ]);

  return useMemo(() => {
    if (!isEligible) {
      return DEFAULT_MERKL_CLAIM_DATA;
    }

    return {
      claimableReward:
        !isClaimLocked && isClaimableBonusAboveThreshold(claimableReward)
          ? claimableReward
          : null,
      hasPendingClaim,
      claimRewards: claimRewardsWithSessionLock,
      isClaiming,
    };
  }, [
    isEligible,
    claimableReward,
    hasPendingClaim,
    claimRewardsWithSessionLock,
    isClaiming,
    isClaimLocked,
  ]);
};
