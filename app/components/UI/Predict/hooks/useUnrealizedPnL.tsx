import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import type { UnrealizedPnL } from '../types';

interface UseUnrealizedPnLOptions {
  /**
   * The address to fetch unrealized P&L for.
   * Defaults to the EVM address from the currently selected account group.
   */
  address?: string;
  /**
   * Whether to enable the query.
   * @default true
   */
  enabled?: boolean;
}

/**
 * Thin wrapper around the unrealizedPnL query that resolves the current
 * EVM account address automatically, matching the pattern used by
 * usePredictBalance and usePredictPositions.
 */
export function useUnrealizedPnL(
  options: UseUnrealizedPnLOptions = {},
): UseQueryResult<UnrealizedPnL | null, Error> {
  const { address, enabled = true } = options;

  // Subscribe to account group changes so the hook re-renders when the user switches accounts
  useSelector(selectSelectedAccountGroupId);
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const resolvedAddress = address ?? evmAccount?.address ?? '0x0';

  return useQuery({
    ...predictQueries.unrealizedPnL.options({ address: resolvedAddress }),
    enabled,
  });
}
