import { useEffect } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';

export function usePredictBalance(): UseQueryResult<number, Error> {
  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();
  // Subscribe to account group changes so the hook re-renders when the user switches accounts
  useSelector(selectSelectedAccountGroupId);
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const address = evmAccount?.address ?? '0x0';

  useEffect(() => {
    ensurePolygonNetworkExists().catch(() => {
      // Network may already exist — swallow so the query can still proceed.
    });
  }, [ensurePolygonNetworkExists]);

  return useQuery(predictQueries.balance.options({ address }));
}
