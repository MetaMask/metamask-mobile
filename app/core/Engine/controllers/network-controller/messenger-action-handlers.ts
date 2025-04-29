import { isConnectionError } from '@metamask/network-controller';
import { Hex, hexToNumber } from '@metamask/utils';
import onlyKeepHost from '../../../../util/onlyKeepHost';
import { IMetaMetricsEvent, MetaMetricsEvents } from '../../../Analytics';
import Logger from '../../../../util/Logger';
import { ITrackingEvent, JsonMap } from '../../../Analytics/MetaMetrics.types';
import { getIsInfuraEndpointUrl, getIsQuicknodeEndpointUrl } from './utils';

/**
 * Handler for the `NetworkController:rpcEndpointUnavailable` messenger action,
 * which is called when an RPC endpoint cannot be reached or does not respond
 * successfully after a sufficient number of retries.
 *
 * In this case:
 *
 * - When we detect that Infura is down, we create an event in Segment so that
 * Quicknode can be automatically enabled.
 * - When we detect that Quicknode is down, we create an event in Segment so
 * that Quicknode can be automatically re-enabled.
 *
 * @param args - The arguments.
 * @param args.chainId - The chain ID that the endpoint represents.
 * @param args.endpointUrl - The URL of the endpoint.
 * @param args.error - The connection or response error encountered after making
 * a request to the RPC endpoint.
 * @param args.infuraProjectId - Our Infura project ID.
 * @param args.trackEvent - The function that will create the Segment event.
 */
export function onRpcEndpointUnavailable({
  chainId,
  endpointUrl,
  error,
  infuraProjectId,
  trackEvent,
}: {
  chainId: Hex;
  endpointUrl: string;
  error: unknown;
  infuraProjectId: string;
  trackEvent: (options: {
    event: IMetaMetricsEvent | ITrackingEvent;
    properties: JsonMap;
  }) => void;
}): void {
  const isInfuraEndpointUrl = getIsInfuraEndpointUrl(
    endpointUrl,
    infuraProjectId,
  );
  const isQuicknodeEndpointUrl = getIsQuicknodeEndpointUrl(endpointUrl);
  if (
    (isInfuraEndpointUrl || isQuicknodeEndpointUrl) &&
    !isConnectionError(error)
  ) {
    Logger.log(
      `Creating Segment event "${
        MetaMetricsEvents.RPC_SERVICE_UNAVAILABLE.category
      }" with chain_id_caip: "eip155:${hexToNumber(
        chainId,
      )}", rpc_endpoint_url: ${onlyKeepHost(endpointUrl)}`,
    );
    trackEvent({
      event: MetaMetricsEvents.RPC_SERVICE_UNAVAILABLE,
      properties: {
        chain_id_caip: `eip155:${hexToNumber(chainId)}`,
        rpc_endpoint_url: onlyKeepHost(endpointUrl),
      },
    });
  }
}

/**
 * Handler for the `NetworkController:rpcEndpointDegraded` messenger action,
 * which is called when an RPC endpoint is slow to return a successful response,
 * or it cannot be reached or does not respond successfully after some number of
 * retries.
 *
 * In this case, when we detect that Infura or Quicknode are degraded, we create
 * an event in Segment so that we know to investigate further.
 *
 * @param args - The arguments.
 * @param args.chainId - The chain ID that the endpoint represents.
 * @param args.endpointUrl - The URL of the endpoint.
 * @param args.infuraProjectId - Our Infura project ID.
 * @param args.trackEvent - The function that will create the Segment event.
 */
export function onRpcEndpointDegraded({
  chainId,
  endpointUrl,
  infuraProjectId,
  trackEvent,
}: {
  chainId: Hex;
  endpointUrl: string;
  infuraProjectId: string;
  trackEvent: (options: {
    event: IMetaMetricsEvent | ITrackingEvent;
    properties: JsonMap;
  }) => void;
}): void {
  const isInfuraEndpointUrl = getIsInfuraEndpointUrl(
    endpointUrl,
    infuraProjectId,
  );
  const isQuicknodeEndpointUrl = getIsQuicknodeEndpointUrl(endpointUrl);
  if (isInfuraEndpointUrl || isQuicknodeEndpointUrl) {
    Logger.log(
      `Creating Segment event "${
        MetaMetricsEvents.RPC_SERVICE_DEGRADED.category
      }" with chain_id_caip: "eip155:${chainId}", rpc_endpoint_url: ${onlyKeepHost(
        endpointUrl,
      )}`,
    );
    trackEvent({
      event: MetaMetricsEvents.RPC_SERVICE_DEGRADED,
      properties: {
        chain_id_caip: `eip155:${chainId}`,
        rpc_endpoint_url: onlyKeepHost(endpointUrl),
      },
    });
  }
}
