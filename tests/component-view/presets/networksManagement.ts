import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { initialStateNetworkManager } from './networkManager';

export const NETWORKS_MGMT_POLYGON_CHAIN_ID = '0x89';
export const NETWORKS_MGMT_ZKSYNC_CHAIN_ID = '0x144';
export const NETWORKS_MGMT_LOCALHOST_CHAIN_ID = '0x539';

export const NETWORKS_MGMT_POLYGON_RPC = 'https://polygon-rpc.com';
export const NETWORKS_MGMT_ZKSYNC_RPC =
  'https://zksync-mainnet.infura.io/v3/test-key';
export const NETWORKS_MGMT_LOCALHOST_RPC = 'http://localhost:8545';

const ZKSYNC_NETWORK_CONFIG = {
  chainId: NETWORKS_MGMT_ZKSYNC_CHAIN_ID,
  name: 'zkSync Era',
  nativeCurrency: 'ETH',
  rpcEndpoints: [
    {
      networkClientId: 'zksync-mainnet',
      url: NETWORKS_MGMT_ZKSYNC_RPC,
      type: 'custom',
      name: 'zkSync Era',
    },
  ],
  defaultRpcEndpointIndex: 0,
  blockExplorerUrls: ['https://explorer.zksync.io/'],
  defaultBlockExplorerUrlIndex: 0,
};

const NETWORKS_MGMT_ENABLED_MAP = {
  eip155: {
    '0x1': true,
    [NETWORKS_MGMT_POLYGON_CHAIN_ID]: true,
    [NETWORKS_MGMT_ZKSYNC_CHAIN_ID]: true,
    [NETWORKS_MGMT_LOCALHOST_CHAIN_ID]: true,
  },
};

/**
 * Preset for NetworksManagement / NetworkDetails CV tests.
 * Seeds mainnet, Polygon, zkSync Era, and custom localhost.
 */
export const initialStateNetworksManagement = () =>
  initialStateNetworkManager({
    includeCustomNetworks: true,
    enabledNetworks: NETWORKS_MGMT_ENABLED_MAP,
  }).withOverrides({
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              name: 'Ethereum Main Network',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  networkClientId: 'mainnet',
                  url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                  type: 'infura',
                  name: 'Ethereum Mainnet',
                },
              ],
              defaultRpcEndpointIndex: 0,
              blockExplorerUrls: ['https://etherscan.io'],
              defaultBlockExplorerUrlIndex: 0,
            },
            [NETWORKS_MGMT_POLYGON_CHAIN_ID]: {
              chainId: NETWORKS_MGMT_POLYGON_CHAIN_ID,
              name: 'Polygon Mainnet',
              nativeCurrency: 'POL',
              rpcEndpoints: [
                {
                  networkClientId: 'polygon',
                  url: NETWORKS_MGMT_POLYGON_RPC,
                  type: 'custom',
                  name: 'Polygon Mainnet',
                },
              ],
              defaultRpcEndpointIndex: 0,
              blockExplorerUrls: ['https://polygonscan.com'],
              defaultBlockExplorerUrlIndex: 0,
            },
            [NETWORKS_MGMT_ZKSYNC_CHAIN_ID]: ZKSYNC_NETWORK_CONFIG,
            [NETWORKS_MGMT_LOCALHOST_CHAIN_ID]: {
              chainId: NETWORKS_MGMT_LOCALHOST_CHAIN_ID,
              name: 'Localhost 8545',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  networkClientId: 'localhost',
                  url: NETWORKS_MGMT_LOCALHOST_RPC,
                  type: 'custom',
                  name: 'Localhost 8545',
                },
              ],
              defaultRpcEndpointIndex: 0,
              blockExplorerUrls: [],
              defaultBlockExplorerUrlIndex: 0,
            },
          },
        },
      },
    },
  } as unknown as DeepPartial<RootState>);
