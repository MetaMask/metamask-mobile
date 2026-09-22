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
  aggregateFills = true,
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
  const isQueryEnabled = shouldResolve && Boolean(accountId);
  const { isFetching, transactions } = usePerpsActivityQuery(
    shouldResolve ? accountId : undefined,
    isQueryEnabled,
    aggregateFills,
  );
  // Row ids differ between the two views: an aggregated row is keyed on the order, an
  // unaggregated one on the individual fill. The list can be in either state when a row is
  // tapped, so resolve against both. Both calls share one react-query cache entry, so this
  // costs a second memo rather than a second fetch.
  const { transactions: unaggregatedTransactions } = usePerpsActivityQuery(
    shouldResolve ? accountId : undefined,
    isQueryEnabled,
    { fillDisplay: 'individual' },
  );
  const transaction = useMemo(() => {
    const target = shouldResolve ? identifier : undefined;
    return (
      getPerpsTransaction(transactions, target) ??
      getPerpsTransaction(unaggregatedTransactions, target)
    );
  }, [identifier, shouldResolve, transactions, unaggregatedTransactions]);

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
