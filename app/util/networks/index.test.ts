import {
  isMainNet,
  getNetworkName,
  getAllNetworks,
  getNetworkTypeById,
  findBlockExplorerForRpc,
  compareRpcUrls,
} from '.';
import {
  MAINNET,
  ROPSTEN,
  GOERLI,
  RPC,
  KOVAN,
} from '../../../app/constants/network';
import {
  NETWORK_ERROR_MISSING_NETWORK_ID,
  NETWORK_ERROR_UNKNOWN_NETWORK_ID,
} from '../../../app/constants/error';

describe('NetworkUtils::getAllNetworks', () => {
  const allNetworks = getAllNetworks();
  it('should get all networks', () => {
    expect(allNetworks.includes(MAINNET)).toEqual(true);
    expect(allNetworks.includes(ROPSTEN)).toEqual(true);
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
            type: ROPSTEN,
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

  it(`should get network name for ${ROPSTEN} id`, () => {
    const main = getNetworkName(String(3));
    expect(main).toEqual(ROPSTEN);
  });

  it(`should get network name for ${KOVAN} id`, () => {
    const main = getNetworkName(String(42));
    expect(main).toEqual(KOVAN);
  });

  it(`should return undefined for unknown network id`, () => {
    const main = getNetworkName(String(99));
    expect(main).toEqual(undefined);
  });
});

describe('NetworkUtils::getNetworkTypeById', () => {
  it('should get network type by Id', () => {
    const type = getNetworkTypeById(42);
    expect(type).toEqual(KOVAN);
  });
  it('should fail if network Id is missing', () => {
    try {
      getNetworkTypeById();
    } catch (error) {
      expect(error.message).toEqual(NETWORK_ERROR_MISSING_NETWORK_ID);
    }
  });
  it('should fail if network Id is unknown', () => {
    const id = 9999;
    try {
      getNetworkTypeById(id);
    } catch (error) {
      expect(error.message).toEqual(
        `${NETWORK_ERROR_UNKNOWN_NETWORK_ID} ${id}`,
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
