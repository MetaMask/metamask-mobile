import React from 'react';
import type { Hex } from '@metamask/utils';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { NO_RPC_BLOCK_EXPLORER } from '../../../../../constants/network';
import {
  findBlockExplorerUrlForChain,
  getBlockExplorerName,
} from '../../../../../util/networks';
import { trackBlockExplorerLinkClicked } from '../../../../../util/analytics/externalLinkTracking';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { strings } from '../../../../../../locales/i18n';
import TransactionsFooter from '../../../Transactions/TransactionsFooter';

interface EvmActivityFooterProps {
  chainId: Hex | undefined;
  address: string;
  navigation: AppNavigationProp;
  networkConfigurations: ReturnType<
    typeof selectEvmNetworkConfigurationsByChainId
  >;
}

export default function EvmActivityFooter({
  chainId,
  address,
  navigation,
  networkConfigurations,
}: EvmActivityFooterProps): React.ReactElement {
  const analytics = useAnalytics();
  const explorer = chainId
    ? findBlockExplorerUrlForChain(chainId, networkConfigurations)
    : undefined;
  const base =
    address && explorer !== NO_RPC_BLOCK_EXPLORER ? explorer : undefined;

  return (
    <TransactionsFooter
      chainId={address ? chainId : undefined}
      rpcBlockExplorer={base}
      omitGlobalProviderExplorerFallback
      showDisclaimer
      onViewBlockExplorer={() => {
        if (!base) return;
        const url = `${base.replace(/\/$/u, '')}/address/${address}`;
        const title = getBlockExplorerName(base);
        trackBlockExplorerLinkClicked<
          Parameters<typeof analytics.trackEvent>[0]
        >(
          (event) => analytics.trackEvent(event),
          (event) => analytics.createEventBuilder(event),
          {
            location: 'transactions_list',
            text: title
              ? `${strings('transactions.view_full_history_on')} ${title}`
              : strings('asset_details.options.view_on_block'),
            url,
          },
        );
        navigation.navigate('Webview', {
          screen: 'SimpleWebview',
          params: { url, title },
        });
      }}
    />
  );
}
