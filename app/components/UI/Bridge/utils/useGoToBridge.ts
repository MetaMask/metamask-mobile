import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';
import { Analytics, MetaMetricsEvents } from '../../../../core/Analytics';

import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import type { BrowserTab } from '../../Tokens/types';
import type { BrowserParams } from '../../../../components/Views/Browser/Browser.types';

const BRIDGE_URL = `${AppConstants.PORTFOLIO_URL}/bridge`;

export default function useGoToBridge(location: string) {
  const browserTabs = useSelector((state: any) => state.browser.tabs);
  const { navigate } = useNavigation();

  return (chainId: string, address?: string) => {
    const existingBridgeTab = browserTabs.find((tab: BrowserTab) =>
      tab.url.match(new RegExp(`${BRIDGE_URL}/(?![a-z])`)),
    );

    const params: BrowserParams & { existingTabId?: string } = {
      timestamp: Date.now(),
    };

    if (existingBridgeTab) {
      params.newTabUrl = undefined;
      params.existingTabId = existingBridgeTab.id;
    } else {
      params.newTabUrl = `${BRIDGE_URL}/?metamaskEntry=mobile&srcChain=${chainId}${
        address ? `&token=${address}` : ''
      }`;
    }

    navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params,
    });
    Analytics.trackEvent(MetaMetricsEvents.BRIDGE_LINK_CLICKED, {
      bridgeUrl: BRIDGE_URL,
      location,
      chain_id_source: chainId,
      token_address_source: address,
    });
  };
}
