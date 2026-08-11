import { WalletOptions } from '@metamask/wallet';
import { INFURA_PROJECT_ID } from '../../../../constants/network';
import { getFailoverUrlsByChainId } from '../../../../util/networks/network-failover';
import { RootMessenger } from '../../types';
import { Hex } from '@metamask/utils';
import {
  onRpcEndpointDegraded,
  onRpcEndpointUnavailable,
} from '../../controllers/network-controller/messenger-action-handlers';
import { buildAndTrackEvent } from '../../utils';

export function getNetworkControllerInstanceOptions(): WalletOptions['instanceOptions']['networkController'] {
  return {
    infuraProjectId: INFURA_PROJECT_ID as string,
    failoverUrls: getFailoverUrlsByChainId(),
  };
}

export function setupRpcEndpointMetrics(messenger: RootMessenger) {
  messenger.subscribe(
    'NetworkController:rpcEndpointUnavailable',
    async ({
      chainId,
      endpointUrl,
      error,
    }: {
      chainId: Hex;
      endpointUrl: string;
      error: unknown;
    }) => {
      onRpcEndpointUnavailable({
        chainId,
        endpointUrl,
        infuraProjectId: INFURA_PROJECT_ID as string,
        error,
        trackEvent: ({ event, properties }) => {
          buildAndTrackEvent(messenger, event, properties);
        },
        metaMetricsId: messenger.call('AnalyticsController:getState')
          .analyticsId,
      });
    },
  );

  messenger.subscribe(
    'NetworkController:rpcEndpointDegraded',
    async ({
      chainId,
      duration,
      endpointUrl,
      error,
      rpcMethodName,
      traceId,
      type,
      retryReason,
    }) => {
      onRpcEndpointDegraded({
        chainId,
        duration,
        endpointUrl,
        error,
        infuraProjectId: INFURA_PROJECT_ID as string,
        retryReason,
        rpcMethodName,
        traceId,
        trackEvent: ({ event, properties }) => {
          buildAndTrackEvent(messenger, event, properties);
        },
        metaMetricsId: messenger.call('AnalyticsController:getState')
          .analyticsId,
        type,
      });
    },
  );
}
