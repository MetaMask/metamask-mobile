import { NetworksChainId, NetworkType } from '@metamask/controller-utils';
import {
  isMainNet,
  isTestNet,
  getAllNetworks,
  getNetworkTypeById,
  findBlockExplorerForRpc,
  compareRpcUrls,
  getBlockExplorerAddressUrl,
  getBlockExplorerTxUrl,
} from '.';
import {
  MAINNET,
  GOERLI,
  RPC,
  SEPOLIA,
  LINEA_GOERLI,
  LINEA_MAINNET,
} from '../../../app/constants/network';
import { NetworkSwitchErrorType } from '../../../app/constants/error';

jest.mock('./../../core/Engine', () => ({
  context: {
    CurrencyRateController: {
      setNativeCurrency: () => jest.fn(),
      setLocked: () => jest.fn(),
    },
    NetworkController: {
      setActiveNetwork: () => jest.fn(),
      setProviderType: () => jest.fn(),
      state: {
        providerConfig: {
          chainId: '3',
        },
      },
    },
    PreferencesController: {
      state: {},
    },
  },
}));

describe('NetworkUtils::getAllNetworks', () => {
  const allNetworks = getAllNetworks();
  it('should get all networks', () => {
    expect(allNetworks.includes(MAINNET)).toEqual(true);
    expect(allNetworks.includes(SEPOLIA)).toEqual(true);
    expect(allNetworks.includes(GOERLI)).toEqual(true);
    expect(allNetworks.includes(LINEA_GOERLI)).toEqual(true);
    expect(allNetworks.includes(LINEA_MAINNET)).toEqual(true);
  });
  it('should exclude rpc', () => {
    expect(allNetworks.includes(RPC)).toEqual(false);
  });
});

describe('NetworkUtils::isMainNet', () => {
  it(`should return true if the given chain ID is Ethereum Mainnet`, () => {
    expect(isMainNet('1')).toEqual(true);
  });
  it(`should return false if the selected network is not Ethereum Mainnet`, () => {
    expect(isMainNet('42')).toEqual(false);
  });
});

describe('NetworkUtils::isTestNet', () => {
  const testnets = [
    NetworkType.goerli,
    NetworkType.sepolia,
    NetworkType['linea-goerli'],
  ];

  for (const networkType of testnets) {
    it(`should return true if the given chain ID is for '${networkType}'`, () => {
      expect(isTestNet(NetworksChainId[networkType])).toEqual(true);
    });
  }

  it(`should return false if the given chain ID is not a known testnet`, () => {
    expect(isTestNet('42')).toEqual(false);
  });
});

describe('NetworkUtils::getNetworkTypeById', () => {
  it('should get network type by Id', () => {
    const type = getNetworkTypeById(11155111);
    expect(type).toEqual(SEPOLIA);
  });
  it('should fail if network Id is missing', () => {
    try {
      getNetworkTypeById();
    } catch (error) {
      expect(error.message).toEqual(NetworkSwitchErrorType.missingNetworkId);
    }
  });
  it('should fail if network Id is unknown', () => {
    const id = 9999;
    try {
      getNetworkTypeById(id);
    } catch (error) {
      expect(error.message).toEqual(
        `${NetworkSwitchErrorType.unknownNetworkId} ${id}`,
      );
    }
  });
});

describe('NetworkUtils::findBlockExplorerForRpc', () => {
  const networkConfigurationsMock = {
    networkId1: {
      chainId: '137',
      nickname: 'Polygon Mainnet',
      rpcPrefs: {
        blockExplorerUrl: 'https://polygonscan.com',
      },
      rpcUrl: 'https://polygon-mainnet.infura.io/v3',
      ticker: 'MATIC',
    },
    networkId2: {
      chainId: '56',
      nickname: 'Binance Smart Chain',
      rpcPrefs: {},
      rpcUrl: 'https://bsc-dataseed.binance.org/',
      ticker: 'BNB',
    },
    networkId3: {
      chainId: '10',
      nickname: 'Optimism',
      rpcPrefs: { blockExplorerUrl: 'https://optimistic.ethereum.io' },
      rpcUrl: 'https://mainnet.optimism.io/',
      ticker: 'ETH',
    },
  };

  it('should find the block explorer is it exists', () => {
    const mockRpcUrl = networkConfigurationsMock.networkId3.rpcUrl;
    const expectedBlockExplorer =
      networkConfigurationsMock.networkId3.rpcPrefs.blockExplorerUrl;
    expect(findBlockExplorerForRpc(mockRpcUrl, networkConfigurationsMock)).toBe(
      expectedBlockExplorer,
    );
  });
  it('should return undefined if the block explorer does not exist', () => {
    const mockRpcUrl = networkConfigurationsMock.networkId2.rpcUrl;
    expect(findBlockExplorerForRpc(mockRpcUrl, networkConfigurationsMock)).toBe(
      undefined,
    );
  });
  it('should return undefined if the RPC does not exist', () => {
    const mockRpcUrl = 'https://arb1.arbitrum.io/rpc';
    expect(findBlockExplorerForRpc(mockRpcUrl, networkConfigurationsMock)).toBe(
      undefined,
    );
  });
});

describe('NetworkUtils::compareRpcUrls', () => {
  it('should return true if both URLs have the same host', () => {
    const mockRpcOne = 'https://mainnet.optimism.io/';
    const mockRpcTwo = 'https://mainnet.optimism.io/d03910331458';
    expect(compareRpcUrls(mockRpcOne, mockRpcTwo)).toBe(true);
  });
  it('should return false if both URLs have the same host', () => {
    const mockRpcOne = 'https://bsc-dataseed.binance.org/';
    const mockRpcTwo = 'https://mainnet.optimism.io/d03910331458';
    expect(compareRpcUrls(mockRpcOne, mockRpcTwo)).toBe(false);
  });
});

describe('NetworkUtils::getBlockExplorerAddressUrl', () => {
  const mockEthereumAddress = '0x0000000000000000000000000000000000000001';
  it('should return null result when network type === "rpc" and rpcBlockExplorerUrl === null', () => {
    const { url, title } = getBlockExplorerAddressUrl(RPC, mockEthereumAddress);

    expect(url).toBe(null);
    expect(title).toBe(null);
  });

  it('should return rpc block explorer address url when network type === "rpc"', () => {
    const { url, title } = getBlockExplorerAddressUrl(
      RPC,
      mockEthereumAddress,
      'http://avalanche-rpc-url',
    );

    expect(url).toBe(`http://avalanche-rpc-url/address/${mockEthereumAddress}`);
    expect(title).toBe(`avalanche-rpc-url`);
  });

  it('should return etherscan block explorer address url when network type !== "rpc"', () => {
    const { url, title } = getBlockExplorerAddressUrl(
      GOERLI,
      mockEthereumAddress,
    );

    expect(url).toBe(
      `https://goerli.etherscan.io/address/${mockEthereumAddress}`,
    );
    expect(title).toBe(`goerli.etherscan.io`);
  });

  it('should return custom block explorer address url when network type === "linea-goerli"', () => {
    const { url, title } = getBlockExplorerAddressUrl(
      LINEA_GOERLI,
      mockEthereumAddress,
    );

    expect(url).toBe(
      `https://goerli.lineascan.build/address/${mockEthereumAddress}`,
    );
    expect(title).toBe(`goerli.lineascan.build`);
  });

  it('should return custom block explorer address url when network type === "linea-mainnet"', () => {
    const { url, title } = getBlockExplorerAddressUrl(
      LINEA_MAINNET,
      mockEthereumAddress,
    );

    expect(url).toBe(`https://lineascan.build/address/${mockEthereumAddress}`);
    expect(title).toBe(`lineascan.build`);
  });
});

describe('NetworkUtils::getBlockExplorerTxUrl', () => {
  const mockTransactionHash =
    '0xc4fd7d4ca49e57fed7f533dedc9447cdf3818df2a1f61b405d3e5c10e8fd5b86';

  it('should return null result when network type === "rpc" and rpcBlockExplorerUrl === null', () => {
    const { url, title } = getBlockExplorerTxUrl(RPC, mockTransactionHash);

    expect(url).toBe(null);
    expect(title).toBe(null);
  });

  it('should return rpc block explorer tx url when network type === "rpc"', () => {
    const { url, title } = getBlockExplorerTxUrl(
      RPC,
      mockTransactionHash,
      'http://avalanche-rpc-url',
    );

    expect(url).toBe(`http://avalanche-rpc-url/tx/${mockTransactionHash}`);
    expect(title).toBe(`avalanche-rpc-url`);
  });

  it('should return etherscan block explorer tx url when network type !== "rpc"', () => {
    const { url, title } = getBlockExplorerTxUrl(GOERLI, mockTransactionHash);

    expect(url).toBe(`https://goerli.etherscan.io/tx/${mockTransactionHash}`);
    expect(title).toBe(`goerli.etherscan.io`);
  });

  it('should return custom block explorer tx url when network type === "linea-goerli"', () => {
    const { url, title } = getBlockExplorerTxUrl(
      LINEA_GOERLI,
      mockTransactionHash,
    );

    expect(url).toBe(
      `https://goerli.lineascan.build/tx/${mockTransactionHash}`,
    );
    expect(title).toBe(`goerli.lineascan.build`);
  });

  it('should return custom block explorer tx url when network type === "linea-mainnet"', () => {
    const { url, title } = getBlockExplorerTxUrl(
      LINEA_MAINNET,
      mockTransactionHash,
    );

    expect(url).toBe(`https://lineascan.build/tx/${mockTransactionHash}`);
    expect(title).toBe(`lineascan.build`);
  });
});
