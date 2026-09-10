import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  ARBITRUM_MAINNET_CAIP_CHAIN_ID as arbitrumMainnetCaipChainId,
  ARBITRUM_TESTNET_CAIP_CHAIN_ID as arbitrumTestnetCaipChainId,
} from '@metamask/perps-controller';
import { type CaipChainId } from '@metamask/utils';
import { selectSelectedAccountCaipId } from '../../../../../selectors/activity';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps/selectors/featureFlags';
import {
  getPerpsActivityMappingIds,
  mapPerpsTransaction,
} from '../../../../../util/activity-adapters';
import { usePerpsActivityQuery } from '../../hooks/usePerpsActivityQuery';
import type { RootState } from '../../../../../reducers';
import { type PerpsTransaction } from '../../components/ActivityDetailsPerps.utils';
import { equalsIgnoreCase } from '../../../../../util/string';

function getPerpsTransaction(
  transactions: PerpsTransaction[],
  identifier: string | undefined,
) {
  if (!identifier) {
    return undefined;
  }

  return transactions.find(
    (transaction) =>
      equalsIgnoreCase(transaction.id, identifier) ||
      equalsIgnoreCase(transaction.depositWithdrawal?.txHash, identifier),
  );
}

export function usePerpsDetailsItem(
  identifier: string | undefined,
  chainId: CaipChainId = arbitrumMainnetCaipChainId as CaipChainId,
) {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const shouldResolve =
    Boolean(identifier) &&
    isPerpsEnabled &&
    (chainId === arbitrumMainnetCaipChainId ||
      chainId === arbitrumTestnetCaipChainId);
  const { collateralAssetId } = getPerpsActivityMappingIds(
    chainId === arbitrumTestnetCaipChainId,
  );
  const accountId = useSelector((state: RootState) =>
    selectSelectedAccountCaipId(state, chainId),
  );
  const { isFetching, transactions } = usePerpsActivityQuery(
    shouldResolve ? accountId : undefined,
    false,
  );
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
    isLoading: shouldResolve && !item && isFetching,
  };
}
