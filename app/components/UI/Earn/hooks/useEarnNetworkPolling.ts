import { toHex } from '@metamask/controller-utils';
import { CHAIN_ID_TO_AAVE_POOL_CONTRACT } from '@metamask/stake-sdk';
import { Hex } from '@metamask/utils';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectUseTokenDetection } from '../../../../selectors/preferencesController';
import useCurrencyRatePolling from '../../../hooks/AssetPolling/useCurrencyRatePolling';
import useTokenBalancesPolling from '../../../hooks/AssetPolling/useTokenBalancesPolling';
import useTokenDetectionPolling from '../../../hooks/AssetPolling/useTokenDetectionPolling';
import useTokenRatesPolling from '../../../hooks/AssetPolling/useTokenRatesPolling';
import { EVM_SCOPE } from '../constants/networks';

/**
 * Chain IDs that support lending functionality through Aave pools.
 */
const LENDING_CHAIN_IDS: Hex[] = Object.keys(
  CHAIN_ID_TO_AAVE_POOL_CONTRACT,
).map((chainId) => toHex(chainId as Hex));

/**
 * Hook that provides multi-network polling for Earn/lending functionality.
 *
 * This hook ensures that all lending tokens across networks can be detected and added to the state.
 * When the app first initializes we currently start with the single network mainnet selected
 * This view does not load tokens for other networks, but the lending token list is available for the
 * single network view. To get the tokens for other networks we need to detect them and add them to the state.
 *
 * The hook implements a lazy loading approach where polling only starts when the component using this hook mounts, and
 * automatically stops when the component unmounts.
 *
 * ## Key Features:
 *
 * ### Automatic Token Import
 * - Scans for detected tokens across all lending networks and adds them when found
 * - Automatically imports detected lending tokens into the user's wallet if autodeetection is enabled
 *
 * ### Performance Optimization
 * - Lazy loading: Only activates when Earn component is mounted
 * - Automatic cleanup: Stops polling on component unmount
 * - Conditional detection: Only runs token detection if enabled in preferences
 *
 * ## Error Handling:
 * - Gracefully handles missing network clients with warning logs
 * - Continues operation even if some chains are unavailable
 * - Catches and logs token detection failures
 *
 * @returns {void} This hook doesn't return any values, it only manages side effects
 */
export const useEarnNetworkPolling = () => {
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const useTokenDetection = useSelector(selectUseTokenDetection);

  useTokenBalancesPolling({ chainIds: LENDING_CHAIN_IDS });
  useCurrencyRatePolling({ chainIds: LENDING_CHAIN_IDS });
  useTokenRatesPolling({ chainIds: LENDING_CHAIN_IDS });
  useTokenDetectionPolling({
    chainIds: useTokenDetection ? LENDING_CHAIN_IDS : [],
    address: selectedAccount?.address as Hex,
  });

  // Import tokens from all lending chains
  useEffect(() => {
    Engine.context.TokenDetectionController.detectTokens({
      chainIds: LENDING_CHAIN_IDS,
      selectedAddress: selectedAccount?.address as Hex,
    }).catch(console.error);
  }, [selectedAccount?.address]);

  return null;
};

export default useEarnNetworkPolling;
