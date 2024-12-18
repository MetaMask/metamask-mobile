import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import Logger from '../../util/Logger';
import { RpcEndpointType } from '@metamask/network-controller';
import {
  allowedInfuraHosts,
  infuraChainIdsTestNets,
} from '../../util/networks/customNetworks';
import { CHAIN_IDS } from '@metamask/transaction-controller';

const BASE_CHAIN_ID = '0x2105';
const INFURA_KEY = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = INFURA_KEY === 'null' ? '' : INFURA_KEY;

/**
 * Migration to update the Base network configuration by replacing
 * "https://mainnet.base.org" with "https://base-mainnet.infura.io/v3/{infuraProjectId}".
 *
 * This addresses potential compatibility issues caused by deprecated endpoints.
 *
 * @param state - The current MetaMask extension state.
 * @returns The updated state with the revised Infura endpoint for the Base network.
 */
export default function migrate(state: unknown) {
  // Ensure the state is valid for migration
  if (!ensureValidState(state, 62)) {
    return state;
  }

  // Locate the Base network configuration in the NetworkController
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

    // Check if at least one network uses an Infura RPC endpoint, excluding testnets
    const usesInfura = Object.entries(networkConfigurationsByChainId)
      .filter(
        ([chainId]) =>
          ![...infuraChainIdsTestNets, CHAIN_IDS.LINEA_MAINNET].includes(
            chainId,
          ),
      ) // Exclude testnet chain IDs
      .some(([, networkConfig]) => {
        if (
          !isObject(networkConfig) ||
          !Array.isArray(networkConfig.rpcEndpoints) ||
          typeof networkConfig.defaultRpcEndpointIndex !== 'number'
        ) {
          return false;
        }

        // Get the default RPC endpoint used by the network
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
      // If no Infura endpoints are used, return the state unchanged
      return state;
    }

    const baseNetworkConfig = networkConfigurationsByChainId[BASE_CHAIN_ID];
    if (
      isObject(baseNetworkConfig) &&
      hasProperty(baseNetworkConfig, 'rpcEndpoints')
    ) {
      const { rpcEndpoints } = baseNetworkConfig;

      if (Array.isArray(rpcEndpoints)) {
        const endpointIndex = rpcEndpoints.findIndex(
          (endpoint) =>
            isObject(endpoint) && endpoint.url === 'https://mainnet.base.org',
        );

        if (endpointIndex !== -1) {
          Logger.log(
            `Migration 135: Updating 'https://mainnet.base.org' to 'https://base-mainnet.infura.io/v3/${infuraProjectId}' in Base network RPC endpoints.`,
          );

          // Update the first occurrence of the deprecated URL
          rpcEndpoints[endpointIndex] = {
            ...rpcEndpoints[endpointIndex],
            url: `https://base-mainnet.infura.io/v3/${infuraProjectId}`,
          };

          // Apply the changes to the Base network configuration
          networkConfigurationsByChainId[BASE_CHAIN_ID] = {
            ...baseNetworkConfig,
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
