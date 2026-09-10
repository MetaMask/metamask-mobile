import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  ARBITRUM_MAINNET_CAIP_CHAIN_ID as arbitrumMainnetCaipChainId,
  ARBITRUM_TESTNET_CAIP_CHAIN_ID as arbitrumTestnetCaipChainId,
  formatAccountToCaipAccountId,
} from '@metamask/perps-controller';
import {
  USDC_ARBITRUM_MAINNET_ADDRESS as usdcArbitrumMainnetAddress,
  USDC_ARBITRUM_TESTNET_ADDRESS as usdcArbitrumTestnetAddress,
} from '@metamask/perps-controller/constants/hyperLiquidConfig';
import {
  parseCaipChainId,
  toCaipAssetType,
  type CaipChainId,
} from '@metamask/utils';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { mapPerpsTransaction } from '../../../../../util/activity-adapters';
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
  const isTestnet = chainId === arbitrumTestnetCaipChainId;
  const shouldResolve = Boolean(identifier);
  const { namespace, reference } = parseCaipChainId(chainId);
  const collateralAssetId = toCaipAssetType(
    namespace,
    reference,
    'erc20',
    (isTestnet
      ? usdcArbitrumTestnetAddress
      : usdcArbitrumMainnetAddress
    ).toLowerCase(),
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
    isLoading: shouldResolve && isLoading && !item,
  };
}
