/**
 * Maps the perps domain's already-merged transaction history into the shared
 * `ActivityListItem` shape for the unified Activity list.
 *
 * Source of truth is `usePerpsTransactionHistory`, which already merges
 * HyperLiquid fills/funding/user-history with the wallet's local
 * `perpsDeposit`/`perpsWithdraw` txs and dedupes deposits/withdrawals by
 * txHash. This hook does not re-fetch or re-merge — it only normalizes each
 * `PerpsTransaction` through `mapPerpsTransaction`.
 *
 * Open orders and unrecognized trades map to `null` and are dropped, so the
 * unified feed only surfaces executed history.
 *
 * Requires the consuming screen to be wrapped in `PerpsConnectionProvider` +
 * `PerpsStreamProvider`, since `usePerpsTransactionHistory` subscribes to the
 * live-fills stream and the perps connection.
 */
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import {
  ARBITRUM_MAINNET_CAIP_CHAIN_ID,
  ARBITRUM_TESTNET_CAIP_CHAIN_ID as arbitrumTestnetCaipChainId,
  formatAccountToCaipAccountId,
} from '@metamask/perps-controller';
import {
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_ARBITRUM_TESTNET_ADDRESS as usdcArbitrumTestnetAddress,
} from '@metamask/perps-controller/constants/hyperLiquidConfig';
import {
  parseCaipChainId,
  toCaipAssetType,
  type CaipChainId,
} from '@metamask/utils';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  mapPerpsTransaction,
  type ActivityListItem,
} from '../../../../util/activity-adapters';
import {
  usePerpsConnection,
  usePerpsNetwork,
  usePerpsTransactionHistory,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../../../UI/Perps/hooks';

export interface UsePerpsActivityItemsResult {
  items: ActivityListItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /**
   * Loads older funding history. Trades and deposits/withdrawals are fetched in
   * full up front; only HyperLiquid funding is windowed, so this is the only
   * paginated part of perps history.
   */
  loadMore: () => Promise<void>;
  /** Whether more funding history is available to load. */
  hasMore: boolean;
  /** Whether a load-more request is currently in flight. */
  isFetchingMore: boolean;
}

export function usePerpsActivityItems(): UsePerpsActivityItemsResult {
  const { isConnected } = usePerpsConnection();
  const isTestnet = usePerpsNetwork() === 'testnet';
  const chainId = (
    isTestnet ? arbitrumTestnetCaipChainId : ARBITRUM_MAINNET_CAIP_CHAIN_ID
  ) as CaipChainId;
  const { namespace, reference } = parseCaipChainId(chainId);
  const collateralAssetId = toCaipAssetType(
    namespace,
    reference,
    'erc20',
    (isTestnet
      ? usdcArbitrumTestnetAddress
      : USDC_ARBITRUM_MAINNET_ADDRESS
    ).toLowerCase(),
  );

  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const selectedAddress = evmAccount?.address;

  // HyperLiquid is keyed by the EOA address and settles on Arbitrum mainnet or
  // Sepolia, so build the CAIP account id with that chain rather than the
  // user's currently-selected chain.
  const accountId = useMemo(() => {
    if (!selectedAddress) {
      return undefined;
    }
    return formatAccountToCaipAccountId(selectedAddress, chainId) ?? undefined;
  }, [chainId, selectedAddress]);

  const {
    transactions,
    isLoading,
    error,
    refetch,
    loadMoreFunding,
    hasFundingMore,
    isFetchingMoreFunding,
  } = usePerpsTransactionHistory({
    accountId,
    skipInitialFetch: !isConnected,
  });

  const items = useMemo(() => {
    const result: ActivityListItem[] = [];
    for (const transaction of transactions) {
      const item = mapPerpsTransaction({
        transaction,
        chainId,
        collateralAssetId,
      });
      if (item) {
        result.push(item);
      }
    }
    return result;
  }, [chainId, collateralAssetId, transactions]);

  const loadMore = useCallback(async () => {
    if (!hasFundingMore || isFetchingMoreFunding) return;
    await loadMoreFunding();
  }, [loadMoreFunding, hasFundingMore, isFetchingMoreFunding]);

  return {
    items,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore: hasFundingMore,
    isFetchingMore: isFetchingMoreFunding,
  };
}
