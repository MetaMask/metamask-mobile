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
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import {
  ARBITRUM_MAINNET_CAIP_CHAIN_ID,
  formatAccountToCaipAccountId,
} from '@metamask/perps-controller';
import { USDC_ARBITRUM_MAINNET_ADDRESS } from '@metamask/perps-controller/constants/hyperLiquidConfig';
import type { CaipChainId } from '@metamask/utils';
import { selectChainId } from '../../../../selectors/networkController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  mapPerpsTransaction,
  type ActivityListItem,
} from '../../../../util/activity-adapters';
import {
  usePerpsConnection,
  usePerpsTransactionHistory,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../../../UI/Perps/hooks';

/**
 * HyperLiquid settles on Arbitrum; the perps adapter has no public CAIP-2 of
 * its own, so the bridge chain is injected as the activity chainId.
 */
const PERPS_ACTIVITY_CHAIN_ID = ARBITRUM_MAINNET_CAIP_CHAIN_ID as CaipChainId;

/** HyperLiquid collateral (Arbitrum USDC) — lets rows render the token icon. */
const PERPS_COLLATERAL_ASSET_ID = `${PERPS_ACTIVITY_CHAIN_ID}/erc20:${USDC_ARBITRUM_MAINNET_ADDRESS.toLowerCase()}`;

export interface UsePerpsActivityItemsResult {
  items: ActivityListItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePerpsActivityItems(): UsePerpsActivityItemsResult {
  const { isConnected } = usePerpsConnection();

  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const selectedAddress = evmAccount?.address;
  const currentChainId = useSelector(selectChainId);

  const accountId = useMemo(() => {
    if (!selectedAddress || !currentChainId) {
      return undefined;
    }
    return (
      formatAccountToCaipAccountId(selectedAddress, currentChainId) ?? undefined
    );
  }, [selectedAddress, currentChainId]);

  const { transactions, isLoading, error, refetch } =
    usePerpsTransactionHistory({
      accountId,
      skipInitialFetch: !isConnected,
    });

  const items = useMemo(() => {
    const result: ActivityListItem[] = [];
    for (const transaction of transactions) {
      const item = mapPerpsTransaction({
        transaction,
        chainId: PERPS_ACTIVITY_CHAIN_ID,
        collateralAssetId: PERPS_COLLATERAL_ASSET_ID,
      });
      if (item) {
        result.push(item);
      }
    }
    return result;
  }, [transactions]);

  return { items, isLoading, error, refetch };
}
