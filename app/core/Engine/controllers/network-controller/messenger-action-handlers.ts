import { isConnectionError } from '@metamask/network-controller';
import { Hex, hexToNumber } from '@metamask/utils';
import {
  getIsOurInfuraEndpointUrl,
  getIsQuicknodeEndpointUrl,
  shouldCreateRpcServiceEvents,
} from './utils';
import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';
import Logger from '../../../../util/Logger';
import onlyKeepHost from '../../../../util/onlyKeepHost';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
} from '../../../Analytics/MetaMetrics.types';

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
 * Note that in production we do not create events *every* time an endpoint is
 * unavailable. If Infura is truly down, this would create millions of events
 * and we would quickly be in trouble with Segment. Instead we only create an
 * event 1% of the time.
 *
 * @param args - The arguments.
 * @param args.chainId - The chain ID that the endpoint represents.
 * @param args.endpointUrl - The URL of the endpoint.
 * @param args.error - The connection or response error encountered after making
 * a request to the RPC endpoint.
 * @param args.infuraProjectId - Our Infura project ID.
 * @param args.trackEvent - The function that will create the Segment event.
 * @param args.metaMetricsId - The MetaMetrics ID of the user.
 */
export function onRpcEndpointUnavailable({
  chainId,
  endpointUrl,
  error,
  infuraProjectId,
  trackEvent,
  metaMetricsId,
}: {
  chainId: Hex;
  endpointUrl: string;
  error: unknown;
  infuraProjectId: string;
  trackEvent: (options: {
    event: IMetaMetricsEvent | ITrackingEvent;
    properties: JsonMap;
  }) => void;
  metaMetricsId: string | undefined;
}): void {
  const isInfuraEndpointUrl = getIsOurInfuraEndpointUrl(
    endpointUrl,
    infuraProjectId,
  );
  const isQuicknodeEndpointUrl = getIsQuicknodeEndpointUrl(endpointUrl);

  if (
    shouldCreateRpcServiceEvents(metaMetricsId) &&
    !isConnectionError(error) &&
    (isInfuraEndpointUrl || isQuicknodeEndpointUrl)
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
 * Note that in production we do not create events *every* time an endpoint is
 * unavailable. If Infura is truly down, this would create millions of events
 * and we would quickly be in trouble with Segment. Instead we only create an
 * event 1% of the time.
 *
 * @param args - The arguments.
 * @param args.chainId - The chain ID that the endpoint represents.
 * @param args.endpointUrl - The URL of the endpoint.
 * @param args.infuraProjectId - Our Infura project ID.
 * @param args.trackEvent - The function that will create the Segment event.
 * @param args.metaMetricsId - The MetaMetrics ID of the user.
 */
export function onRpcEndpointDegraded({
  chainId,
  endpointUrl,
  infuraProjectId,
  trackEvent,
  metaMetricsId,
}: {
  chainId: Hex;
  endpointUrl: string;
  infuraProjectId: string;
  trackEvent: (options: {
    event: IMetaMetricsEvent | ITrackingEvent;
    properties: JsonMap;
  }) => void;
  metaMetricsId: string | undefined;
}): void {
  const isInfuraEndpointUrl = getIsOurInfuraEndpointUrl(
    endpointUrl,
    infuraProjectId,
  );
  const isQuicknodeEndpointUrl = getIsQuicknodeEndpointUrl(endpointUrl);

  if (
    shouldCreateRpcServiceEvents(metaMetricsId) &&
    (isInfuraEndpointUrl || isQuicknodeEndpointUrl)
  ) {
    Logger.log(
      `Creating Segment event "${
        MetaMetricsEvents.RPC_SERVICE_DEGRADED.category
      }" with chain_id_caip: "eip155:${hexToNumber(
        chainId,
      )}", rpc_endpoint_url: ${onlyKeepHost(endpointUrl)}`,
    );
    trackEvent({
      event: MetaMetricsEvents.RPC_SERVICE_DEGRADED,
      properties: {
        chain_id_caip: `eip155:${hexToNumber(chainId)}`,
        rpc_endpoint_url: onlyKeepHost(endpointUrl),
      },
    });
  }
}
