import {
  isMainNet,
  getNetworkName,
  getAllNetworks,
  getNetworkTypeById,
  findBlockExplorerForRpc,
  compareRpcUrls,
  handleNetworkSwitch,
} from '.';
import { MAINNET, GOERLI, RPC, SEPOLIA } from '../../../app/constants/network';
import { NetworkSwitchErrorType } from '../../../app/constants/error';
import Engine from './../../core/Engine';

jest.mock('./../../core/Engine', () => ({
  context: {
    CurrencyRateController: {
      setNativeCurrency: () => jest.fn(),
      setLocked: () => jest.fn(),
    },
    NetworkController: {
      setRpcTarget: () => jest.fn(),
      setProviderType: () => jest.fn(),
      state: {
        provider: {
          chainId: '3',
        },
      },
    },
  },
}));

describe('NetworkUtils::getAllNetworks', () => {
  const allNetworks = getAllNetworks();
  it('should get all networks', () => {
    expect(allNetworks.includes(MAINNET)).toEqual(true);
    expect(allNetworks.includes(SEPOLIA)).toEqual(true);
    expect(allNetworks.includes(GOERLI)).toEqual(true);
  });
  it('should exclude rpc', () => {
    expect(allNetworks.includes(RPC)).toEqual(false);
  });
});

describe('NetworkUtils::isMainNet', () => {
  it(`should return true if the selected network is ${MAINNET}`, () => {
    expect(isMainNet('1')).toEqual(true);
    expect(
      isMainNet({
        provider: {
          type: MAINNET,
        },
      }),
    ).toEqual(true);
  });
  it(`should return false if the selected network is not ${MAINNET}`, () => {
    expect(isMainNet('42')).toEqual(false);
    expect(
      isMainNet({
        network: {
          provider: {
            type: SEPOLIA,
          },
        },
      }),
    ).toEqual(false);
  });
});

describe('NetworkUtils::getNetworkName', () => {
  it(`should get network name for ${MAINNET} id`, () => {
    const main = getNetworkName(String(1));
    expect(main).toEqual(MAINNET);
  });

  it(`should get network name for ${GOERLI} id`, () => {
    const main = getNetworkName(String(5));
    expect(main).toEqual(GOERLI);
  });

  it(`should get network name for ${SEPOLIA} id`, () => {
    const main = getNetworkName(String(11155111));
    expect(main).toEqual(SEPOLIA);
  });

  it(`should return undefined for unknown network id`, () => {
    const main = getNetworkName(String(99));
    expect(main).toEqual(undefined);
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
  const frequentRpcListMock = [
    {
      chainId: '137',
      nickname: 'Polygon Mainnet',
      rpcPrefs: {
        blockExplorerUrl: 'https://polygonscan.com',
      },
      rpcUrl: 'https://polygon-mainnet.infura.io/v3',
      ticker: 'MATIC',
    },
    {
      chainId: '56',
      nickname: 'Binance Smart Chain',
      rpcPrefs: {},
      rpcUrl: 'https://bsc-dataseed.binance.org/',
      ticker: 'BNB',
    },
    {
      chainId: '10',
      nickname: 'Optimism',
      rpcPrefs: { blockExplorerUrl: 'https://optimistic.ethereum.io' },
      rpcUrl: 'https://mainnet.optimism.io/',
      ticker: 'ETH',
    },
  ];

  it('should find the block explorer is it exists', () => {
    const mockRpcUrl = frequentRpcListMock[2].rpcUrl;
    const expectedBlockExplorer =
      frequentRpcListMock[2].rpcPrefs.blockExplorerUrl;
    expect(findBlockExplorerForRpc(mockRpcUrl, frequentRpcListMock)).toBe(
      expectedBlockExplorer,
    );
  });
  it('should return undefined if the block explorer does not exist', () => {
    const mockRpcUrl = frequentRpcListMock[1].rpcUrl;
    expect(findBlockExplorerForRpc(mockRpcUrl, frequentRpcListMock)).toBe(
      undefined,
    );
  });
  it('should return undefined if the RPC does not exist', () => {
    const mockRpcUrl = 'https://arb1.arbitrum.io/rpc';
    expect(findBlockExplorerForRpc(mockRpcUrl, frequentRpcListMock)).toBe(
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

describe('NetworkUtils::handleNetworkSwitch', () => {
  const mockRPCFrequentList = [
    {
      rpcUrl: 'mainnet-rpc-url',
      chainId: '1',
      ticker: 'ETH',
      nickname: 'Mainnet',
    },
    {
      rpcUrl: 'polygon-rpc-url',
      chainId: '2',
      ticker: 'MATIC',
      nickname: 'Polygon',
    },
    {
      rpcUrl: 'avalanche-rpc-url',
      chainId: '3',
      ticker: 'AVAX',
      nickname: 'Avalanche',
    },
  ];

  const { NetworkController, CurrencyRateController } = Engine.context as any;

  it('should change networks to the provided one', () => {
    const network = mockRPCFrequentList[0];
    const newNetwork = handleNetworkSwitch(
      network.chainId,
      mockRPCFrequentList,
      {
        networkController: NetworkController,
        currencyRateController: CurrencyRateController,
      },
    );
    expect(newNetwork).toBe(network.nickname);
  });
});
