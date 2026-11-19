import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type {
  RebateQuoteProduct,
  RebateQuoteResponse,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  RewardsMoneyAuthorizationError,
  RewardsMoneyRebateQuoteError,
} from '../../../../core/Engine/controllers/rewards-money-controller/services';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { selectRewardsMoneyControllerEnabled } from '../../../../selectors/featureFlagController/rewardsMoneyController';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { useSessionProfileId } from '../../../../util/notifications/hooks/useSessionProfileId';

const DEFAULT_RETRY_DELAY_MS = 1_000;
const REBATE_QUOTE_GC_TIME_MS = 5 * 60 * 1_000;

/**
 * Allows one quiet retry for transport and server failures.
 *
 * Authentication and invalid request failures need user or client changes and
 * must not spend the shared Rewards Money read budget again.
 */
export function retryRebateQuote(failureCount: number, error: Error): boolean {
  if (failureCount >= 1 || error instanceof RewardsMoneyAuthorizationError) {
    return false;
  }

  if (error instanceof RewardsMoneyRebateQuoteError) {
    const isTerminalClientError =
      error.status >= 400 && error.status < 500 && error.status !== 429;

    return !isTerminalClientError;
  }

  return true;
}

export function getRebateQuoteRetryDelay(
  _failureCount: number,
  error: Error,
): number {
  return error instanceof RewardsMoneyRebateQuoteError &&
    error.retryAfterSeconds !== undefined
    ? error.retryAfterSeconds * 1_000
    : DEFAULT_RETRY_DELAY_MS;
}

export interface UseRebateQuoteQueryParams {
  product: RebateQuoteProduct;
  queryFn: () => Promise<RebateQuoteResponse>;
  /** The product's own gates: its rebates flag, an active surface. */
  enabled: boolean;
  /** Query key parts after the profile id, such as the selected address. */
  keyParts?: readonly (string | null)[];
}

/**
 * Reads the current profile's rebate quote for one product, once per active
 * surface, behind the gates every product shares: Rewards Money, basic
 * functionality, sign-in, unlock, a session profile and a known-online
 * network.
 *
 * The query key leaves out trade inputs: refetching on each amount edit would
 * spend the profile's shared Rewards Money read budget.
 */
export function useRebateQuoteQuery({
  product,
  queryFn,
  enabled,
  keyParts = [],
}: UseRebateQuoteQueryParams): UseQueryResult<RebateQuoteResponse, Error> {
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
    enabled &&
    isRewardsMoneyControllerEnabled &&
    isBasicFunctionalityEnabled &&
    isSignedIn &&
    isUnlocked &&
    Boolean(profileId) &&
    networkTier !== 'NONE';

  return useQuery({
    queryKey: [
      product,
      'rebateQuote',
      profileId ?? null,
      ...keyParts,
      canFetch,
    ],
    queryFn,
    enabled: canFetch,
    staleTime: 0,
    gcTime: REBATE_QUOTE_GC_TIME_MS,
    retry: retryRebateQuote,
    retryDelay: getRebateQuoteRetryDelay,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });
}
