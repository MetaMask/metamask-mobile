import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';
import { MetaMetricsEvents } from '../../../../core/Analytics';

import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectChainId } from '../../../../selectors/networkController';

import type { BrowserTab } from '../../Tokens/types';
import type { BrowserParams } from '../../../../components/Views/Browser/Browser.types';
import { getDecimalChainId } from '../../../../util/networks';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import { isBridgeUrl } from '../../../../util/url';

/**
 * Returns a function that is used to navigate to the MetaMask Bridges webpage.
 * @param location location of navigation call – used for analytics.
 * @returns A function that can be used to navigate to the existing Bridges page in the browser. If there isn't an existing bridge page, one is created based on the current chain ID and passed token address (if provided).
 */
export default function useGoToBridge(location: string) {
  const chainId = useSelector(selectChainId);
  const browserTabs = useSelector((state: any) => state.browser.tabs);
  const { navigate } = useNavigation();
  const { trackEvent } = useMetrics();
  return (address?: string) => {
    const existingBridgeTab = browserTabs.find((tab: BrowserTab) =>
      isBridgeUrl(tab.url),
    );

    const params: BrowserParams & { existingTabId?: string } = {
      timestamp: Date.now(),
    };

    if (existingBridgeTab) {
      params.newTabUrl = undefined;
      params.existingTabId = existingBridgeTab.id;
    } else {
      params.newTabUrl = `${
        AppConstants.BRIDGE.URL
      }/?metamaskEntry=mobile&srcChain=${getDecimalChainId(chainId)}${
        address ? `&token=${address}` : ''
      }`;
    }

    navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params,
    });
    trackEvent(MetaMetricsEvents.BRIDGE_LINK_CLICKED, {
      bridgeUrl: AppConstants.BRIDGE.URL,
      location,
      chain_id_source: getDecimalChainId(chainId),
      token_address_source: address,
    });
  };
}
