import { useEffect } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';

export function usePredictBalance(): UseQueryResult<number, Error> {
  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();

  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const address = evmAccount?.address ?? '0x0';

  useEffect(() => {
    ensurePolygonNetworkExists().catch(() => {
      // Network may already exist — swallow so the query can still proceed.
    });
  }, [ensurePolygonNetworkExists]);

  return useQuery(predictQueries.balance.options({ address }));
}
