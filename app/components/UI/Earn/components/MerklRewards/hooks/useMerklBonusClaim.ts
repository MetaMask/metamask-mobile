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
import { getUsdAmountRange } from '../../../../../../util/analytics/usdAmountRange';

export interface MerklClaimData {
  /** Claimable reward string when amount >= MIN_CLAIMABLE_BONUS_USD; null otherwise (e.g. "< 0.01" or below threshold). */
  claimableReward: string | null;
  /** Lifetime bonus claimed in human-readable USD (e.g. "221.59"); null while loading. */
  lifetimeBonusClaimed: string | null;
  hasPendingClaim: boolean;
  isClaiming: boolean;
  /** Set when the last claim attempt failed (e.g. no reward data, network). */
  error: string | null;
  claimRewards: () => Promise<
    | {
        txHash: string;
        transactionMeta: Record<string, unknown>;
      }
    | undefined
  >;
  /** Manually re-fetches the Merkl rewards data. No-op for ineligible assets. */
  refetch: () => void;
}

const DEFAULT_MERKL_CLAIM_DATA: MerklClaimData = {
  claimableReward: null,
  lifetimeBonusClaimed: null,
  hasPendingClaim: false,
  isClaiming: false,
  error: null,
  claimRewards: async () => undefined,
  refetch: () => undefined,
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

  const {
    claimableReward,
    lifetimeBonusClaimed,
    hasClaimedBefore,
    rewardsFetchVersion,
    refetch,
  } = useMerklRewards({
    asset: eligibleAsset,
  });
  const { hasPendingClaim } = usePendingMerklClaim();
  const {
    claimRewards,
    isClaiming,
    error: claimError,
  } = useMerklClaimTransaction(eligibleAsset);
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
          bonus_amount_range: getUsdAmountRange(claimableReward),
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
      return { ...DEFAULT_MERKL_CLAIM_DATA, refetch };
    }

    return {
      claimableReward:
        !isClaimLocked && isClaimableBonusAboveThreshold(claimableReward)
          ? claimableReward
          : null,
      lifetimeBonusClaimed,
      hasPendingClaim,
      claimRewards: claimRewardsWithSessionLock,
      isClaiming,
      error: claimError,
      refetch,
    };
  }, [
    isEligible,
    claimableReward,
    lifetimeBonusClaimed,
    hasPendingClaim,
    claimRewardsWithSessionLock,
    isClaiming,
    claimError,
    isClaimLocked,
    refetch,
  ]);
};
