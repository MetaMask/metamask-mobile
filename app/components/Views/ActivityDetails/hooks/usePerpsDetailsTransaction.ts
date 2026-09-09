import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  ARBITRUM_MAINNET_CAIP_CHAIN_ID,
  formatAccountToCaipAccountId,
} from '@metamask/perps-controller';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  usePerpsConnection,
  usePerpsTransactionHistory,
} from '../../../UI/Perps/hooks';
import {
  findPerpsTransaction,
  type PerpsTransaction,
} from '../components/ActivityDetailsPerps.utils';

export function usePerpsDetailsTransaction(
  identifier: string | undefined,
): PerpsTransaction | undefined {
  const { isConnected } = usePerpsConnection();
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const accountId = evmAccount?.address
    ? (formatAccountToCaipAccountId(
        evmAccount.address,
        ARBITRUM_MAINNET_CAIP_CHAIN_ID,
      ) ?? undefined)
    : undefined;
  const { transactions } = usePerpsTransactionHistory({
    accountId,
    skipInitialFetch: !isConnected,
  });

  return useMemo(
    () => findPerpsTransaction(transactions, identifier),
    [identifier, transactions],
  );
}
