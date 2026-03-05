import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';
import { useSelector } from 'react-redux';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';

export function usePredictBalance(): UseQueryResult<number, Error> {
  // Subscribe to account group changes so the hook re-renders when the user switches accounts
  useSelector(selectSelectedAccountGroupId);
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const address = evmAccount?.address ?? '0x0';

  return useQuery(predictQueries.balance.options({ address }));
}
