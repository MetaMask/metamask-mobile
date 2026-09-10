import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  ARBITRUM_MAINNET_CAIP_CHAIN_ID as arbitrumMainnetCaipChainId,
  ARBITRUM_TESTNET_CAIP_CHAIN_ID as arbitrumTestnetCaipChainId,
  formatAccountToCaipAccountId,
} from '@metamask/perps-controller';
import { type CaipChainId } from '@metamask/utils';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import {
  getPerpsActivityMappingIds,
  mapPerpsTransaction,
} from '../../../../../util/activity-adapters';
import {
  usePerpsConnection,
  usePerpsTransactionHistory,
} from '../../../../UI/Perps/hooks';
import { type PerpsTransaction } from '../../components/ActivityDetailsPerps.utils';

function getPerpsTransaction(
  transactions: PerpsTransaction[],
  identifier: string | undefined,
) {
  const normalized = identifier?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return transactions.find((transaction) => {
    if (transaction.id.toLowerCase() === normalized) {
      return true;
    }
    return transaction.depositWithdrawal?.txHash?.toLowerCase() === normalized;
  });
}

export function usePerpsDetailsItem(
  identifier: string | undefined,
  chainId: CaipChainId = arbitrumMainnetCaipChainId as CaipChainId,
) {
  const shouldResolve = Boolean(identifier);
  const { collateralAssetId } = getPerpsActivityMappingIds(
    chainId === arbitrumTestnetCaipChainId,
  );
  const { isConnected } = usePerpsConnection();
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const accountId = evmAccount?.address
    ? (formatAccountToCaipAccountId(evmAccount.address, chainId) ?? undefined)
    : undefined;
  const { transactions, isLoading } = usePerpsTransactionHistory({
    accountId: shouldResolve ? accountId : undefined,
    skipInitialFetch: !shouldResolve || !isConnected,
  });

  const transaction = useMemo(
    () =>
      getPerpsTransaction(transactions, shouldResolve ? identifier : undefined),
    [identifier, shouldResolve, transactions],
  );

  const item = useMemo(() => {
    if (!transaction) {
      return undefined;
    }
    return (
      mapPerpsTransaction({
        transaction,
        chainId,
        collateralAssetId,
      }) ?? undefined
    );
  }, [chainId, collateralAssetId, transaction]);

  return {
    item,
    transaction,
    isLoading: shouldResolve && !item && (isLoading || !isConnected),
  };
}
