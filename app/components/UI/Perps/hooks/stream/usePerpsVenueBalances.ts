import { useMemo } from 'react';
import {
  type AccountState,
  type AccountAggregateMetadata,
  type PerpsProviderAccountStateEntry,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { usePerpsLiveAccount } from './usePerpsLiveAccount';
import { usePerpsConnection } from '../usePerpsConnection';
import { hasPreloadedData } from './hasCachedPerpsData';

/** Per-venue balance view for one enabled venue (TAT-4407). */
export interface PerpsVenueBalance {
  providerId: PerpsProviderType;
  /**
   * Stream status for the venue: `available` carries the venue's own
   * account state, `pending` means it has not reported yet, and
   * `unavailable` means its read failed. A venue that is pending or
   * unavailable is never shown as zero.
   */
  status: PerpsProviderAccountStateEntry['status'];
  /** The venue's own account snapshot when available. */
  state?: AccountState;
}

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
  /** True once the first real account update has arrived. */
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

  return useMemo(() => {
    const entries: PerpsVenueBalance[] = [];
    if (account?.providerStates && Object.keys(account.providerStates).length) {
      Object.values(account.providerStates).forEach((entry) => {
        entries.push({
          providerId: entry.providerId,
          status: entry.status,
          ...(entry.status === 'available' ? { state: entry.state } : {}),
        });
      });
    } else if (account) {
      // Direct mode: the top-level state is the single venue's entry.
      entries.push({
        providerId:
          account.providerId ??
          aggregate?.availableProviders[0] ??
          'hyperliquid',
        status: 'available',
        state: account,
      });
    } else {
      // Before the stream connects, the persisted per-venue balances name the
      // venues the user has money on. Report them as unavailable, never zero.
      const persisted = Engine.context.PerpsController?.state?.perpsBalances as
        | Record<string, unknown>
        | undefined;
      if (!isInitialLoading && persisted && connectionError) {
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
        isInitialLoading ||
        (!account && !hasPreloadedData('cachedAccountState')),
    };
  }, [account, aggregate, isInitialLoading, connectionError]);
}
