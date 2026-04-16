import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { performEvmTokenRefresh } from '../../UI/Tokens/util/tokenRefreshUtils';
import Logger from '../../../util/Logger';

/**
 * Refresh orchestrator for CashTokensFullView pull-to-refresh.
 *
 * Composes refreshers for the Money Hub's data sources:
 * - mUSD balance (via `useMusdBalance`) — reads from `TokenBalancesController`
 * (balance) and `TokenRatesController` / `CurrencyRateController` (fiat
 * value). Refreshed by invoking `performEvmTokenRefresh`, which fans out
 * to `TokenBalancesController.updateBalances`,
 * `TokenDetectionController.detectTokens`, and
 * `TokenRatesController.updateExchangeRates` for the enabled EVM chains.
 * - Conversion tokens (via `useMusdConversionTokens`) — derives from the
 * same account-assets selectors as mUSD balance, so the same
 * `performEvmTokenRefresh` call re-hydrates them.
 *
 * Gap: the claim-bonus data rendered by `AssetOverviewClaimBonus` is fetched
 * by `useMerklRewards` inside that component tree via `fetchMerklRewardsForAsset`
 * (Merkl HTTP API). The hook keeps that state locally and only exposes
 * `refetch` to its own component, with no public refresher we can invoke from
 * outside without refactoring `useMerklBonusClaim` — out of scope here.
 * `useMerklRewards` auto-refreshes every 60s on mount, so the data stays
 * reasonably fresh without a manual refresh hook.
 */
export const useCashTokensRefresh = () => {
  const [refreshing, setRefreshing] = useState(false);
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await performEvmTokenRefresh(evmNetworkConfigurationsByChainId);
    } catch (error) {
      Logger.error(error as Error, 'useCashTokensRefresh: refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [evmNetworkConfigurationsByChainId]);

  return { refreshing, onRefresh };
};
