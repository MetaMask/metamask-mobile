import { useMemo } from 'react';
import {
  type AccountState,
  type AccountAggregateMetadata,
  type PerpsProviderAccountStateEntry,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import { useSelector } from 'react-redux';
import { selectPerpsProvider } from '../../selectors/perpsController';
import Engine from '../../../../../core/Engine';
import { usePerpsLiveAccount } from './usePerpsLiveAccount';
import { usePerpsConnection } from '../usePerpsConnection';
import { hasPreloadedData } from './hasCachedPerpsData';

/** Per-venue balance view for one enabled venue (TAT-4407). */
export type PerpsVenueBalance = PerpsProviderAccountStateEntry;

export interface UsePerpsVenueBalancesReturn {
  /** One entry per venue that has reported or is expected on the stream. */
  venues: PerpsVenueBalance[];
  /** The combined top-level account totals across venues. */
  total: AccountState | null;
  /**
   * Aggregate completeness of the combined totals. `status: 'partial'` means
   * the total is a subtotal over the available venues only. Null for
   * direct-mode streams, where the total is the single venue.
   */
  aggregate: AccountAggregateMetadata | null;
  /** Waiting for the initial account snapshot, without a connection error. */
  isInitialLoading: boolean;
}

/**
 * Per-venue balances plus the combined total (TAT-4407).
 *
 * Feeds off the live account stream, whose aggregated updates carry
 * `providerStates` (one entry per venue) and an aggregate-completeness second
 * argument. `perpsBalances` (the persisted per-venue fallback) covers the
 * window before the stream connects: venues known to it appear as
 * `unavailable` so a not-yet-connected venue is not mistaken for an empty one.
 *
 * In direct (single-venue) mode there is no `providerStates`; the single
 * top-level state is reported as the active venue's entry and the total equals
 * it, so the shape matches aggregated mode without a separate code path.
 */
export function usePerpsVenueBalances(
  options: { enabled?: boolean; throttleMs?: number } = {},
): UsePerpsVenueBalancesReturn {
  const { enabled = true, throttleMs } = options;
  const { account, aggregate, isInitialLoading } = usePerpsLiveAccount({
    enabled,
    ...(throttleMs !== undefined ? { throttleMs } : {}),
  });
  const { error: connectionError } = usePerpsConnection();

  const activeProvider = useSelector(selectPerpsProvider);

  return useMemo(() => {
    const entries: PerpsVenueBalance[] = [];
    if (account?.providerStates && Object.keys(account.providerStates).length) {
      entries.push(...Object.values(account.providerStates));
    } else if (account) {
      // Direct mode: the top-level state is the single venue's entry.
      const providerId =
        account.providerId ??
        aggregate?.availableProviders[0] ??
        (activeProvider !== 'aggregated' ? activeProvider : undefined);
      if (providerId)
        entries.push({ providerId, status: 'available', state: account });
    } else {
      // Before the stream connects, the persisted per-venue balances name the
      // venues the user has money on. Report them as unavailable, never zero.
      const persisted = Engine.context.PerpsController?.state?.perpsBalances as
        | Record<string, unknown>
        | undefined;
      if (persisted && connectionError) {
        Object.keys(persisted).forEach((providerId) => {
          entries.push({
            providerId: providerId as PerpsProviderType,
            status: 'unavailable',
          });
        });
      }
    }

    return {
      venues: entries,
      total: account,
      aggregate: aggregate ?? null,
      isInitialLoading:
        !connectionError &&
        (isInitialLoading ||
          (!account && !hasPreloadedData('cachedAccountState'))),
    };
  }, [account, aggregate, isInitialLoading, connectionError, activeProvider]);
}
