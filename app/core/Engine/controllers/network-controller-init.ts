import { ControllerInitFunction } from '../types';
import {
  getDefaultNetworkControllerState,
  NetworkController,
  NetworkState,
} from '@metamask/network-controller';
import {
  NetworkControllerInitMessenger,
  NetworkControllerMessenger,
} from '../messengers/network-controller-messenger';
import { ChainId } from '@metamask/controller-utils';
import { getFailoverUrlsForInfuraNetwork } from '../../../util/networks/customNetworks';
import { INFURA_PROJECT_ID } from '../../../constants/network';
import { SECOND } from '../../../constants/time';
import { getIsQuicknodeEndpointUrl } from './network-controller/utils';
import {
  onRpcEndpointDegraded,
  onRpcEndpointUnavailable,
} from './network-controller/messenger-action-handlers';
import { MetricsEventBuilder } from '../../Analytics/MetricsEventBuilder';
import { MetaMetrics } from '../../Analytics';
import { Hex } from '@metamask/utils';

const NON_EMPTY = 'NON_EMPTY';

export const ADDITIONAL_DEFAULT_NETWORKS = [
  ChainId['megaeth-testnet'],
  ChainId['monad-testnet'],
];

export function getInitialNetworkControllerState(persistedState: {
  NetworkController?: Partial<NetworkState>;
}) {
  let initialNetworkControllerState =
    persistedState.NetworkController as NetworkState;

  if (!initialNetworkControllerState) {
    initialNetworkControllerState = getDefaultNetworkControllerState(
      ADDITIONAL_DEFAULT_NETWORKS,
    );

    // Add failovers for default Infura RPC endpoints
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId.mainnet
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('ethereum-mainnet');
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['linea-mainnet']
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('linea-mainnet');
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['base-mainnet']
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('base-mainnet');

    // Update default popular network names
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId.mainnet
    ].name = 'Ethereum';
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['linea-mainnet']
    ].name = 'Linea';
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['base-mainnet']
    ].name = 'Base';
  }

  return initialNetworkControllerState;
}

/**
 * Initialize the network controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const networkControllerInit: ControllerInitFunction<
  NetworkController,
  NetworkControllerMessenger,
  NetworkControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const infuraProjectId = INFURA_PROJECT_ID || NON_EMPTY;

  const controller = new NetworkController({
    infuraProjectId,
    state: getInitialNetworkControllerState(persistedState),
    messenger: controllerMessenger,
    getBlockTrackerOptions: () =>
      process.env.IN_TEST
        ? {}
        : {
            pollingInterval: 20 * SECOND,
            // The retry timeout is pretty short by default, and if the endpoint is
            // down, it will end up exhausting the max number of consecutive
            // failures quickly.
            retryTimeout: 20 * SECOND,
          },

    getRpcServiceOptions: (rpcEndpointUrl: string) => {
      const maxRetries = 4;
      const commonOptions = {
        fetch: globalThis.fetch.bind(globalThis),
        btoa: globalThis.btoa.bind(globalThis),
      };

      if (getIsQuicknodeEndpointUrl(rpcEndpointUrl)) {
        return {
          ...commonOptions,
          policyOptions: {
            maxRetries,
            // When we fail over to Quicknode, we expect it to be down at
            // first while it is being automatically activated. If an endpoint
            // is down, the failover logic enters a "cooldown period" of 30
            // minutes. We'd really rather not enter that for Quicknode, so
            // keep retrying longer.
            maxConsecutiveFailures: (maxRetries + 1) * 14,
          },
        };
      }

      return {
        ...commonOptions,
        policyOptions: {
          maxRetries,
          // Ensure that the circuit does not break too quickly.
          maxConsecutiveFailures: (maxRetries + 1) * 7,
        },
      };
    },
    additionalDefaultNetworks: ADDITIONAL_DEFAULT_NETWORKS,
  });

  initMessenger.subscribe(
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
        infuraProjectId,
        error,
        trackEvent: ({ event, properties }) => {
          const metricsEvent = MetricsEventBuilder.createEventBuilder(event)
            .addProperties(properties)
            .build();
          MetaMetrics.getInstance().trackEvent(metricsEvent);
        },
        metaMetricsId: await MetaMetrics.getInstance().getMetaMetricsId(),
      });
    },
  );

  initMessenger.subscribe(
    'NetworkController:rpcEndpointDegraded',
    async ({
      chainId,
      endpointUrl,
      error,
    }: {
      chainId: Hex;
      endpointUrl: string;
      error: unknown;
    }) => {
      onRpcEndpointDegraded({
        chainId,
        endpointUrl,
        error,
        infuraProjectId,
        trackEvent: ({ event, properties }) => {
          const metricsEvent = MetricsEventBuilder.createEventBuilder(event)
            .addProperties(properties)
            .build();
          MetaMetrics.getInstance().trackEvent(metricsEvent);
        },
        metaMetricsId: await MetaMetrics.getInstance().getMetaMetricsId(),
      });
    },
  );

  controller.initializeProvider();

  return {
    controller,
  };
};
