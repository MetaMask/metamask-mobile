import { NetworkController, NetworkStatus } from '@metamask/network-controller';
import { Hex, hexToNumber, KnownCaipNamespace } from '@metamask/utils';
import { NetworkEnablementController } from '@metamask/network-enablement-controller';
import { store } from '../../../../store';
import { toggleSlowRpcConnectionBanner } from '../../../../actions/modals';
import Logger from '../../../../util/Logger';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
} from '../../../Analytics/MetaMetrics.types';
import { MetaMetricsEvents } from '../../../Analytics';

const BANNER_TIMEOUT = 5000; // 5 seconds - shows banner

/**
 * Monitor network initialization status and provide user feedback for slow connections
 *
 * This function tracks the availability status of all enabled networks after calling
 * lookupNetwork on them. It provides progressive user feedback:
 * - Shows a banner after 5 seconds for the first network that fails to become available
 * - Saves the slow network's chainId in Redux state for direct RPC editing
 * - Allows users to edit the RPC URL of the problematic network without switching to it
 *
 * @param networkController - The NetworkController instance to monitor
 * @param networkEnablementController - The NetworkEnablementController to get enabled networks
 * @returns void - Sets up monitoring and returns immediately
 */
export function monitorNetworkInitialization({
  networkController,
  networkEnablementController,
  trackEvent,
}: {
  networkController: NetworkController;
  networkEnablementController: NetworkEnablementController;
  trackEvent: (options: {
    event: IMetaMetricsEvent | ITrackingEvent;
    properties: JsonMap;
  }) => void;
}): void {
  let hasShownBanner = false;

  const networkEnablementControllerState = networkEnablementController.state;

  const eip155Networks =
    networkEnablementControllerState?.enabledNetworkMap?.[
      KnownCaipNamespace.Eip155
    ];

  // Track networkClientIds that we're looking up
  const lookupNetworkClientIds: string[] = [];

  for (const networkChainId of Object.keys(eip155Networks)) {
    if (eip155Networks[networkChainId as Hex]) {
      const networkClientId = networkController.findNetworkClientIdByChainId(
        networkChainId as Hex,
      );
      if (networkClientId) {
        lookupNetworkClientIds.push(networkClientId);
        networkController.lookupNetwork(networkClientId);
      }
    }
  }

  // Show banner after 5 seconds for networks that aren't available
  setTimeout(() => {
    // Check status of all networks we called lookupNetwork on
    for (const networkClientId of lookupNetworkClientIds) {
      const networkMetadata =
        networkController.state.networksMetadata[networkClientId];
      const networkStatus = networkMetadata?.status;

      if (networkStatus !== NetworkStatus.Available) {
        const networkConfig =
          networkController.getNetworkConfigurationByNetworkClientId(
            networkClientId,
          );

        if (!networkConfig) {
          Logger.log(
            `Network initialization slow - no network config found for ${networkClientId}`,
          );
          continue;
        }

        // Show the banner for the first slow network only
        if (!hasShownBanner) {
          hasShownBanner = true;

          const { chainId, name } = networkConfig;

          Logger.log(
            `Network initialization slow - showing banner for ${name} (${chainId})`,
          );

          store.dispatch(
            toggleSlowRpcConnectionBanner({
              visible: true,
              chainId,
            }),
          );

          // Tracking the event
          const event = MetaMetricsEvents.SLOW_RPC_MONITORING_BANNER_SHOWN;
          // The names of Segment properties have a particular case.
          /* eslint-disable @typescript-eslint/naming-convention */
          const properties = {
            chain_id_caip: `eip155:${hexToNumber(chainId)}`,
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
          break;
        }
      }
    }
  }, BANNER_TIMEOUT);
}
