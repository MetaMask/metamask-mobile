import type {
  DegradedEventType,
  RetryReason,
} from '@metamask/network-controller';
import { type Hex, hexToNumber, isObject, isValidJson } from '@metamask/utils';
import { isPublicEndpointUrl, shouldCreateRpcServiceEvents } from './utils';
import Logger from '../../../../util/Logger';
import onlyKeepHost from '../../../../util/onlyKeepHost';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
} from '../../../Analytics/MetaMetrics.types';
import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';

/**
 * Called when an endpoint is determined to be "unavailable". Creates a Segment
 * event so we can understand failures better and so that we can automatically
 * activate Quicknode when Infura is down.
 *
 * Note that in production we do not create events *every* time an endpoint is
 * unavailable. In the case where the endpoint is truly down, this would create
 * millions of events and we would blow past our Segment quota. Instead we only
 * create an event 1% of the time.
 *
 * @param args - The arguments.
 * @param args.chainId - The chain ID that the endpoint represents.
 * @param args.endpointUrl - The URL of the endpoint.
 * @param args.error - The connection or response error encountered after making
 * a request to the RPC endpoint.
 * @param args.infuraProjectId - Our Infura project ID.
 * @param args.metaMetricsId - The MetaMetrics ID of the user.
 * @param args.trackEvent - The function that will create the Segment event.
 */
export function onRpcEndpointUnavailable({
  chainId,
  endpointUrl,
  error,
  infuraProjectId,
  metaMetricsId,
  trackEvent,
}: {
  chainId: Hex;
  endpointUrl: string;
  error: unknown;
  infuraProjectId: string;
  metaMetricsId: string | null | undefined;
  trackEvent: (options: {
    event: IMetaMetricsEvent | ITrackingEvent;
    properties: JsonMap;
  }) => void;
}): void {
  trackRpcEndpointEvent(MetaMetricsEvents.RPC_SERVICE_UNAVAILABLE, {
    chainId,
    endpointUrl,
    error,
    infuraProjectId,
    metaMetricsId,
    trackEvent,
  });
}

/**
 * Called when an endpoint is determined to be "degraded". Creates a Segment
 * event so we can understand failures better.
 *
 * Note that in production we do not create events *every* time an endpoint is
 * unavailable. In the case where the endpoint is down, this would create
 * millions of events and we would blow past our Segment quota. Instead we only
 * create an event 1% of the time.
 *
 * @param args - The arguments.
 * @param args.chainId - The chain ID that the endpoint represents.
 * @param args.endpointUrl - The URL of the endpoint.
 * @param args.error - The connection or response error encountered after making
 * a request to the RPC endpoint.
 * @param args.infuraProjectId - Our Infura project ID.
 * @param args.metaMetricsId - The MetaMetrics ID of the user.
 * @param args.retryReason - The category of error that was retried (only
 * present when `type` is `'retries_exhausted'`).
 * @param args.rpcMethodName - The JSON-RPC method that was being executed.
 * @param args.trackEvent - The function that will create the Segment event.
 * @param args.type - Why the endpoint became degraded (`'slow_success'` or
 * `'retries_exhausted'`).
 */
export function onRpcEndpointDegraded({
  chainId,
  endpointUrl,
  error,
  infuraProjectId,
  metaMetricsId,
  retryReason,
  rpcMethodName,
  trackEvent,
  type,
}: {
  chainId: Hex;
  endpointUrl: string;
  error: unknown;
  infuraProjectId: string;
  metaMetricsId: string | null | undefined;
  retryReason?: RetryReason;
  rpcMethodName: string;
  trackEvent: (options: {
    event: IMetaMetricsEvent | ITrackingEvent;
    properties: JsonMap;
  }) => void;
  type: DegradedEventType;
}): void {
  trackRpcEndpointEvent(MetaMetricsEvents.RPC_SERVICE_DEGRADED, {
    chainId,
    endpointUrl,
    error,
    infuraProjectId,
    metaMetricsId,
    retryReason,
    rpcMethodName,
    trackEvent,
    type,
  });
}

/**
 * Creates a Segment event when an RPC endpoint is determined to be degraded or
 * unavailable.
 *
 * @param event - The Segment event to create.
 * @param args - The remaining arguments.
 * @param args.chainId - The chain ID that the endpoint represents.
 * @param args.endpointUrl - The URL of the endpoint.
 * @param args.error - The connection or response error encountered after making
 * a request to the RPC endpoint.
 * @param args.infuraProjectId - Our Infura project ID.
 * @param args.metaMetricsId - The MetaMetrics ID of the user.
 * @param args.retryReason - The category of error that was retried (only
 * present for degraded events when `type` is `'retries_exhausted'`).
 * @param args.rpcMethodName - The JSON-RPC method that was being executed
 * (only present for degraded events).
 * @param args.trackEvent - The function that will create the Segment event.
 * @param args.type - Why the endpoint became degraded (only present for
 * degraded events).
 */
export function trackRpcEndpointEvent(
  event: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents],
  {
    chainId,
    endpointUrl,
    error,
    infuraProjectId,
    retryReason,
    rpcMethodName,
    trackEvent,
    type,
    metaMetricsId,
  }: {
    chainId: Hex;
    endpointUrl: string;
    error: unknown;
    infuraProjectId: string;
    retryReason?: RetryReason;
    rpcMethodName?: string;
    trackEvent: (options: {
      event: IMetaMetricsEvent | ITrackingEvent;
      properties: JsonMap;
    }) => void;
    type?: DegradedEventType;
    metaMetricsId: string | null | undefined;
  },
): void {
  if (
    !shouldCreateRpcServiceEvents({
      error,
      metaMetricsId,
    })
  ) {
    return;
  }

  const isPublicEndpoint = isPublicEndpointUrl(endpointUrl, infuraProjectId);
  const rpcDomain = isPublicEndpoint ? onlyKeepHost(endpointUrl) : 'custom';
  // The names of Segment properties have a particular case.
  /* eslint-disable @typescript-eslint/naming-convention */
  const properties = {
    chain_id_caip: `eip155:${hexToNumber(chainId)}`,
    // @deprecated: will be removed in a future release
    rpc_endpoint_url: rpcDomain,
    rpc_domain: rpcDomain,
    ...(rpcMethodName ? { rpc_method_name: rpcMethodName } : {}),
    ...(type ? { type } : {}),
    ...(retryReason ? { retry_reason: retryReason } : {}),
    ...(isObject(error) &&
    'httpStatus' in error &&
    isValidJson(error.httpStatus)
      ? { http_status: error.httpStatus }
      : {}),
  };
  /* eslint-enable @typescript-eslint/naming-convention */

  Logger.log(
    `Creating Segment event "${event.category}" with ${JSON.stringify(
      properties,
    )}`,
  );

  trackEvent({
    event,
    properties,
  });
}
