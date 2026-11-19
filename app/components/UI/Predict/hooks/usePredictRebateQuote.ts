import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { RebateQuoteResponse } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { selectRewardsMoneyControllerEnabled } from '../../../../selectors/featureFlagController/rewardsMoneyController';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { useSessionProfileId } from '../../../../util/notifications/hooks/useSessionProfileId';
import {
  getPerpsRebateRetryDelay,
  retryPerpsRebateQuote,
} from '../../Perps/hooks/usePerpsRebateQuote';

const REBATE_QUOTE_GC_TIME_MS = 5 * 60 * 1_000;

export const predictRebateQuoteQueryKey = (
  profileId: string | undefined,
  canFetch: boolean,
) => ['predict', 'rebateQuote', profileId ?? null, canFetch] as const;

/**
 * Reads the current profile's Predict rebate once per buy screen. The server
 * answers `PRODUCT_NOT_SUPPORTED` until Predict cashback is switched on.
 */
export function usePredictRebateQuote(): UseQueryResult<
  RebateQuoteResponse,
  Error
> {
  const isRewardsMoneyControllerEnabled = useSelector(
    selectRewardsMoneyControllerEnabled,
  );
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const { profileId } = useSessionProfileId();
  const networkTier = useNetworkTier();

  const canFetch =
    isRewardsMoneyControllerEnabled &&
    isBasicFunctionalityEnabled &&
    isSignedIn &&
    isUnlocked &&
    Boolean(profileId) &&
    networkTier !== 'NONE';

  return useQuery({
    queryKey: predictRebateQuoteQueryKey(profileId, canFetch),
    queryFn: () =>
      Engine.context.RewardsMoneyController.getPredictRebateQuote(),
    enabled: canFetch,
    staleTime: 0,
    gcTime: REBATE_QUOTE_GC_TIME_MS,
    retry: retryPerpsRebateQuote,
    retryDelay: getPerpsRebateRetryDelay,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });
}
