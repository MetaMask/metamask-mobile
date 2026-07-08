import { MessengerClientInitFunction } from '../types';
import {
  NetworkController,
  type NetworkControllerMessenger,
} from '@metamask/network-controller';
import { NetworkControllerInitMessenger } from '../messengers/network-controller-messenger';
import { getFailoverUrlsForInfuraNetwork } from '../../../util/networks/customNetworks';
import { INFURA_PROJECT_ID } from '../../../constants/network';
import {
  onRpcEndpointDegraded,
  onRpcEndpointUnavailable,
} from './network-controller/messenger-action-handlers';
import { Hex } from '@metamask/utils';
import { buildAndTrackEvent } from '../utils/analytics';
import { ChainId, toHex } from '@metamask/controller-utils';

const NON_EMPTY = 'NON_EMPTY';

/**
 * Initialize the network controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const networkControllerInit: MessengerClientInitFunction<
  NetworkController,
  NetworkControllerMessenger,
  NetworkControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState, analyticsId }) => {
  const infuraProjectId = INFURA_PROJECT_ID || NON_EMPTY;

  const controller = new NetworkController({
    infuraProjectId,
    state: persistedState.NetworkController,
    messenger: controllerMessenger,
    failoverUrls: {
      [ChainId.mainnet]: getFailoverUrlsForInfuraNetwork('ethereum-mainnet'),
      [ChainId['linea-mainnet']]:
        getFailoverUrlsForInfuraNetwork('linea-mainnet'),
      [ChainId['arbitrum-mainnet']]:
        getFailoverUrlsForInfuraNetwork('arbitrum-mainnet'),
      [ChainId['avalanche-mainnet']]:
        getFailoverUrlsForInfuraNetwork('avalanche-mainnet'),
      [ChainId['optimism-mainnet']]:
        getFailoverUrlsForInfuraNetwork('optimism-mainnet'),
      [ChainId['polygon-mainnet']]:
        getFailoverUrlsForInfuraNetwork('polygon-mainnet'),
      [ChainId['base-mainnet']]:
        getFailoverUrlsForInfuraNetwork('base-mainnet'),
      [ChainId['bsc-mainnet']]: getFailoverUrlsForInfuraNetwork('bsc-mainnet'),
      [ChainId['sei-mainnet']]: getFailoverUrlsForInfuraNetwork('sei-mainnet'),
      [ChainId['monad-mainnet']]:
        getFailoverUrlsForInfuraNetwork('monad-mainnet'),
      // HyperEVM and Arc are not part of the `ChainId` enum.
      [toHex(999)]: getFailoverUrlsForInfuraNetwork('hyperevm-mainnet'),
      [toHex(5042)]: getFailoverUrlsForInfuraNetwork('arc-mainnet'),
    },
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
          buildAndTrackEvent(initMessenger, event, properties);
        },
        metaMetricsId: analyticsId ?? '',
      });
    },
  );

  initMessenger.subscribe(
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
        infuraProjectId,
        retryReason,
        rpcMethodName,
        traceId,
        trackEvent: ({ event, properties }) => {
          buildAndTrackEvent(initMessenger, event, properties);
        },
        metaMetricsId: analyticsId ?? '',
        type,
      });
    },
  );

  controller.init();

  return {
    controller,
  };
};
