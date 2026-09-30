import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { Query } from '@tanstack/query-core';
import { RampsOrderStatus } from '@metamask/ramps-controller';
import type { TransactionMeta } from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import {
  getMoneyActivityStatus,
  type MoneyActivityStatus,
} from '../utils/classifyMoneyActivity';
import { isRestartInterruptedFiatDeposit } from '../utils/fiatVaultFailureSuppression';
import type { MoneyActivityItem } from '../types/moneyActivity';

/**
 * Re-check cadence while an order is still non-terminal. Deliberately gentle:
 * unlike the submit flow (which polls every second), this is passive display
 * rendering that only needs to converge minutes later when the provider
 * settles.
 */
const SETTLEMENT_POLL_INTERVAL_MS = 15_000;

/**
 * Hard cap on re-checks for one order: 6 attempts × 15s ≈ 90s. A restart-
 * interrupted deposit that hasn't settled by then almost certainly won't on
 * its own — the row is left as `Depositing` rather than polled forever, and
 * a later remount (data uncached) restarts the budget.
 */
const SETTLEMENT_MAX_ATTEMPTS = 6;

export type FiatOrderSettlement = 'settled' | 'order-failed' | 'unknown';

/**
 * Sync combiner shared by the single- and multi-tx hooks: the Vault-only
 * branch is already folded into `getMoneyActivityStatus`, so only the
 * restart branch is resolved here.
 */
export function resolveEffectiveMoneyActivityStatus(
  tx: TransactionMeta,
  settlement: FiatOrderSettlement,
): MoneyActivityStatus {
  const base = getMoneyActivityStatus(tx);

  if (base !== 'failed' || !isRestartInterruptedFiatDeposit(tx)) {
    return base;
  }

  if (settlement === 'settled') {
    return 'confirmed';
  }

  if (settlement === 'order-failed') {
    return 'failed';
  }

  return 'pending';
}

/**
 * Drop-in replacement for `getMoneyActivityStatus` in Money activity UI:
 * identical except restart-interrupted fiat deposits render from live order
 * settlement (settled → deposited, terminal order failure → failed,
 * still-unknown → depositing) instead of the stale boot-cleanup failure.
 */
export function useEffectiveMoneyActivityStatus(
  tx: TransactionMeta,
): MoneyActivityStatus {
  const settlement = useFiatOrderSettlement(tx);

  return useMemo(
    () => resolveEffectiveMoneyActivityStatus(tx, settlement),
    [tx, settlement],
  );
}

/**
 * Batch variant for list grouping (e.g. the Pending section): resolves the
 * effective status for every restart candidate in `items`, keyed by
 * transaction id.
 */
export function useEffectiveStatusOverrides(
  items: MoneyActivityItem[],
): Map<string, MoneyActivityStatus> {
  const moneyAccountAddress = useSelector(selectPrimaryMoneyAccount)?.address;

  const candidates = useMemo(
    () =>
      items.filter(
        (item) =>
          item.kind === 'onchain' &&
          isRestartInterruptedFiatDeposit(item.tx),
      ),
    [items],
  );

  return useQueries({
    queries: candidates.map((item) => {
      const provider = item.tx.metamaskPay?.fiat?.provider;
      const orderId = item.tx.metamaskPay?.fiat?.orderId;
      return {
        queryKey: settlementQueryKey(provider, orderId),
        queryFn: () => {
          if (!provider || !orderId || !moneyAccountAddress) {
            return Promise.resolve<FiatOrderSettlement>('unknown');
          }
          return fetchFiatOrderSettlement(
            provider,
            orderId,
            moneyAccountAddress,
          );
        },
        enabled: Boolean(provider && orderId && moneyAccountAddress),
        staleTime: Infinity,
        retry: false,
        refetchInterval: settlementRefetchInterval,
      };
    }),
    combine: (results) => {
      const overrides = new Map<string, MoneyActivityStatus>();
      results.forEach((result, index) => {
        const item = candidates[index];
        if (item?.kind === 'onchain') {
          overrides.set(
            item.tx.id,
            resolveEffectiveMoneyActivityStatus(
              item.tx,
              result.data ?? 'unknown',
            ),
          );
        }
      });
      return overrides;
    },
  });
}

/**
 * Settlement lookup for a restart-interrupted fiat deposit. Non-candidates
 * never fetch and always report `unknown`. Unresolved results re-check on an
 * interval until terminal; React Query owns caching and request dedupe, so
 * remounts (e.g. list virtualization) reuse the result instead of refetching.
 */
function useFiatOrderSettlement(tx: TransactionMeta): FiatOrderSettlement {
  const provider = tx.metamaskPay?.fiat?.provider;
  const orderId = tx.metamaskPay?.fiat?.orderId;
  // Direct-mUSD on-ramp settles into the Money Account itself, so the order
  // must be looked up by its address — the deposit is never bought from an EOA.
  const moneyAccountAddress = useSelector(selectPrimaryMoneyAccount)?.address;

  const enabled = Boolean(
    isRestartInterruptedFiatDeposit(tx) &&
      provider &&
      orderId &&
      moneyAccountAddress,
  );

  const { data } = useQuery({
    queryKey: settlementQueryKey(provider, orderId),
    queryFn: () => {
      if (!provider || !orderId || !moneyAccountAddress) {
        return Promise.resolve<FiatOrderSettlement>('unknown');
      }
      return fetchFiatOrderSettlement(provider, orderId, moneyAccountAddress);
    },
    enabled,
    staleTime: Infinity,
    retry: false,
    refetchInterval: settlementRefetchInterval,
  });

  return data ?? 'unknown';
}

function settlementRefetchInterval(
  query: Query<FiatOrderSettlement>,
): number | false {
  const { data, dataUpdateCount } = query.state;

  if (data === 'settled' || data === 'order-failed') {
    return false;
  }

  if (dataUpdateCount >= SETTLEMENT_MAX_ATTEMPTS) {
    return false;
  }

  return SETTLEMENT_POLL_INTERVAL_MS;
}

function settlementQueryKey(
  provider: string | undefined,
  orderId: string | undefined,
): string[] {
  return ['fiat-order-settlement', provider ?? '', orderId ?? ''];
}

async function fetchFiatOrderSettlement(
  provider: string,
  orderId: string,
  walletAddress: string,
): Promise<FiatOrderSettlement> {
  try {
    const order = await Engine.context.RampsController.getOrder(
      provider,
      orderId,
      walletAddress,
    );
    if (order?.status === RampsOrderStatus.Completed) {
      return 'settled';
    }
    if (
      order?.status === RampsOrderStatus.Cancelled ||
      order?.status === RampsOrderStatus.Failed ||
      order?.status === RampsOrderStatus.IdExpired
    ) {
      return 'order-failed';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
