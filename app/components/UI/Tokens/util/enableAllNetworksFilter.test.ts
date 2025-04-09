import { RpcEndpointType } from '@metamask/network-controller';
import { NETWORK_CHAIN_ID } from '../../../../util/networks/customNetworks';
import {
  enableAllNetworksFilter,
  KnownNetworkConfigurations,
} from './enableAllNetworksFilter';

type TestNetworkConfigurations = Pick<
  KnownNetworkConfigurations,
  '0x1' | '0x89'
>;

type FlareTestNetworkConfigurations = Pick<
  KnownNetworkConfigurations,
  '0xe' | '0x13'
>;

type MultiNetworkConfigurations = Pick<
  KnownNetworkConfigurations,
  '0x1' | '0x89' | typeof NETWORK_CHAIN_ID.BASE
>;

describe('enableAllNetworksFilter', () => {
  it('should create a record with all network chain IDs mapped to true', () => {
    const mockNetworks: TestNetworkConfigurations = {
      [NETWORK_CHAIN_ID.MAINNET]: {
        chainId: NETWORK_CHAIN_ID.MAINNET,
        name: 'Ethereum Mainnet',
        blockExplorerUrls: ['https://etherscan.io'],
        defaultRpcEndpointIndex: 0,
        nativeCurrency: 'ETH',
        rpcEndpoints: [
          {
            type: RpcEndpointType.Custom,
            networkClientId: NETWORK_CHAIN_ID.MAINNET,
            url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
            failoverUrls: [],
          },
        ],
      },
      [NETWORK_CHAIN_ID.POLYGON]: {
        chainId: NETWORK_CHAIN_ID.POLYGON,
        name: 'Polygon',
        blockExplorerUrls: ['https://polygonscan.com'],
        defaultRpcEndpointIndex: 0,
        nativeCurrency: 'MATIC',
        rpcEndpoints: [
          {
            type: RpcEndpointType.Custom,
            networkClientId: NETWORK_CHAIN_ID.POLYGON,
            url: 'https://polygon-rpc.com',
            failoverUrls: [],
          },
        ],
      },
    };

    const result = enableAllNetworksFilter(mockNetworks);

    expect(result).toEqual({
      [NETWORK_CHAIN_ID.MAINNET]: true,
      [NETWORK_CHAIN_ID.POLYGON]: true,
    });
  });

  it('should handle empty networks object', () => {
    const result = enableAllNetworksFilter({});
    expect(result).toEqual({});
  });

  it('should work with NETWORK_CHAIN_ID constants', () => {
    const mockNetworks: FlareTestNetworkConfigurations = {
      [NETWORK_CHAIN_ID.FLARE_MAINNET]: {
        chainId: NETWORK_CHAIN_ID.FLARE_MAINNET,
        name: 'Flare Mainnet',
        blockExplorerUrls: ['https://flare.network'],
        defaultRpcEndpointIndex: 0,
        nativeCurrency: 'FLR',
        rpcEndpoints: [
          {
            type: RpcEndpointType.Custom,
            networkClientId: NETWORK_CHAIN_ID.FLARE_MAINNET,
            url: 'https://flare-rpc.com',
            failoverUrls: [],
          },
        ],
      },
      [NETWORK_CHAIN_ID.SONGBIRD_TESTNET]: {
        chainId: NETWORK_CHAIN_ID.SONGBIRD_TESTNET,
        name: 'Songbird Testnet',
        blockExplorerUrls: ['https://songbird.flare.network'],
        defaultRpcEndpointIndex: 0,
        nativeCurrency: 'SGB',
        rpcEndpoints: [
          {
            type: RpcEndpointType.Custom,
            networkClientId: NETWORK_CHAIN_ID.SONGBIRD_TESTNET,
            url: 'https://songbird-rpc.flare.network',
            failoverUrls: [],
          },
        ],
      },
    };

    const result = enableAllNetworksFilter(mockNetworks);

    expect(result).toEqual({
      [NETWORK_CHAIN_ID.FLARE_MAINNET]: true,
      [NETWORK_CHAIN_ID.SONGBIRD_TESTNET]: true,
    });
  });

  it('should handle networks with different property values', () => {
    const mockNetworks: MultiNetworkConfigurations = {
      [NETWORK_CHAIN_ID.MAINNET]: {
        chainId: NETWORK_CHAIN_ID.MAINNET,
        name: 'Network 1',
        blockExplorerUrls: ['https://etherscan.io'],
        defaultRpcEndpointIndex: 0,
        nativeCurrency: 'ETH',
        rpcEndpoints: [
          {
            type: RpcEndpointType.Custom,
            networkClientId: NETWORK_CHAIN_ID.MAINNET,
            url: 'https://mainnet.infura.io/v3/your-api-key',
            failoverUrls: [],
          },
        ],
      },
      [NETWORK_CHAIN_ID.POLYGON]: {
        chainId: NETWORK_CHAIN_ID.POLYGON,
        name: 'Network 2',
        blockExplorerUrls: ['https://polygonscan.com'],
        defaultRpcEndpointIndex: 0,
        nativeCurrency: 'MATIC',
        rpcEndpoints: [
          {
            type: RpcEndpointType.Custom,
            networkClientId: NETWORK_CHAIN_ID.POLYGON,
            url: 'https://polygon-rpc.com',
            failoverUrls: [],
          },
        ],
      },
      [NETWORK_CHAIN_ID.BASE]: {
        chainId: NETWORK_CHAIN_ID.BASE,
        name: 'Network 3',
        blockExplorerUrls: ['https://base.network'],
        defaultRpcEndpointIndex: 0,
        nativeCurrency: 'BASE',
        rpcEndpoints: [
          {
            type: RpcEndpointType.Custom,
            networkClientId: NETWORK_CHAIN_ID.BASE,
            url: 'https://base-rpc.com',
            failoverUrls: [],
          },
        ],
      },
    };

    const result = enableAllNetworksFilter(mockNetworks);

    expect(Object.values(result).every((value) => value === true)).toBe(true);
    expect(Object.keys(result)).toEqual([
      NETWORK_CHAIN_ID.MAINNET,
      NETWORK_CHAIN_ID.POLYGON,
      NETWORK_CHAIN_ID.BASE,
    ]);
  });
});
