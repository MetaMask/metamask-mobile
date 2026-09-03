import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import Logger from '../../util/Logger';
import { RpcEndpointType } from '@metamask/network-controller';
import {
  allowedInfuraHosts,
  infuraChainIdsTestNets,
} from '../../util/networks/customNetworks';
import { CHAIN_IDS } from '@metamask/transaction-controller';

const ZKSYNC_ERA_CHAIN_ID = CHAIN_IDS.ZKSYNC_ERA;
const INFURA_KEY = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = INFURA_KEY === 'null' ? '' : INFURA_KEY;
const ZKSYNC_LEGACY_URL = 'https://mainnet.era.zksync.io';
const ZKSYNC_INFURA_URL = `https://zksync-mainnet.infura.io/v3/${infuraProjectId}`;

/**
 * Migration to update the zkSync Era network configuration by replacing
 * "https://mainnet.era.zksync.io" with "https://zksync-mainnet.infura.io/v3/{infuraProjectId}".
 *
 * Only applied when the user already relies on Infura on at least one other
 * supported chain (excluding testnets, Linea Mainnet, and zkSync Era itself).
 *
 * @param state - The current MetaMask mobile state.
 * @returns The updated state with the revised Infura endpoint for the zkSync Era network.
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 141)) {
    return state;
  }

  const { engine } = state;
  if (
    hasProperty(engine.backgroundState, 'NetworkController') &&
    isObject(engine.backgroundState.NetworkController) &&
    hasProperty(
      engine.backgroundState.NetworkController,
      'networkConfigurationsByChainId',
    ) &&
    isObject(
      engine.backgroundState.NetworkController.networkConfigurationsByChainId,
    )
  ) {
    const networkConfigurationsByChainId =
      engine.backgroundState.NetworkController.networkConfigurationsByChainId;

    const usesInfura = Object.entries(networkConfigurationsByChainId)
      .filter(
        ([chainId]) =>
          ![
            ...infuraChainIdsTestNets,
            CHAIN_IDS.LINEA_MAINNET,
            CHAIN_IDS.ZKSYNC_ERA,
          ].includes(chainId),
      )
      .some(([, networkConfig]) => {
        if (
          !isObject(networkConfig) ||
          !Array.isArray(networkConfig.rpcEndpoints) ||
          typeof networkConfig.defaultRpcEndpointIndex !== 'number'
        ) {
          return false;
        }

        const defaultRpcEndpoint =
          networkConfig.rpcEndpoints?.[networkConfig.defaultRpcEndpointIndex];

        if (
          !isObject(defaultRpcEndpoint) ||
          typeof defaultRpcEndpoint.url !== 'string'
        ) {
          return false;
        }

        try {
          const urlHost = new URL(defaultRpcEndpoint.url).host;
          return (
            defaultRpcEndpoint.type === RpcEndpointType.Infura ||
            allowedInfuraHosts.includes(urlHost)
          );
        } catch {
          return false;
        }
      });

    if (!usesInfura) {
      return state;
    }

    const zkSyncNetworkConfig =
      networkConfigurationsByChainId[ZKSYNC_ERA_CHAIN_ID];
    if (
      isObject(zkSyncNetworkConfig) &&
      hasProperty(zkSyncNetworkConfig, 'rpcEndpoints')
    ) {
      const { rpcEndpoints } = zkSyncNetworkConfig;

      if (Array.isArray(rpcEndpoints)) {
        const endpointIndex = rpcEndpoints.findIndex(
          (endpoint) =>
            isObject(endpoint) && endpoint.url === ZKSYNC_LEGACY_URL,
        );

        if (endpointIndex !== -1) {
          Logger.log(
            `Migration 141: Updating '${ZKSYNC_LEGACY_URL}' to '${ZKSYNC_INFURA_URL}' in zkSync Era network RPC endpoints.`,
          );

          rpcEndpoints[endpointIndex] = {
            ...rpcEndpoints[endpointIndex],
            url: ZKSYNC_INFURA_URL,
          };

          networkConfigurationsByChainId[ZKSYNC_ERA_CHAIN_ID] = {
            ...zkSyncNetworkConfig,
            rpcEndpoints,
          };

          engine.backgroundState.NetworkController.networkConfigurationsByChainId =
            networkConfigurationsByChainId;
        }
      }
    }
  }

  return state;
}
