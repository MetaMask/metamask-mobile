import { ChainId, NetworkType } from '@metamask/controller-utils';
import {
  isMainNet,
  isTestNet,
  getAllNetworks,
  getNetworkTypeById,
  findBlockExplorerForRpc,
  compareRpcUrls,
  getBlockExplorerAddressUrl,
  getBlockExplorerTxUrl,
  getNetworkNonce,
  convertNetworkId,
  deprecatedGetNetworkId,
  fetchEstimatedMultiLayerL1Fee,
} from '.';
import {
  MAINNET,
  RPC,
  SEPOLIA,
  LINEA_GOERLI,
  LINEA_MAINNET,
  LINEA_SEPOLIA,
} from '../../../app/constants/network';
import { NetworkSwitchErrorType } from '../../../app/constants/error';
import { getNonceLock } from '../../util/transaction-controller';
import Engine from './../../core/Engine';

jest.mock('./../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  context: {
    CurrencyRateController: {
      updateExchangeRate: () => jest.fn(),
      setLocked: () => jest.fn(),
    },
    NetworkController: {
      setActiveNetwork: () => jest.fn(),
      setProviderType: () => jest.fn(),
      state: {
        providerConfig: {
          chainId: '0x3',
        },
      },
    },
    PreferencesController: {
      state: {},
    },
    TransactionController: {
      getLayer1GasFee: jest.fn(async () => '0x0a25339d61'),
    },
  },
}));

jest.mock('../../util/transaction-controller', () => ({
  __esModule: true,
  getNonceLock: jest.fn(),
}));

describe('network-utils', () => {
  describe('getAllNetworks', () => {
    const allNetworks = getAllNetworks();
    it('should get all networks', () => {
      expect(allNetworks.includes(MAINNET)).toEqual(true);
      expect(allNetworks.includes(SEPOLIA)).toEqual(true);
      expect(allNetworks.includes(LINEA_SEPOLIA)).toEqual(true);
      expect(allNetworks.includes(LINEA_MAINNET)).toEqual(true);
    });
    it('should exclude rpc', () => {
      expect(allNetworks.includes(RPC)).toEqual(false);
    });
  });

  describe('isMainNet', () => {
    it(`should return true if the given chain ID is Ethereum Mainnet`, () => {
      expect(isMainNet('0x1')).toEqual(true);
    });
    it(`should return false if the selected network is not Ethereum Mainnet`, () => {
      expect(isMainNet('42')).toEqual(false);
    });
  });

  describe('isTestNet', () => {
    const testnets = [
      NetworkType.sepolia,
      NetworkType['linea-goerli'],
      NetworkType['linea-sepolia'],
    ];

    for (const networkType of testnets) {
      it(`should return true if the given chain ID is for '${networkType}'`, () => {
        expect(isTestNet(ChainId[networkType])).toEqual(true);
      });
    }

    it(`should return false if the given chain ID is not a known testnet`, () => {
      expect(isTestNet('42')).toEqual(false);
    });
  });

  describe('getNetworkTypeById', () => {
    it('should get network type by Id', () => {
      const type = getNetworkTypeById(11155111);
      expect(type).toEqual(SEPOLIA);
    });
    it('should fail if network Id is missing', () => {
      expect(() => getNetworkTypeById()).toThrow(
        NetworkSwitchErrorType.missingNetworkId,
      );
    });
    it('should fail if network Id is unknown', () => {
      const id = 9999;
      expect(() => getNetworkTypeById(id)).toThrow(
        `${NetworkSwitchErrorType.unknownNetworkId} ${id}`,
      );
    });
  });

  describe('findBlockExplorerForRpc', () => {
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
      expect(
        findBlockExplorerForRpc(mockRpcUrl, networkConfigurationsMock),
      ).toBe(expectedBlockExplorer);
    });
    it('should return undefined if the block explorer does not exist', () => {
      const mockRpcUrl = networkConfigurationsMock.networkId2.rpcUrl;
      expect(
        findBlockExplorerForRpc(mockRpcUrl, networkConfigurationsMock),
      ).toBe(undefined);
    });
    it('should return undefined if the RPC does not exist', () => {
      const mockRpcUrl = 'https://arb1.arbitrum.io/rpc';
      expect(
        findBlockExplorerForRpc(mockRpcUrl, networkConfigurationsMock),
      ).toBe(undefined);
    });
  });

  describe('compareRpcUrls', () => {
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

  describe('getBlockExplorerAddressUrl', () => {
    const mockEthereumAddress = '0x0000000000000000000000000000000000000001';
    it('should return null result when network type === "rpc" and rpcBlockExplorerUrl === null', () => {
      const { url, title } = getBlockExplorerAddressUrl(
        RPC,
        mockEthereumAddress,
      );

      expect(url).toBe(null);
      expect(title).toBe(null);
    });

    it('should return rpc block explorer address url when network type === "rpc"', () => {
      const { url, title } = getBlockExplorerAddressUrl(
        RPC,
        mockEthereumAddress,
        'http://avalanche-rpc-url',
      );

      expect(url).toBe(
        `http://avalanche-rpc-url/address/${mockEthereumAddress}`,
      );
      expect(title).toBe(`avalanche-rpc-url`);
    });

    it('should return etherscan block explorer address url when network type !== "rpc"', () => {
      const { url, title } = getBlockExplorerAddressUrl(
        SEPOLIA,
        mockEthereumAddress,
      );

      expect(url).toBe(
        `https://sepolia.etherscan.io/address/${mockEthereumAddress}`,
      );
      expect(title).toBe(`sepolia.etherscan.io`);
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

    it('should return custom block explorer address url when network type === "linea-sepolia"', () => {
      const { url, title } = getBlockExplorerAddressUrl(
        LINEA_SEPOLIA,
        mockEthereumAddress,
      );

      expect(url).toBe(
        `https://sepolia.lineascan.build/address/${mockEthereumAddress}`,
      );
      expect(title).toBe(`sepolia.lineascan.build`);
    });

    it('should return custom block explorer address url when network type === "linea-mainnet"', () => {
      const { url, title } = getBlockExplorerAddressUrl(
        LINEA_MAINNET,
        mockEthereumAddress,
      );

      expect(url).toBe(
        `https://lineascan.build/address/${mockEthereumAddress}`,
      );
      expect(title).toBe(`lineascan.build`);
    });
  });

  describe('getBlockExplorerTxUrl', () => {
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
      const { url, title } = getBlockExplorerTxUrl(
        SEPOLIA,
        mockTransactionHash,
      );

      expect(url).toBe(
        `https://sepolia.etherscan.io/tx/${mockTransactionHash}`,
      );
      expect(title).toBe(`sepolia.etherscan.io`);
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

    it('should return custom block explorer tx url when network type === "linea-sepolia"', () => {
      const { url, title } = getBlockExplorerTxUrl(
        LINEA_SEPOLIA,
        mockTransactionHash,
      );

      expect(url).toBe(
        `https://sepolia.lineascan.build/tx/${mockTransactionHash}`,
      );
      expect(title).toBe(`sepolia.lineascan.build`);
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

  describe('getNetworkNonce', () => {
    const nonceMock = 123;
    const fromMock = '0x123';

    it('returns value from TransactionController', async () => {
      (getNonceLock as jest.Mock).mockReturnValueOnce({
        nextNonce: nonceMock,
        releaseLock: jest.fn(),
      });

      expect(await getNetworkNonce({ from: fromMock })).toBe(nonceMock);

      expect(getNonceLock).toHaveBeenCalledWith(fromMock);
    });

    it('releases nonce lock', async () => {
      const releaseLockMock = jest.fn();

      (getNonceLock as jest.Mock).mockReturnValueOnce({
        releaseLock: releaseLockMock,
      });

      await getNetworkNonce({ from: fromMock });

      expect(releaseLockMock).toHaveBeenCalledTimes(1);
    });
  });
  describe('convertNetworkId', () => {
    it('converts a number to a string', () => {
      expect(convertNetworkId(1)).toEqual('1');
    });

    it('converts a hexadecimal string to a decimal string', () => {
      // Assuming convertHexToDecimal works correctly for '0x1' and returns 1
      expect(convertNetworkId('0x1')).toEqual('1');
    });

    it('returns the same string if it is numeric', () => {
      expect(convertNetworkId('123')).toEqual('123');
    });

    it('throws for non-numeric, non-hexadecimal strings', () => {
      expect(() => convertNetworkId('abc')).toThrow(
        "Cannot parse as a valid network ID: 'abc'",
      );
    });

    it('throws for NaN values', () => {
      expect(() => convertNetworkId(NaN)).toThrow(
        "Cannot parse as a valid network ID: 'NaN'",
      );
    });
  });

  describe('deprecatedGetNetworkId', () => {
    const mockSendAsync = jest.fn();

    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
      // Setup default behavior for mocked functions
      (Engine.controllerMessenger.call as jest.Mock).mockReturnValue({
        sendAsync: mockSendAsync,
      });
    });

    it('resolves with the correct network ID', async () => {
      // Mock sendAsync to call the callback with null error and a result
      mockSendAsync.mockImplementation((_, callback) => {
        callback(null, '1');
      });

      await expect(deprecatedGetNetworkId()).resolves.toEqual('1');
    });

    it('rejects when sendAsync encounters an error', async () => {
      // Mock sendAsync to call the callback with an error
      mockSendAsync.mockImplementation((_, callback) => {
        callback(new Error('Failed to fetch network ID'), null);
      });

      await expect(deprecatedGetNetworkId()).rejects.toThrow(
        'Failed to fetch network ID',
      );
    });

    it('throws when provider is not initialized', async () => {
      // Mock the call method to return undefined, simulating an uninitialized provider
      (Engine.controllerMessenger.call as jest.Mock).mockReturnValueOnce(
        undefined,
      );

      await expect(deprecatedGetNetworkId()).rejects.toThrow(
        'Provider has not been initialized',
      );
    });
  });

  describe('fetchEstimatedMultiLayerL1Fee', () => {
    it.only('returns a non-0x prefixed hex string', async () => {
      const txMeta = {
        chainId: '0xa',
        txParams: {
          data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000c307846656544796e616d69630000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff850000000000000000000000000000000000000000000000000023375dc1560800000000000000000000000000000000000000000000000000000000000184ebd9000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000004f94ae6af80000000000000000000000000045d047bfcb1055b9dd531ef9605e8f0b0dc285f300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000708415565b0000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff850000000000000000000000000000000000000000000000000023375dc1560800000000000000000000000000000000000000000000000000000000000184ebd800000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000004c0000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000023375dc15608000000000000000000000000000000000000000000000000000000000000000011000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000003600000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000042000000000000000000000000000000000000060000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff8500000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000032000000000000000000000000000000000000000000000000000000000000002e00000000000000000000000000000000000000000000000000023375dc1560800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000012556e69737761705633000000000000000000000000000000000000000000000000000000000000000023375dc1560800000000000000000000000000000000000000000000000000000000000184ebd8000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000e592427a0aece92de3edee1f18e0157c0586156400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002b42000000000000000000000000000000000000060001f40b2c639c533813f4aa9d7837caf62653d097ff85000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000004200000000000000000000000000000000000006000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000000869584cd00000000000000000000000011ededebf63bef0ea2d2d071bdf88f71543ec6fb00000000000000000000000000000000000000000df057b339e721ee3d141aef0000000000000000000000000000000000000000000000000090',
          from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          gas: '0x1e583e',
          to: '0x9dda6ef3d919c9bc8885d5560999a3640431e8e6',
          value: '0x2386f26fc10000',
        },
      };

      const layer1GasFee = await fetchEstimatedMultiLayerL1Fee({}, txMeta);

      expect(layer1GasFee.startsWith('0x')).toEqual(false);
      expect(layer1GasFee).toEqual('0a25339d61');
    });
  });
});
