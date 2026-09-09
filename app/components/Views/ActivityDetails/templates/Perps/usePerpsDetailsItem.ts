import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  ARBITRUM_MAINNET_CAIP_CHAIN_ID as arbitrumMainnetCaipChainId,
  formatAccountToCaipAccountId,
} from '@metamask/perps-controller';
import { USDC_ARBITRUM_MAINNET_ADDRESS as usdcArbitrumMainnetAddress } from '@metamask/perps-controller/constants/hyperLiquidConfig';
import type { CaipChainId } from '@metamask/utils';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { mapPerpsTransaction } from '../../../../../util/activity-adapters';
import {
  usePerpsConnection,
  usePerpsTransactionHistory,
} from '../../../../UI/Perps/hooks';
import { type PerpsTransaction } from '../../components/ActivityDetailsPerps.utils';

const perpsActivityChainId = arbitrumMainnetCaipChainId as CaipChainId;
const perpsCollateralAssetId = `${perpsActivityChainId}/erc20:${usdcArbitrumMainnetAddress.toLowerCase()}`;

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

export function usePerpsDetailsItem(identifier: string | undefined) {
  const shouldResolve = Boolean(identifier);
  const { isConnected } = usePerpsConnection();
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const accountId = evmAccount?.address
    ? (formatAccountToCaipAccountId(
        evmAccount.address,
        arbitrumMainnetCaipChainId,
      ) ?? undefined)
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
        chainId: perpsActivityChainId,
        collateralAssetId: perpsCollateralAssetId,
      }) ?? undefined
    );
  }, [transaction]);

  return {
    item,
    transaction,
    isLoading: shouldResolve && isLoading && !item,
  };
}
