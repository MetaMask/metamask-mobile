import { CaipChainId, parseCaipChainId } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import type { NetworkConfiguration } from '@metamask/network-controller';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import type { EvmAndMultichainNetworkConfigurationsWithCaipChainId } from '../../../selectors/networkController';

/**
 * Converts CAIP-keyed network configurations into hex-keyed `NetworkConfiguration`
 * records, dropping the derived `caipChainId` because `NetworkController.updateNetwork`
 * persists unknown fields as-is.
 *
 * @param networkConfigurations - Network configurations keyed by CAIP chain ID.
 * @returns EVM network configurations keyed by hex chain ID.
 */
export const getEvmNetworkConfigurationsByHexChainId = (
  networkConfigurations: Record<
    CaipChainId,
    EvmAndMultichainNetworkConfigurationsWithCaipChainId
  >,
): Record<string, NetworkConfiguration> => {
  const evmConfigs: Record<string, NetworkConfiguration> = {};

  Object.entries(networkConfigurations).forEach(([caipChainId, config]) => {
    if (
      isNonEvmChainId(caipChainId as CaipChainId) ||
      !('rpcEndpoints' in config)
    ) {
      return;
    }

    const { caipChainId: _caipChainId, ...networkConfiguration } = config;
    const hexChainId = toHex(
      parseCaipChainId(caipChainId as CaipChainId).reference,
    );
    evmConfigs[hexChainId] = networkConfiguration as NetworkConfiguration;
  });

  return evmConfigs;
};
