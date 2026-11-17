import type { CaipChainId } from '@metamask/utils';
import {
  RpcEndpointType,
  type NetworkConfiguration,
} from '@metamask/network-controller';
import { getEvmNetworkConfigurationsByHexChainId } from './utils';

const polygon = {
  chainId: '0x89',
  name: 'Polygon Mainnet',
  nativeCurrency: 'POL',
  rpcEndpoints: [
    {
      networkClientId: 'polygon',
      url: 'https://polygon-rpc.com',
      type: RpcEndpointType.Custom,
    },
  ],
  defaultRpcEndpointIndex: 0,
  blockExplorerUrls: ['https://polygonscan.com'],
  defaultBlockExplorerUrlIndex: 0,
} as NetworkConfiguration;

describe('getEvmNetworkConfigurationsByHexChainId', () => {
  it('keys EVM networks by hex chain ID', () => {
    const result = getEvmNetworkConfigurationsByHexChainId({
      'eip155:137': { ...polygon, caipChainId: 'eip155:137' },
    });

    expect(Object.keys(result)).toEqual(['0x89']);
  });

  it('removes the derived caipChainId so it is never written back to NetworkController', () => {
    const result = getEvmNetworkConfigurationsByHexChainId({
      'eip155:137': { ...polygon, caipChainId: 'eip155:137' },
    });

    expect(result['0x89']).toEqual(polygon);
    expect(result['0x89']).not.toHaveProperty('caipChainId');
  });

  it('skips non-EVM networks', () => {
    const solana = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

    const result = getEvmNetworkConfigurationsByHexChainId({
      [solana]: {
        chainId: solana,
        name: 'Solana',
        nativeCurrency: `${solana}/slip44:501`,
        isEvm: false,
        caipChainId: solana,
      },
    } as never);

    expect(result).toEqual({});
  });
});
