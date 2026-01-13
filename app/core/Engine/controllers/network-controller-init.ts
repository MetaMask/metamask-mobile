import { ControllerInitFunction } from '../types';
import {
  getDefaultNetworkControllerState,
  NetworkController,
  NetworkState,
  type NetworkControllerMessenger,
} from '@metamask/network-controller';
import { NetworkControllerInitMessenger } from '../messengers/network-controller-messenger';
import { ChainId, DEFAULT_MAX_RETRIES } from '@metamask/controller-utils';
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
import { Hex, Json } from '@metamask/utils';
import Logger from '../../../util/Logger';

const NON_EMPTY = 'NON_EMPTY';

export const ADDITIONAL_DEFAULT_NETWORKS = [
  ChainId['megaeth-testnet-v2'], // MegaETH Testnet V2 (0x18c7) - UPDATED from megaeth-testnet
  ChainId['monad-testnet'], // Monad Testnet (0x279f)
  // New additions for 20+ network performance testing spike
  ChainId['fantom-mainnet'], // Fantom Opera (0xfa)
  ChainId['gnosis-mainnet'], // Gnosis Chain (0x64)
  ChainId['celo-mainnet'], // Celo (0xa4ec)
  ChainId['cronos-mainnet'], // Cronos (0x19)
  ChainId.aurora, // Aurora (0x4e454152)
  ChainId['moonbeam-mainnet'], // Moonbeam (0x504)
  ChainId['moonriver-mainnet'], // Moonriver (0x505)
  ChainId['klaytn-mainnet'], // Klaytn (0x2019)
  ChainId['avalanche-mainnet'], // Avalanche (0xa86a) - FIXED: was ChainId.AvalancheMainnet
  ChainId['zksync-era-mainnet'], // zkSync Era (0x144) - FIXED: was ChainId.ZkSyncEraMainnet
  ChainId['palm-mainnet'], // Palm (0x2a15c308d) - FIXED: was ChainId.PalmMainnet
  ChainId['hypervm-mainnet'], // HyperEVM (0x3e7) - FIXED: was ChainId.HyperEvmMainnet
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
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['arbitrum-mainnet']
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('arbitrum-mainnet');
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['bsc-mainnet']
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('bsc-mainnet');
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['optimism-mainnet']
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('optimism-mainnet');
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['polygon-mainnet']
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('polygon-mainnet');

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
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['arbitrum-mainnet']
    ].name = 'Arbitrum';
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['bsc-mainnet']
    ].name = 'BNB Chain';
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['optimism-mainnet']
    ].name = 'OP';
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['polygon-mainnet']
    ].name = 'Polygon';

    // NOTE: Sei is now included in the default networks for 20+ network performance testing
    // Commented out to allow Sei to appear in Popular networks
    // delete initialNetworkControllerState.networkConfigurationsByChainId[
    //   ChainId['sei-mainnet']
    // ];
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
      // Note that the total number of attempts is 1 more than this
      // (which is why we add 1 below).
      const maxRetries = DEFAULT_MAX_RETRIES;
      const commonOptions = {
        fetch: globalThis.fetch.bind(globalThis),
        btoa: globalThis.btoa.bind(globalThis),
      };
      const commonPolicyOptions = {
        // Ensure that the "cooldown" period after breaking the circuit is short.
        circuitBreakDuration: 30 * SECOND,
        maxRetries,
      };

      if (getIsQuicknodeEndpointUrl(rpcEndpointUrl)) {
        return {
          ...commonOptions,
          policyOptions: {
            ...commonPolicyOptions,
            // The number of rounds of retries that will break the circuit,
            // triggering a "cooldown".
            //
            // When we fail over to QuickNode, we expect it to be down at first
            // while it is being automatically activated, and we don't want to
            // activate the "cooldown" accidentally.
            maxConsecutiveFailures: (maxRetries + 1) * 10,
          },
        };
      }

      return {
        ...commonOptions,
        policyOptions: {
          ...commonPolicyOptions,
          // Ensure that if the endpoint continually responds with errors, we
          // break the circuit relatively fast (but not prematurely).
          //
          // Note that the circuit will break much faster if the errors are
          // retriable (e.g. 503) than if not (e.g. 500), so we attempt to strike
          // a balance here.
          maxConsecutiveFailures: (maxRetries + 1) * 3,
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

  // TODO: Move this to `network-controller`
  const toggleRpcFailover = (isRpcFailoverEnabled: Json) => {
    if (isRpcFailoverEnabled) {
      Logger.log('Enabling RPC failover.');
      controller.enableRpcFailover();
    } else {
      Logger.log('Disabling RPC failover.');
      controller.disableRpcFailover();
    }
  };

  initMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    toggleRpcFailover,
    (state) => state.remoteFeatureFlags.walletFrameworkRpcFailoverEnabled,
  );

  const remoteFeatureFlagControllerState = initMessenger.call(
    'RemoteFeatureFlagController:getState',
  );

  toggleRpcFailover(
    remoteFeatureFlagControllerState.remoteFeatureFlags
      .walletFrameworkRpcFailoverEnabled,
  );

  return {
    controller,
  };
};
