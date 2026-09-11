import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  ARBITRUM_MAINNET_CAIP_CHAIN_ID,
  formatAccountToCaipAccountId,
} from '@metamask/perps-controller';
import type { CaipChainId } from '@metamask/utils';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import {
  usePerpsConnection,
  usePerpsTransactionHistory,
} from '../../../UI/Perps/hooks';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { PerpsTransaction } from '../../../UI/Perps/types/transactionHistory';

const PERPS_ACTIVITY_CHAIN_ID = ARBITRUM_MAINNET_CAIP_CHAIN_ID as CaipChainId;

function matchesPerpsTransactionLookup(
  transaction: PerpsTransaction,
  lookupId: string,
): boolean {
  if (transaction.id.toLowerCase() === lookupId) {
    return true;
  }
  const txHash = transaction.depositWithdrawal?.txHash?.toLowerCase();
  return Boolean(txHash && txHash === lookupId);
}

export function usePerpsTransactionById(
  transactionId: string | undefined,
): PerpsTransaction | undefined {
  const { isConnected } = usePerpsConnection();
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const selectedAddress = evmAccount?.address;

  const accountId = useMemo(() => {
    if (!selectedAddress) {
      return undefined;
    }
    return (
      formatAccountToCaipAccountId(selectedAddress, PERPS_ACTIVITY_CHAIN_ID) ??
      undefined
    );
  }, [selectedAddress]);

  const { transactions } = usePerpsTransactionHistory({
    accountId,
    skipInitialFetch: !isConnected,
  });

  return useMemo(() => {
    if (!transactionId) {
      return undefined;
    }
    const normalizedId = transactionId.toLowerCase();
    return transactions.find((transaction) =>
      matchesPerpsTransactionLookup(transaction, normalizedId),
    );
  }, [transactions, transactionId]);
}
