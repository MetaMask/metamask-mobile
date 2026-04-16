import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { performEvmTokenRefresh } from '../../UI/Tokens/util/tokenRefreshUtils';
import { useMerklBonusClaim } from '../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim';
import { MUSD_MAINNET_ASSET_FOR_DETAILS } from '../Homepage/Sections/Cash/CashGetMusdEmptyState.constants';
import { MUSD_EVENTS_CONSTANTS } from '../../UI/Earn/constants/events/musdEvents';
import Logger from '../../../util/Logger';

const { EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

/**
 * Refresh orchestrator for CashTokensFullView pull-to-refresh.
 * Composes:
 * - EVM token data (balances, rates, detection) via performEvmTokenRefresh.
 * This covers both useMusdBalance and useMusdConversionTokens derivations.
 * - Merkl claim-bonus data via useMerklBonusClaim.refetch.
 *
 * Note: CurrencyRateController.updateExchangeRate is NOT refreshed here, matching
 * the wallet token list's behavior. If fiat/USD drift becomes a UX issue, upgrade
 * to performEvmRefresh (supply nativeCurrencies).
 */
export const useCashTokensRefresh = () => {
  const [refreshing, setRefreshing] = useState(false);
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  // `isVisible=false` to avoid firing the CTA-available analytics event from
  // this secondary mount — AssetOverviewClaimBonus already fires it.
  const { refetch: refetchMerklBonus } = useMerklBonusClaim(
    MUSD_MAINNET_ASSET_FOR_DETAILS,
    EVENT_LOCATIONS.MOBILE_TOKEN_LIST_PAGE,
    false,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        performEvmTokenRefresh(evmNetworkConfigurationsByChainId),
        Promise.resolve(refetchMerklBonus()),
      ]);
    } catch (error) {
      Logger.error(error as Error, 'useCashTokensRefresh: refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [evmNetworkConfigurationsByChainId, refetchMerklBonus]);

  return { refreshing, onRefresh };
};
