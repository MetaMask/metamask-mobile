import { useEffect } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import type { UnrealizedPnL } from '../types';
import { ensureError } from '../utils/predictErrorHandler';

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
 * Hook to fetch unrealized P&L data for the current account
 */
export function useUnrealizedPnL(
  options: UseUnrealizedPnLOptions = {},
): UseQueryResult<UnrealizedPnL | null, Error> {
  const { address, enabled = true } = options;

  // Subscribe to account group changes so the hook re-renders when the user switches accounts
  useSelector(selectSelectedAccountGroupId);
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const resolvedAddress = address ?? evmAccount?.address ?? '0x0';

  const queryResult = useQuery({
    ...predictQueries.unrealizedPnL.options({ address: resolvedAddress }),
    enabled,
  });

  useEffect(() => {
    if (!queryResult.error) return;

    Logger.error(ensureError(queryResult.error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'useUnrealizedPnL',
      },
      context: {
        name: 'useUnrealizedPnL',
        data: {
          method: 'queryFn',
          action: 'unrealized_pnl_load',
          operation: 'data_fetching',
        },
      },
    });
  }, [queryResult.error]);

  return queryResult;
}
