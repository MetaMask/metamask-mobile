import { ChainId } from '@metamask/controller-utils';
import networksWithImages from 'images/image-icons';
import NetworkList, {
  isMainNet,
  isTestNet,
  getAllNetworks,
  getNetworkTypeById,
  findBlockExplorerForRpc,
  compareRpcUrls,
  getBlockExplorerAddressUrl,
  getBlockExplorerTxUrl,
  isPrivateConnection,
  findBlockExplorerForNonEvmAccount,
  isLineaMainnetChainId,
  getTestNetImageByChainId,
  TESTNET_CHAIN_IDS,
  WHILELIST_NETWORK_NAME,
  isValidNetworkName,
} from '.';
import {
  convertNetworkId,
  deprecatedGetNetworkId,
  fetchEstimatedMultiLayerL1Fee,
} from './engineNetworkUtils';
import {
  MAINNET,
  RPC,
  SEPOLIA,
  LINEA_GOERLI,
  LINEA_MAINNET,
  LINEA_SEPOLIA,
  MEGAETH_TESTNET,
  MONAD_TESTNET,
  BASE_MAINNET,
  NETWORKS_CHAIN_ID,
} from '../../../app/constants/network';
import { NetworkSwitchErrorType } from '../../../app/constants/error';
import Engine from './../../core/Engine';
import { TransactionMeta } from '@metamask/transaction-controller';
import {
  MOCK_SOLANA_ACCOUNT,
  MOCK_ACCOUNT_BIP122_P2WPKH,
  MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET,
} from '../test/accountsControllerTestUtils';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import {
  selectMultichainNetworkControllerState,
  selectSelectedNonEvmNetworkChainId,
} from '../../selectors/multichainNetworkController';

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
        selectedNetworkClientId: 'mainnet',
        networksMetadata: {
          mainnet: {
            status: 'available',
            EIPS: {
              '1559': true,
            },
          },
        },
        networkConfigurationsByChainId: {
          '0x3': {
            blockExplorerUrls: ['https://etherscan.com'],
            chainId: '0x3',
            defaultRpcEndpointIndex: 0,
            name: 'Sepolia',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'sepolia',
                type: 'Custom',
                url: 'http://localhost/v3/',
              },
            ],
          },
        },
      },
    },
    MultichainNetworkController: {
      setActiveNetwork: () => jest.fn(),
    },
    PreferencesController: {
      state: {},
    },
    TransactionController: {
      getLayer1GasFee: jest.fn(async () => '0x0a25339d61'),
    },
  },
}));

// Mock the store and selectors
jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('../../selectors/multichainNetworkController', () => ({
  selectMultichainNetworkControllerState: jest.fn(),
  selectSelectedNonEvmNetworkChainId: jest.fn(),
  selectSelectedNonEvmNetworkSymbol: jest.fn(),
  selectIsEvmNetworkSelected: jest.fn(),
  selectNonEvmNetworkConfigurationsByChainId: jest.fn(),
}));

describe('network-utils', () => {
  describe('getAllNetworks', () => {
    const allNetworks = getAllNetworks();
    it('should get all networks', () => {
      expect(allNetworks).toStrictEqual([
        MAINNET,
        LINEA_MAINNET,
        BASE_MAINNET,
        SEPOLIA,
        LINEA_SEPOLIA,
        MEGAETH_TESTNET,
        MONAD_TESTNET,
      ]);
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
    it.each(TESTNET_CHAIN_IDS)(
      'should return true if the given chain ID is %s',
      (chainId) => {
        expect(isTestNet(chainId)).toEqual(true);
      },
    );

    it(`should return false if the given chain ID is not a known testnet`, () => {
      expect(isTestNet('42')).toEqual(false);
    });
  });

  describe('getNetworkTypeById', () => {
    it.each([getAllNetworks()])(
      'should get network type by Id - %s',
      (networkKey) => {
        const network = NetworkList[
          networkKey as keyof typeof NetworkList
        ] as unknown as {
          networkId: string;
          networkType: string;
        };
        const type = getNetworkTypeById(network.networkId);
        expect(type).toStrictEqual(network.networkType);
      },
    );

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
      '0x89': {
        blockExplorerUrls: ['https://polygonscan.com'],
        chainId: '0x89',
        defaultRpcEndpointIndex: 0,
        name: 'Polygon Mainnet',
        nativeCurrency: 'MATIC',
        rpcEndpoints: [
          {
            networkClientId: 'polygon',
            type: 'Custom',
            url: 'https://polygon-mainnet.infura.io/v3',
          },
        ],
      },
      '0x38': {
        blockExplorerUrls: [],
        chainId: '0x38',
        defaultRpcEndpointIndex: 0,
        name: 'Binance Smart Chain',
        nativeCurrency: 'BNB',
        rpcEndpoints: [
          {
            networkClientId: 'bsc',
            type: 'Custom',
            url: 'https://bsc-dataseed.binance.org/',
          },
        ],
      },
      '0xa': {
        blockExplorerUrls: ['https://optimistic.ethereum.io'],
        chainId: '0xa',
        defaultRpcEndpointIndex: 0,
        name: 'Optimism',
        nativeCurrency: 'ETH',
        defaultBlockExplorerUrlIndex: 0,
        rpcEndpoints: [
          {
            networkClientId: 'optimism',
            type: 'Custom',
            url: 'https://mainnet.optimism.io',
          },
        ],
      },
    };

    it('should find the block explorer if it exists', () => {
      const mockRpcUrl = networkConfigurationsMock['0xa'].rpcEndpoints[0].url;
      const expectedBlockExplorer =
        networkConfigurationsMock['0xa'].blockExplorerUrls[0];
      expect(
        findBlockExplorerForRpc(mockRpcUrl, networkConfigurationsMock),
      ).toBe(expectedBlockExplorer);
    });

    it('should return undefined if the block explorer does not exist', () => {
      const mockRpcUrl = networkConfigurationsMock['0x38'].rpcEndpoints[0].url;
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
    it('returns a non-0x prefixed hex string', async () => {
      const txMeta = {
        chainId: '0xa',
        txParams: {
          data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000c307846656544796e616d6963000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff850000000000000000000000000000000000000000000000000023375dc1560800000000000000000000000000000000000000000000000000000000000184ebd9000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000004f94ae6af80000000000000000000000000045d047bfcb1055b9dd531ef9605e8f0b0dc285f300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000708415565b0000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff850000000000000000000000000000000000000000000000000023375dc1560800000000000000000000000000000000000000000000000000000000000184ebd800000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000004c0000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000023375dc1560800000000000000000000000000000000000000000000000000000000000000001100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000360000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004200000000000000000000000000000000000006000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000000869584cd00000000000000000000000011ededebf63bef0ea2d2d071bdf88f71543ec6fb00000000000000000000000000000000000000000df057b339e721ee3d141aef0000000000000000000000000000000000000000000000000090',
          from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          gas: '0x1e583e',
          to: '0x9dda6ef3d919c9bc8885d5560999a3640431e8e6',
          value: '0x2386f26fc10000',
        },
      };

      const layer1GasFee = await fetchEstimatedMultiLayerL1Fee(
        {},
        txMeta as TransactionMeta,
      );

      expect(layer1GasFee?.startsWith('0x')).toEqual(false);
      expect(layer1GasFee).toEqual('0a25339d61');
    });
  });

  describe('isPrivateConnection', () => {
    it('returns true for localhost', () => {
      expect(isPrivateConnection('localhost')).toBe(true);
    });

    it('returns true for 127.0.0.1', () => {
      expect(isPrivateConnection('127.0.0.1')).toBe(true);
    });

    it('returns true for 192.168.x.x', () => {
      expect(isPrivateConnection('192.168.1.1')).toBe(true);
    });

    it('returns true for 10.x.x.x', () => {
      expect(isPrivateConnection('10.0.0.1')).toBe(true);
    });

    it('returns true for 172.16.x.x', () => {
      expect(isPrivateConnection('172.16.0.1')).toBe(true);
    });

    it('returns true for for 172.31.x.x', () => {
      expect(isPrivateConnection('172.31.255.255')).toBe(true);
    });

    it('returns false for a public IP', () => {
      expect(isPrivateConnection('8.8.8.8')).toBe(false);
    });

    it('returns false for a non-IP hostname', () => {
      expect(isPrivateConnection('example.com')).toBe(false);
    });

    it('returns true for edge case within 172 range', () => {
      expect(isPrivateConnection('172.20.0.1')).toBe(true);
    });

    it('returns false for an IP not in private ranges', () => {
      expect(isPrivateConnection('192.169.0.1')).toBe(false);
    });
  });

  describe('findBlockExplorerForNonEvmAccount', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      // Default mock for MultichainNetworkController state with only mainnet networks
      (selectMultichainNetworkControllerState as jest.Mock).mockReturnValue({
        multichainNetworkConfigurationsByChainId: {
          'bip122:000000000019d6689c085ae165831e93': {
            chainId: 'bip122:000000000019d6689c085ae165831e93',
            name: 'Bitcoin',
            nativeCurrency: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
            isEvm: false,
          },
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            name: 'Solana',
            nativeCurrency:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            isEvm: false,
          },
        },
        selectedMultichainNetworkChainId:
          'bip122:000000000019d6689c085ae165831e93',
        isEvmSelected: false,
      });

      // Mock the selectedNonEvmNetworkChainId selector with a default Bitcoin mainnet value
      (
        selectSelectedNonEvmNetworkChainId as unknown as jest.Mock
      ).mockReturnValue('bip122:000000000019d6689c085ae165831e93');
    });
    it('returns undefined when no valid scope is found', () => {
      const MOCK_INVALID_ACCOUNT = {
        scopes: ['unknown:network'],
        address: 'invalidAddress123',
      };
      const url = findBlockExplorerForNonEvmAccount(MOCK_INVALID_ACCOUNT);
      expect(url).toBe(undefined);
    });

    describe('When testnet networks are not in MultichainNetworkController state', () => {
      it('returns undefined for testnet chain ID not present in MultichainNetworkController state and selectedNonEvmNetworkChainId is not found in the account scopes', () => {
        // Set the selectedNonEvmNetworkChainId to Solana mainnet
        (
          selectSelectedNonEvmNetworkChainId as unknown as jest.Mock
        ).mockReturnValue(SolScope.Mainnet);

        const url = findBlockExplorerForNonEvmAccount(
          MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET,
        );

        expect(url).toBe(undefined);
        expect(selectMultichainNetworkControllerState).toHaveBeenCalled();
      });

      it('returns testnet block explorer URL when the selectedNonEvmNetworkChainId matches a testnet in account scopes', () => {
        // Set the selectedNonEvmNetworkChainId to Bitcoin testnet
        (
          selectSelectedNonEvmNetworkChainId as unknown as jest.Mock
        ).mockReturnValue(BtcScope.Testnet);

        const url = findBlockExplorerForNonEvmAccount(
          MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET,
        );

        expect(url).toBe(
          `https://mempool.space/testnet/address/${MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET.address}`,
        );
      });
    });

    describe('When testnet networks are included in MultichainNetworkController state', () => {
      beforeEach(() => {
        // Mock with both mainnet and testnet networks
        (selectMultichainNetworkControllerState as jest.Mock).mockReturnValue({
          multichainNetworkConfigurationsByChainId: {
            'bip122:000000000019d6689c085ae165831e93': {
              chainId: 'bip122:000000000019d6689c085ae165831e93',
              name: 'Bitcoin Mainnet',
              nativeCurrency:
                'bip122:000000000019d6689c085ae165831e93/slip44:0',
              isEvm: false,
            },
            'bip122:000000000933ea01ad0ee984209779ba': {
              chainId: 'bip122:000000000933ea01ad0ee984209779ba',
              name: 'Bitcoin Testnet',
              nativeCurrency:
                'bip122:000000000933ea01ad0ee984209779ba/slip44:1',
              isEvm: false,
            },
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
              chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
              name: 'Solana Mainnet',
              nativeCurrency:
                'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              isEvm: false,
            },
            'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY': {
              chainId: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY',
              name: 'Solana Testnet',
              nativeCurrency:
                'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              isEvm: false,
            },
            'solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K9vzT4v6Lfzw8': {
              chainId: 'solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K9vzT4v6Lfzw8',
              name: 'Solana Devnet',
              nativeCurrency:
                'solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K9vzT4v6Lfzw8/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              isEvm: false,
            },
          },
          selectedMultichainNetworkChainId:
            'bip122:000000000019d6689c085ae165831e93',
          isEvmSelected: false,
        });
      });

      it('returns Bitcoin testnet explorer url when the selectedNonEvmNetworkChainId is BtcScope.Testnet and is in the MultichainNetworkController state', () => {
        // Set the selectedNonEvmNetworkChainId to Bitcoin testnet
        (
          selectSelectedNonEvmNetworkChainId as unknown as jest.Mock
        ).mockReturnValue(BtcScope.Testnet);

        const url = findBlockExplorerForNonEvmAccount(
          MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET,
        );

        expect(url).toBe(
          `https://mempool.space/testnet/address/${MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET.address}`,
        );
      });

      it('returns Solana testnet explorer url when the selectedNonEvmNetworkChainId is SolScope.Testnet and is in the MultichainNetworkController state', () => {
        // Set the selectedNonEvmNetworkChainId to Solana testnet
        (
          selectSelectedNonEvmNetworkChainId as unknown as jest.Mock
        ).mockReturnValue(SolScope.Testnet);

        const url = findBlockExplorerForNonEvmAccount({
          ...MOCK_SOLANA_ACCOUNT,
          scopes: [SolScope.Testnet],
        });

        expect(url).toBe(
          `https://solscan.io/account/${MOCK_SOLANA_ACCOUNT.address}?cluster=testnet`,
        );
      });

      it('prioritizes the selected network chain ID when it exists in both the account scopes and MultichainNetworkController state', () => {
        const mockAccountWithMultipleScopes = {
          ...MOCK_ACCOUNT_BIP122_P2WPKH,
          scopes: [BtcScope.Mainnet, BtcScope.Testnet],
          address: 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k',
        };

        // Test with testnet selected
        (
          selectSelectedNonEvmNetworkChainId as unknown as jest.Mock
        ).mockReturnValue(BtcScope.Testnet);
        const testnetUrl = findBlockExplorerForNonEvmAccount(
          mockAccountWithMultipleScopes,
        );
        expect(testnetUrl).toBe(
          `https://mempool.space/testnet/address/${mockAccountWithMultipleScopes.address}`,
        );

        // Test with mainnet selected
        (
          selectSelectedNonEvmNetworkChainId as unknown as jest.Mock
        ).mockReturnValue(BtcScope.Mainnet);
        const mainnetUrl = findBlockExplorerForNonEvmAccount(
          mockAccountWithMultipleScopes,
        );
        expect(mainnetUrl).toBe(
          `https://mempool.space/address/${mockAccountWithMultipleScopes.address}`,
        );
      });

      it('falls back to finding a matching network in MultichainNetworkController state when selected network is not in account scopes', () => {
        // Account with only testnet scope
        const mockBitcoinTestnetAccount = {
          ...MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET,
          scopes: [BtcScope.Testnet],
        };

        // Set the selectedNonEvmNetworkChainId to Solana mainnet
        (
          selectSelectedNonEvmNetworkChainId as unknown as jest.Mock
        ).mockReturnValue(SolScope.Mainnet);

        // Selected network is Solana, which isn't in account scopes
        const url = findBlockExplorerForNonEvmAccount(
          mockBitcoinTestnetAccount,
        );

        // Should find the testnet network in MultichainNetworkController state
        expect(url).toBe(
          `https://mempool.space/testnet/address/${mockBitcoinTestnetAccount.address}`,
        );
      });
    });
  });

  describe('isLineaMainnetChainId', () => {
    it('returns true for linea mainnet chain id', () => {
      expect(isLineaMainnetChainId('0xe708')).toBe(true);
    });

    it('returns false for linea testnet chain id', () => {
      expect(isLineaMainnetChainId('0x13882')).toBe(false);
    });
  });

  describe('getTestNetImageByChainId', () => {
    it.each([
      {
        chainId: ChainId.sepolia,
        expectedImage: networksWithImages?.SEPOLIA,
      },
      {
        chainId: ChainId['linea-goerli'],
        expectedImage: networksWithImages?.['LINEA-GOERLI'],
      },
      {
        chainId: ChainId['linea-sepolia'],
        expectedImage: networksWithImages?.['LINEA-SEPOLIA'],
      },
      {
        chainId: ChainId['megaeth-testnet'],
        expectedImage: networksWithImages?.['MEGAETH-TESTNET'],
      },
      {
        chainId: ChainId['monad-testnet'],
        expectedImage: networksWithImages?.['MONAD-TESTNET'],
      },
    ])(
      'returns corresponding image for the testnet - $.chainId',
      ({ chainId, expectedImage }) => {
        const testnetImage = getTestNetImageByChainId(chainId);
        expect(testnetImage).toEqual(expectedImage);
      },
    );
  });

  describe('isValidNetworkName', () => {
    it('returns true if the network nickname is the same with network name ', () => {
      expect(isValidNetworkName(ChainId.sepolia, 'Sepolia', 'Sepolia')).toBe(
        true,
      );
    });

    it.each([
      {
        chainId: ChainId.mainnet,
        name: 'Ethereum Mainnet',
        nickname: WHILELIST_NETWORK_NAME[ChainId.mainnet],
      },
      {
        chainId: ChainId['linea-mainnet'],
        name: 'Linea Mainnet',
        nickname: WHILELIST_NETWORK_NAME[ChainId['linea-mainnet']],
      },
      {
        chainId: ChainId['megaeth-testnet'],
        name: 'MegaETH Testnet',
        nickname: WHILELIST_NETWORK_NAME[ChainId['megaeth-testnet']],
      },
      {
        chainId: ChainId['monad-testnet'],
        name: 'Monad Testnet',
        nickname: WHILELIST_NETWORK_NAME[ChainId['monad-testnet']],
      },
      {
        chainId: NETWORKS_CHAIN_ID.SEI,
        name: 'Sei Mainnet',
        nickname: WHILELIST_NETWORK_NAME[NETWORKS_CHAIN_ID.SEI],
      },
    ])(
      'returns true if the chainId is %.chainId and network nickname is the same with the whilelisted name',
      ({ chainId, name, nickname }) => {
        expect(isValidNetworkName(chainId, name, nickname)).toBe(true);
      },
    );

    it('returns false if the chainId is not Mainnet, Linea Mainnet, MegaETH Testnet and the network nickname is different with network name', () => {
      expect(
        isValidNetworkName(ChainId.sepolia, 'Sepolia', 'Some other nickname'),
      ).toBe(false);
    });
  });
});
