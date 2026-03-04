import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';

export function usePredictBalance(): UseQueryResult<number, Error> {
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const address = evmAccount?.address ?? '0x0';

  return useQuery(predictQueries.balance.options({ address }));
}
