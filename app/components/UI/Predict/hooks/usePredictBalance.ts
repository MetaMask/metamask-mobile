import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';

/** Options accepted by {@link usePredictBalance}. */
interface UsePredictBalanceOptions {
  /** Provider to fetch the balance from (defaults to Polymarket). */
  providerId?: string;
  /** Whether the query is enabled (defaults to `true`). */
  enabled?: boolean;
  // TODO: Remove once confirmations code migrates to `data` from useQuery.
  /** @deprecated Use `enabled` instead. Accepted for backward compatibility but ignored. */
  loadOnMount?: boolean;
}

export function usePredictBalance(options?: UsePredictBalanceOptions) {
  const { providerId = POLYMARKET_PROVIDER_ID, enabled = true } = options ?? {};

  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();

  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const address = evmAccount?.address ?? '0x0';

  useEffect(() => {
    if (!enabled) return;
    ensurePolygonNetworkExists().catch(() => {
      // Network may already exist — swallow so the query can still proceed.
    });
  }, [enabled, ensurePolygonNetworkExists]);

  const query = useQuery({
    ...predictQueries.balance.options({ address, providerId }),
    enabled,
  });

  // TODO: Remove `balance` once confirmations code migrates to `data`.
  return { ...query, balance: query.data ?? 0 };
}
