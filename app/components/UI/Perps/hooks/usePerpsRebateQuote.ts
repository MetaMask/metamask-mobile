import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type {
  PerpsRebateTrade,
  RebateQuoteResponse,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  RewardsMoneyAuthorizationError,
  RewardsMoneyRebateQuoteError,
} from '../../../../core/Engine/controllers/rewards-money-controller/services';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { selectPerpsRebatesEnabled } from '../../../../selectors/featureFlagController/perpsRebates';
import { selectRewardsMoneyControllerEnabled } from '../../../../selectors/featureFlagController/rewardsMoneyController';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useSessionProfileId } from '../../../../util/notifications/hooks/useSessionProfileId';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';

const DEFAULT_RETRY_DELAY_MS = 1_000;
const REBATE_QUOTE_GC_TIME_MS = 5 * 60 * 1_000;

export interface UsePerpsRebateQuoteParams {
  /** Prevents a quote outside an active order or position confirmation. */
  enabled?: boolean;
  /** Hyperliquid market name, when a single trade is known. */
  coin?: string;
  /** Perps direction mapped to the Rewards Money trade side. */
  direction?: 'long' | 'short';
  /** Trade notional as a plain decimal USD string. */
  notionalUsd?: string;
}

export const perpsRebateQuoteQueryKey = (
  profileId: string | undefined,
  address: string | undefined,
  canFetch: boolean,
) =>
  [
    'perps',
    'rebateQuote',
    profileId ?? null,
    address ?? null,
    canFetch,
  ] as const;

/**
 * Builds optional trade metadata for the rebate quote.
 *
 * The controller performs the final server-format validation and omits
 * metadata that the service would reject.
 */
export function buildPerpsRebateTrade({
  coin,
  direction,
  notionalUsd,
}: Omit<UsePerpsRebateQuoteParams, 'enabled'>): PerpsRebateTrade | undefined {
  if (!coin || !direction || !notionalUsd) {
    return undefined;
  }

  return {
    coin,
    side: direction === 'long' ? 'BUY' : 'SELL',
    notionalUsd,
  };
}

/**
 * Allows one quiet retry for transport and server failures.
 *
 * Authentication and invalid request failures need user or client changes and
 * must not spend the shared Rewards Money read budget again.
 */
export function retryPerpsRebateQuote(
  failureCount: number,
  error: Error,
): boolean {
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

export function getPerpsRebateRetryDelay(
  _failureCount: number,
  error: Error,
): number {
  return error instanceof RewardsMoneyRebateQuoteError &&
    error.retryAfterSeconds !== undefined
    ? error.retryAfterSeconds * 1_000
    : DEFAULT_RETRY_DELAY_MS;
}

/**
 * Reads the current profile's Perps rebate rate once per active surface.
 *
 * The query key intentionally excludes trade inputs: the service drops Perps
 * trade metadata today, and refetching on each amount edit would consume the
 * profile's shared Rewards Money rate limit.
 */
export function usePerpsRebateQuote({
  enabled = true,
  coin,
  direction,
  notionalUsd,
}: UsePerpsRebateQuoteParams = {}): UseQueryResult<RebateQuoteResponse, Error> {
  const isPerpsRebatesEnabled = useSelector(selectPerpsRebatesEnabled);
  const isRewardsMoneyControllerEnabled = useSelector(
    selectRewardsMoneyControllerEnabled,
  );
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const address = useSelector(selectPerpsSelectedAccountAddress);
  const { profileId } = useSessionProfileId();
  const networkTier = useNetworkTier();

  // The UI is static for every hardware tier. Reading both capabilities keeps
  // this one-shot fetch aligned with the device matrix; only known offline
  // state changes behavior.
  getHardwareTier();

  const trade = buildPerpsRebateTrade({ coin, direction, notionalUsd });
  const canFetch =
    enabled &&
    isPerpsRebatesEnabled &&
    isRewardsMoneyControllerEnabled &&
    isBasicFunctionalityEnabled &&
    isSignedIn &&
    isUnlocked &&
    Boolean(profileId) &&
    networkTier !== 'NONE';

  return useQuery({
    queryKey: perpsRebateQuoteQueryKey(profileId, address, canFetch),
    queryFn: () =>
      Engine.context.RewardsMoneyController.getPerpsRebateQuote(trade),
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
