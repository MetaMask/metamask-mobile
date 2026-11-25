import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toCaipChainId } from '@metamask/utils';
import { NetworkClientId } from '@metamask/network-controller';

import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { getEvmHexChainId } from '../utils';

/**
 * Resolves the default network client for a chain, the same client used to
 * estimate and submit a Ramp sell transaction.
 *
 * @param chainId - A numeric (`"1"`), hex (`"0x1"`) or CAIP-2 (`"eip155:1"`)
 * EVM chain id.
 * @returns The default RPC endpoint's network client id, or `undefined` for a
 * missing, unknown or non-EVM chain.
 */
export default function useRampNetworkClientId(
  chainId?: string,
): NetworkClientId | undefined {
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  return useMemo(() => {
    const hexChainId = getEvmHexChainId(chainId);
    if (!hexChainId) {
      return undefined;
    }

    const caipChainId = toCaipChainId(
      'eip155',
      parseInt(hexChainId, 16).toString(10),
    );
    const networkConfig = networkConfigurations?.[caipChainId];
    if (!networkConfig || !('rpcEndpoints' in networkConfig)) {
      return undefined;
    }

    const { rpcEndpoints, defaultRpcEndpointIndex } = networkConfig;
    return rpcEndpoints?.[defaultRpcEndpointIndex]?.networkClientId;
  }, [chainId, networkConfigurations]);
}
