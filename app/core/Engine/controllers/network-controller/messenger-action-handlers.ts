import { Hex, Json, hexToNumber, isObject, isValidJson } from '@metamask/utils';
import { shouldCreateRpcServiceEvents } from './utils';
import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';
import Logger from '../../../../util/Logger';
import onlyKeepHost from '../../../../util/onlyKeepHost';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
} from '../../../Analytics/MetaMetrics.types';

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
 * @param args.trackEvent - The function that will create the Segment event.
 * @param args.metaMetricsId - The MetaMetrics ID of the user.
 */
export function onRpcEndpointUnavailable({
  chainId,
  endpointUrl,
  error,
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
  if (!shouldCreateRpcServiceEvents(error, metaMetricsId)) {
    return;
  }

  // The case of the Segment properties are intentional.
  /* eslint-disable @typescript-eslint/naming-convention */
  const properties: Json = {
    chain_id_caip: `eip155:${hexToNumber(chainId)}`,
    rpc_endpoint_url: onlyKeepHost(endpointUrl),
  };
  if (
    isObject(error) &&
    'httpStatus' in error &&
    isValidJson(error.httpStatus)
  ) {
    properties.http_status = error.httpStatus;
  }
  /* eslint-enable @typescript-eslint/naming-convention */

  Logger.log(
    `Creating Segment event "${
      MetaMetricsEvents.RPC_SERVICE_UNAVAILABLE
    }" with ${JSON.stringify(properties)}`,
  );
  trackEvent({
    event: MetaMetricsEvents.RPC_SERVICE_UNAVAILABLE,
    properties,
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
 * @param args.error - The connection or response error encountered after making
 * a request to the RPC endpoint.
 * @param args.endpointUrl - The URL of the endpoint.
 * @param args.infuraProjectId - Our Infura project ID.
 * @param args.trackEvent - The function that will create the Segment event.
 * @param args.metaMetricsId - The MetaMetrics ID of the user.
 */
export function onRpcEndpointDegraded({
  chainId,
  endpointUrl,
  error,
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
  metaMetricsId: string | null;
}): void {
  if (!shouldCreateRpcServiceEvents(error, metaMetricsId)) {
    return;
  }

  // The case of the Segment properties are intentional.
  /* eslint-disable @typescript-eslint/naming-convention */
  const properties: Json = {
    chain_id_caip: `eip155:${hexToNumber(chainId)}`,
    rpc_endpoint_url: onlyKeepHost(endpointUrl),
  };
  if (
    isObject(error) &&
    'httpStatus' in error &&
    isValidJson(error.httpStatus)
  ) {
    properties.http_status = error.httpStatus;
  }
  /* eslint-enable @typescript-eslint/naming-convention */

  Logger.log(
    `Creating Segment event "${
      MetaMetricsEvents.RPC_SERVICE_DEGRADED
    }" with ${JSON.stringify(properties)}`,
  );
  trackEvent({
    event: MetaMetricsEvents.RPC_SERVICE_DEGRADED,
    properties,
  });
}
