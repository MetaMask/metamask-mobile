import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';
import { MetaMetricsEvents } from '../../../../core/Analytics';

import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectEvmChainId } from '../../../../selectors/networkController';

import type { BrowserTab } from '../../Tokens/types';
import type { BrowserParams } from '../../../Views/Browser/Browser.types';
import { getDecimalChainId } from '../../../../util/networks';
import { useMetrics } from '../../../hooks/useMetrics';
import { isBridgeUrl } from '../../../../util/url';
import { useBuildPortfolioUrl } from '../../../hooks/useBuildPortfolioUrl';

/**
 * Returns a function that is used to navigate to the MetaMask Bridges webpage.
 * @param location location of navigation call – used for analytics.
 * @returns A function that can be used to navigate to the existing Bridges page in the browser. If there isn't an existing bridge page, one is created based on the current chain ID and passed token address (if provided).
 */
export default function useGoToPortfolioBridge(location: string) {
  const chainId = useSelector(selectEvmChainId);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const browserTabs = useSelector((state: any) => state.browser.tabs);
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const buildPortfolioUrlWithMetrics = useBuildPortfolioUrl();
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
      const additionalParams: Record<string, string | number> = {
        srcChain: getDecimalChainId(chainId),
      };

      if (address) {
        additionalParams.token = address;
      }

      const bridgeUrl = buildPortfolioUrlWithMetrics(
        AppConstants.BRIDGE.URL,
        additionalParams,
      );

      params.newTabUrl = bridgeUrl.href;
    }

    navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params,
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BRIDGE_LINK_CLICKED)
        .addProperties({
          bridgeUrl: AppConstants.BRIDGE.URL,
          location,
          chain_id_source: getDecimalChainId(chainId),
          token_address_source: address,
        })
        .build(),
    );
  };
}
