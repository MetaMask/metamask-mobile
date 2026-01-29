import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { ImageSourcePropType } from 'react-native';
import {
  CaipChainId,
  Hex,
  parseCaipChainId,
  isCaipChainId,
} from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';
import { ProcessedNetwork } from '../useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from './useNetworkSelection';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import {
  selectPopularNetworkConfigurationsByCaipChainId,
  selectNetworkConfigurationsByCaipChainId,
} from '../../../selectors/networkController';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import Engine from '../../../core/Engine';
import NavigationService from '../../../core/NavigationService';

const mockEnableNetwork = jest.fn();
const mockDisableNetwork = jest.fn();
const mockEnableAllPopularNetworks = jest.fn();
const mockSetActiveNetwork = jest.fn();
const mockFindNetworkClientIdByChainId = jest.fn();

jest.mock('@metamask/keyring-utils', () => ({}));
jest.mock('@metamask/transaction-controller', () => ({}));
jest.mock('@metamask/multichain-network-controller', () => ({}));
jest.mock('@metamask/keyring-controller', () => ({}));
jest.mock('@metamask/utils', () => ({
  parseCaipChainId: jest.fn(),
  isCaipChainId: jest.fn(),
  KnownCaipNamespace: {
    Eip155: 'eip155',
    Bip122: 'bip122',
    Solana: 'solana',
  },
  createProjectLogger: jest.fn(),
  createModuleLogger: jest.fn(),
}));

jest.mock('@metamask/keyring-api', () => ({
  SolScope: {
    Mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    Devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    Testnet: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
  },
  BtcScope: {
    Mainnet: 'bip122:000000000019d6689c085ae165831e93',
    Testnet: 'bip122:000000000933ea01ad0ee984209779ba',
    Testnet4: 'bip122:00000000da84f2bafbbc53dee25a72ae',
    Signet: 'bip122:00000008819873e925422c1ff0f99f7c',
  },
  BtcAccountType: {
    P2pkh: 'bip122:p2pkh',
    P2sh: 'bip122:p2sh',
    P2wpkh: 'bip122:p2wpkh',
    P2tr: 'bip122:p2tr',
  },
  SolAccountType: {
    DataAccount: 'solana:data-account',
  },
  TrxScope: {
    Mainnet: 'tron:0x2b6653dc',
    Nile: 'tron:0xcd8690dc',
    Shasta: 'tron:0x94a9059e',
  },
  TrxAccountType: {
    Eoa: 'tron:eoa',
  },
}));
jest.mock('@metamask/rpc-errors', () => ({}));
jest.mock('@metamask/network-controller', () => ({}));

jest.mock('@metamask/controller-utils', () => ({
  hasProperty: jest.fn(),
  toHex: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn(),
}));

jest.mock('../../../constants/popular-networks', () => ({
  POPULAR_NETWORK_CHAIN_IDS: new Set(['0x1', '0x89', '0xa']),
}));

jest.mock('../useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(),
}));

jest.mock(
  '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: jest.fn(),
  }),
);

jest.mock('../../../core/Engine', () => ({
  context: {
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
  },
  setSelectedAddress: jest.fn(), // Add this line
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  };
});

jest.mock('@metamask/snaps-sdk', () => ({}));
jest.mock('@metamask/snaps-utils', () => ({}));
jest.mock('@metamask/keyring-snap-client', () => ({}));

jest.mock('../../../util/transactions', () => ({}));

jest.mock('../../../constants/transaction', () => ({
  TransactionType: {
    stakingClaim: 'stakingClaim',
    stakingDeposit: 'stakingDeposit',
    stakingWithdraw: 'stakingWithdraw',
  },
}));

jest.mock('../../../reducers/swaps', () => ({
  swapsControllerAndUserTokensMultichain: jest.fn(),
  swapsControllerTokens: jest.fn(),
}));

jest.mock('../../../selectors/tokensController', () => ({
  selectTokens: jest.fn(),
  selectTokensControllerState: jest.fn(),
  selectAllTokens: jest.fn(),
}));

jest.mock('../../../selectors/smartTransactionsController', () => ({
  selectSortedTransactions: jest.fn(),
  selectNonReplacedTransactions: jest.fn(),
  selectPendingSmartTransactionsBySender: jest.fn(),
  selectPendingSmartTransactionsForSelectedAccountGroup: jest.fn(),
}));

jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest.fn(),
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
  selectInternalAccounts: jest.fn(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(),
  selectPopularNetworkConfigurationsByCaipChainId: jest.fn(),
  selectNetworkConfigurationsByCaipChainId: jest.fn(),
}));

jest.mock('../../../core/NavigationService', () => {
  const mockNavigate = jest.fn();
  return {
    navigation: {
      navigate: mockNavigate,
    },
    default: {
      navigation: {
        navigate: mockNavigate,
      },
    },
  };
});

jest.mock('../../../core/SnapKeyring/MultichainWalletSnapClient', () => ({
  WalletClientType: {
    Bitcoin: 'bitcoin',
  },
}));

jest.mock('../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn(
    (chainId: string) =>
      // Check if the chain ID is a non-EVM chain (Solana, Bitcoin, Tron)
      chainId.startsWith('solana:') ||
      chainId.startsWith('bip122:') ||
      chainId.startsWith('tron:'),
  ),
}));

jest.mock('../../../constants/navigation/Routes', () => ({
  MODAL: {
    ROOT_MODAL_FLOW: 'RootModalFlow',
  },
  SHEET: {
    ADD_ACCOUNT: 'AddAccount',
  },
}));

describe('useNetworkSelection', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseNetworkEnablement = useNetworkEnablement as jest.MockedFunction<
    typeof useNetworkEnablement
  >;
  const mockToHex = toHex as jest.MockedFunction<typeof toHex>;
  const mockFormatChainIdToCaip = formatChainIdToCaip as jest.MockedFunction<
    typeof formatChainIdToCaip
  >;
  const mockParseCaipChainId = parseCaipChainId as jest.MockedFunction<
    typeof parseCaipChainId
  >;

  const mockNetworks: ProcessedNetwork[] = [
    {
      id: 'eip155:1',
      name: 'Ethereum Mainnet',
      caipChainId: 'eip155:1' as CaipChainId,
      isSelected: true,
      imageSource: { uri: 'ethereum.png' },
    },
    {
      id: 'eip155:137',
      name: 'Polygon',
      caipChainId: 'eip155:137' as CaipChainId,
      isSelected: false,
      imageSource: { uri: 'polygon.png' },
    },
    {
      id: 'eip155:13881',
      name: 'Mumbai Testnet',
      caipChainId: 'eip155:13881' as CaipChainId,
      isSelected: true,
      imageSource: { uri: 'mumbai.png' },
    },
  ];

  const mockPopularNetworkConfigurations = [
    {
      caipChainId: 'eip155:1' as CaipChainId,
      chainId: '0x1',
      name: 'Ethereum Mainnet',
    },
    {
      caipChainId: 'eip155:137' as CaipChainId,
      chainId: '0x89',
      name: 'Polygon',
    },
  ];

  const mockNetworkConfigurations = {
    'eip155:1': {
      caipChainId: 'eip155:1' as CaipChainId,
      chainId: '0x1' as Hex,
      name: 'Ethereum Mainnet',
      rpcEndpoints: [
        {
          networkClientId: 'mainnet-client-id',
          url: 'https://mainnet.infura.io',
          type: 'infura',
        },
      ],
      defaultRpcEndpointIndex: 0,
    },
    'eip155:137': {
      caipChainId: 'eip155:137' as CaipChainId,
      chainId: '0x89' as Hex,
      name: 'Polygon',
      rpcEndpoints: [
        {
          networkClientId: 'polygon-client-id',
          url: 'https://polygon-rpc.com',
          type: 'custom',
        },
      ],
      defaultRpcEndpointIndex: 0,
    },
    'eip155:13881': {
      caipChainId: 'eip155:13881' as CaipChainId,
      chainId: '0x13881' as Hex,
      name: 'Mumbai Testnet',
      rpcEndpoints: [
        {
          networkClientId: 'mumbai-client-id',
          url: 'https://mumbai.polygonscan.com',
          type: 'custom',
        },
      ],
      defaultRpcEndpointIndex: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnableNetwork.mockReset();
    mockDisableNetwork.mockReset();
    mockEnableAllPopularNetworks.mockReset();
    mockSetActiveNetwork.mockReset();
    mockFindNetworkClientIdByChainId.mockReset();

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
        return mockPopularNetworkConfigurations;
      }
      if (selector === selectNetworkConfigurationsByCaipChainId) {
        return mockNetworkConfigurations;
      }
      if (selector === selectMultichainAccountsState2Enabled) {
        return false;
      }
      if (selector === selectInternalAccounts) {
        return [];
      }
      return undefined;
    });

    mockUseNetworkEnablement.mockReturnValue({
      namespace: 'eip155',
      enabledNetworksByNamespace: {
        eip155: {
          '0x1': true,
          '0x89': false,
          '0x13881': true,
        },
      },
      enabledNetworksForCurrentNamespace: {
        '0x1': true,
        '0x89': false,
        '0x13881': true,
      },
      networkEnablementController: {
        enableNetwork: jest.fn(),
        disableNetwork: jest.fn(),
      } as unknown as ReturnType<
        typeof useNetworkEnablement
      >['networkEnablementController'],
      enableNetwork: mockEnableNetwork,
      disableNetwork: mockDisableNetwork,
      isNetworkEnabled: jest.fn(),
      hasOneEnabledNetwork: false,
      enableAllPopularNetworks: mockEnableAllPopularNetworks,
      tryEnableEvmNetwork: jest.fn(),
      enabledNetworksForAllNamespaces: {
        '0x1': true,
        '0x89': false,
        '0x13881': true,
      },
    });

    mockToHex.mockImplementation((value) => {
      if (typeof value === 'string') {
        if (value.startsWith('0x')) {
          return value as `0x${string}`;
        }
        return `0x${value}` as `0x${string}`;
      }
      return `0x${value}` as `0x${string}`;
    });

    mockFormatChainIdToCaip.mockImplementation((value) => {
      if (typeof value === 'string') {
        if (value.includes(':')) {
          return value as CaipChainId;
        }
        return `eip155:${value.replace('0x', '')}` as CaipChainId;
      }
      return `eip155:${value}` as CaipChainId;
    });

    mockParseCaipChainId.mockImplementation((caipChainId: string) => ({
      namespace: caipChainId.split(':')[0],
      reference: caipChainId.split(':')[1],
    }));
  });

  describe('basic functionality', () => {
    it('returns expected object structure', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(result.current).toHaveProperty('selectCustomNetwork');
      expect(result.current).toHaveProperty('selectPopularNetwork');
      expect(result.current).toHaveProperty('selectNetwork');
      expect(result.current).toHaveProperty('deselectAll');
      expect(result.current).toHaveProperty('customNetworksToReset');
    });

    it('returns functions for network operations', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(typeof result.current.selectCustomNetwork).toBe('function');
      expect(typeof result.current.selectPopularNetwork).toBe('function');
      expect(typeof result.current.selectNetwork).toBe('function');
      expect(typeof result.current.deselectAll).toBe('function');
    });

    it('calculates customNetworksToReset correctly', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(result.current.customNetworksToReset).toEqual(['eip155:13881']);
    });
  });

  describe('selectCustomNetwork', () => {
    it('enables the custom network and resets other custom networks', async () => {
      const customChainId = 'eip155:999' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      await result.current.selectCustomNetwork(customChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
    });

    it('calls the callback function after network selection', async () => {
      // Arrange
      const customChainId = 'eip155:999' as CaipChainId;
      const mockCallback = jest.fn();

      // Act
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      await result.current.selectCustomNetwork(customChainId, mockCallback);

      // Assert
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
    });

    it('does not call callback when none is provided', async () => {
      // Arrange
      const customChainId = 'eip155:999' as CaipChainId;

      // Act
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      // Should not throw when no callback is provided
      await expect(
        result.current.selectCustomNetwork(customChainId),
      ).resolves.toBeUndefined();
      expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
    });

    it('enables the custom network when no other custom networks exist', async () => {
      const customChainId = 'eip155:999' as CaipChainId;
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': false,
          },
        },
        enabledNetworksForCurrentNamespace: {
          '0x1': true,
          '0x89': false,
        },
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        enableAllPopularNetworks: mockEnableAllPopularNetworks,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        tryEnableEvmNetwork: jest.fn(),
        enabledNetworksForAllNamespaces: {
          '0x1': true,
          '0x89': false,
          '0x13881': true,
        },
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      await result.current.selectCustomNetwork(customChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
      expect(mockDisableNetwork).not.toHaveBeenCalled();
    });
  });

  describe('selectPopularNetwork', () => {
    it('enables the popular network and resets custom networks', () => {
      const popularChainId = 'eip155:1' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectPopularNetwork(popularChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(popularChainId);
    });

    it('calls the callback function after popular network selection', async () => {
      // Arrange
      const popularChainId = 'eip155:1' as CaipChainId;
      const mockCallback = jest.fn();

      // Act
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      await result.current.selectPopularNetwork(popularChainId, mockCallback);

      // Assert
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockEnableNetwork).toHaveBeenCalledWith(popularChainId);
    });

    it('toggles the popular network when no custom networks exist', async () => {
      const popularChainId = 'eip155:137' as CaipChainId;
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': false,
          },
        },
        enabledNetworksForCurrentNamespace: {
          '0x1': true,
          '0x89': false,
        },
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        enableAllPopularNetworks: mockEnableAllPopularNetworks,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        tryEnableEvmNetwork: jest.fn(),
        enabledNetworksForAllNamespaces: {
          '0x1': true,
          '0x89': false,
          '0x13881': true,
        },
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      await result.current.selectPopularNetwork(popularChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(popularChainId);
      expect(mockDisableNetwork).not.toHaveBeenCalled();
    });
  });

  describe('selectNetwork', () => {
    it('selects popular network when chainId is popular', () => {
      const popularChainId = 'eip155:1' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectNetwork(popularChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(popularChainId);
    });

    it('selects custom network when chainId is not popular', () => {
      const customChainId = 'eip155:999' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectNetwork(customChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
    });

    it('handles hex chainId format', () => {
      const hexChainId = '0x1' as `0x${string}`;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectNetwork(hexChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith('eip155:1');
    });

    it('handles numeric chainId format', () => {
      const numericChainId = 1 as unknown as Hex;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectNetwork(numericChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith('eip155:1');
    });
  });

  describe('multichain functionality', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': false,
            '0x13881': true,
          },
        },
        enabledNetworksForCurrentNamespace: {
          '0x1': true,
          '0x89': false,
          '0x13881': true,
        },
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        enableAllPopularNetworks: mockEnableAllPopularNetworks,
        tryEnableEvmNetwork: jest.fn(),
        enabledNetworksForAllNamespaces: {
          '0x1': true,
          '0x89': false,
          '0x13881': true,
        },
      });
    });

    it('selectCustomNetwork with multichain enabled calls MultichainNetworkController', async () => {
      // Mock multichain enabled
      mockUseSelector
        .mockReturnValueOnce(mockPopularNetworkConfigurations)
        .mockReturnValueOnce(true) // isMultichainAccountsState2Enabled = true
        .mockReturnValueOnce([]); // selectInternalAccounts

      const customChainId = 'eip155:999' as CaipChainId;
      const mockCallback = jest.fn();

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectCustomNetwork(customChainId, mockCallback);

      expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
      expect(mockCallback).toHaveBeenCalled();
    });

    it('selectPopularNetwork with Solana mainnet calls enableNetwork', async () => {
      const solanaMainnet =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectPopularNetwork(solanaMainnet);

      expect(mockEnableNetwork).toHaveBeenCalledWith(solanaMainnet);
    });

    it('selectPopularNetwork handles enableNetwork errors gracefully', async () => {
      // Mock enableNetwork to throw an error
      mockEnableNetwork.mockRejectedValueOnce(new Error('Network error'));

      const solanaMainnet =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      // Should throw error since enableNetwork throws
      await expect(
        result.current.selectPopularNetwork(solanaMainnet),
      ).rejects.toThrow('Network error');

      expect(mockEnableNetwork).toHaveBeenCalledWith(solanaMainnet);
    });

    it('selectPopularNetwork with EVM network calls enableNetwork', async () => {
      const evmChainId = 'eip155:1' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectPopularNetwork(evmChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(evmChainId);
    });
  });

  describe('error handling', () => {
    it('selectNetwork handles invalid chain ID gracefully', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      // Reset mocks after hook initialization
      jest.clearAllMocks();
      mockToHex.mockImplementation(() => {
        throw new Error('Invalid hex format');
      });
      mockFormatChainIdToCaip.mockImplementation(() => {
        throw new Error('Invalid CAIP format');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw when both toHex and formatChainIdToCaip fail
      result.current.selectNetwork('invalid-format' as CaipChainId);

      expect(consoleSpy).toHaveBeenCalledWith(
        'selectNetwork: Error processing chain ID:',
        expect.any(Error),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'selectNetwork: Fallback formatting failed:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('selectNetwork handles primary error but succeeds with fallback', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      // Reset mocks after hook initialization
      jest.clearAllMocks();

      // Mock primary processing to fail but fallback to succeed
      mockToHex.mockImplementationOnce(() => {
        throw new Error('Primary processing failed');
      });
      mockFormatChainIdToCaip.mockReturnValue('eip155:999' as CaipChainId);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      result.current.selectNetwork('999' as CaipChainId);

      expect(consoleSpy).toHaveBeenCalledWith(
        'selectNetwork: Error processing chain ID:',
        expect.any(Error),
      );
      expect(mockEnableNetwork).toHaveBeenCalledWith('eip155:999');

      consoleSpy.mockRestore();
    });
  });

  describe('solana network flows', () => {
    it('selectNetwork treats non-EVM networks as popular by default', () => {
      const solanaChainId =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      result.current.selectNetwork(solanaChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(solanaChainId);
    });

    it('selectPopularNetwork with Solana enables the network', async () => {
      const networksWithSolana: ProcessedNetwork[] = [
        ...mockNetworks,
        {
          id: 'solana:mainnet',
          name: 'Solana Mainnet',
          caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
          isSelected: false,
          imageSource: { uri: 'solana.png' },
        },
      ];

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: networksWithSolana }),
      );

      // Clear mocks after hook initialization to isolate the function call
      jest.clearAllMocks();

      const solanaMainnet =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

      await result.current.selectPopularNetwork(solanaMainnet);

      expect(mockEnableNetwork).toHaveBeenCalledWith(solanaMainnet);
    });
  });

  describe('different namespace scenarios', () => {
    it('handles empty namespace gracefully', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'unknown',
        enabledNetworksByNamespace: {},
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        enableAllPopularNetworks: mockEnableAllPopularNetworks,
        tryEnableEvmNetwork: jest.fn(),
        enabledNetworksForAllNamespaces: {},
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(result.current.customNetworksToReset).toEqual([]);
    });

    it('calculates currentEnabledNetworks correctly for different namespaces', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'solana',
        enabledNetworksByNamespace: {
          solana: {
            '0x1': true,
            '0x2': false,
          },
        },
        enabledNetworksForCurrentNamespace: {
          '0x1': true,
          '0x2': false,
        },
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        enableAllPopularNetworks: mockEnableAllPopularNetworks,
        tryEnableEvmNetwork: jest.fn(),
        enabledNetworksForAllNamespaces: {
          '0x1': true,
          '0x2': false,
        },
      });

      renderHook(() => useNetworkSelection({ networks: mockNetworks }));

      // Should call formatChainIdToCaip for enabled networks
      expect(mockFormatChainIdToCaip).toHaveBeenCalledWith('0x1');
    });
  });

  describe('additional edge cases', () => {
    it('selectNetwork handles CAIP chain IDs with EIP155 namespace correctly', () => {
      const caipChainId = 'eip155:10' as CaipChainId; // Optimism (not in popular networks)

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      result.current.selectNetwork(caipChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(caipChainId);
    });

    it('selectAllPopularNetworks calls callback after completion', async () => {
      const mockCallback = jest.fn();

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectAllPopularNetworks(mockCallback);

      expect(mockEnableAllPopularNetworks).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
    });

    it('selectAllPopularNetworks works without callback', async () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await expect(
        result.current.selectAllPopularNetworks(),
      ).resolves.toBeUndefined();

      expect(mockEnableAllPopularNetworks).toHaveBeenCalled();
    });

    it('enables all popular networks', async () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectAllPopularNetworks();

      expect(mockEnableAllPopularNetworks).toHaveBeenCalled();
    });
  });

  describe('memoized values', () => {
    it('customNetworksToReset recalculates when popularNetworkConfigurations change', () => {
      // Test with different initial popular networks that don't include Mumbai
      const initialPopularNetworks = [
        {
          caipChainId: 'eip155:1' as CaipChainId,
          chainId: '0x1',
          name: 'Ethereum Mainnet',
        },
      ];

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
          return initialPopularNetworks;
        }
        if (selector === selectMultichainAccountsState2Enabled) {
          return false;
        }
        if (selector === selectInternalAccounts) {
          return [];
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      // With only Ethereum as popular, Mumbai should be custom (Polygon is disabled so not included)
      expect(result.current.customNetworksToReset).toEqual(['eip155:13881']);

      // Test that memoization works - same dependencies should return same result
      const firstResult = result.current.customNetworksToReset;
      const secondResult = result.current.customNetworksToReset;
      expect(firstResult).toBe(secondResult); // Same reference due to memoization
    });
  });

  describe('hook return values', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(result.current).toEqual({
        selectCustomNetwork: expect.any(Function),
        selectPopularNetwork: expect.any(Function),
        selectNetwork: expect.any(Function),
        deselectAll: expect.any(Function),
        customNetworksToReset: ['eip155:13881'],
        selectAllPopularNetworks: expect.any(Function),
      });
    });
  });

  describe('non-EVM network handling', () => {
    it('treats Solana networks as popular by default', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      (isCaipChainId as unknown as jest.Mock).mockReturnValue(true);
      (parseCaipChainId as jest.Mock).mockReturnValue({
        namespace: 'solana',
        reference: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });

      const solanaChainId =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;
      result.current.selectNetwork(solanaChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(solanaChainId);
      expect(mockDisableNetwork).not.toHaveBeenCalledWith(solanaChainId);
    });

    it('treats Bitcoin networks as popular by default', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      (isCaipChainId as unknown as jest.Mock).mockReturnValue(true);
      (parseCaipChainId as jest.Mock).mockReturnValue({
        namespace: 'bip122',
        reference: '000000000019d6689c085ae165831e93',
      });

      const bitcoinChainId =
        'bip122:000000000019d6689c085ae165831e93' as CaipChainId;
      result.current.selectNetwork(bitcoinChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(bitcoinChainId);
      expect(mockDisableNetwork).not.toHaveBeenCalledWith(bitcoinChainId);
    });
  });

  describe('deselectAll function', () => {
    it('disables all networks except Ethereum mainnet', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      result.current.deselectAll();

      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:137');
      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:13881');
      expect(mockDisableNetwork).not.toHaveBeenCalledWith('eip155:1');
      expect(mockDisableNetwork).toHaveBeenCalledTimes(2);
    });

    it('handles empty networks array gracefully', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: [] }),
      );

      result.current.deselectAll();

      expect(mockDisableNetwork).not.toHaveBeenCalled();
    });

    it('handles networks with only Ethereum mainnet', () => {
      const ethOnlyNetworks: ProcessedNetwork[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum Mainnet',
          caipChainId: 'eip155:1' as CaipChainId,
          isSelected: true,
          imageSource: { uri: 'ethereum.png' },
        },
      ];

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: ethOnlyNetworks }),
      );

      result.current.deselectAll();

      expect(mockDisableNetwork).not.toHaveBeenCalled();
    });

    it('preserves Ethereum mainnet among multiple networks', () => {
      const networksWithMultipleChains: ProcessedNetwork[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum Mainnet',
          caipChainId: 'eip155:1' as CaipChainId,
          isSelected: true,
          imageSource: { uri: 'ethereum.png' },
        },
        {
          id: 'solana:mainnet',
          name: 'Solana Mainnet',
          caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
          isSelected: true,
          imageSource: { uri: 'solana.png' },
        },
        {
          id: 'bip122:mainnet',
          name: 'Bitcoin Mainnet',
          caipChainId: 'bip122:000000000019d6689c085ae165831e93' as CaipChainId,
          isSelected: true,
          imageSource: { uri: 'bitcoin.png' },
        },
      ];

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: networksWithMultipleChains }),
      );

      result.current.deselectAll();

      expect(mockDisableNetwork).toHaveBeenCalledWith(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
      expect(mockDisableNetwork).toHaveBeenCalledWith(
        'bip122:000000000019d6689c085ae165831e93',
      );
      expect(mockDisableNetwork).not.toHaveBeenCalledWith('eip155:1');
    });

    it('handles networks with duplicate Ethereum mainnet entries', () => {
      const networksWithDuplicates: ProcessedNetwork[] = [
        {
          id: 'eip155:1-first',
          name: 'Ethereum Mainnet',
          caipChainId: 'eip155:1' as CaipChainId,
          isSelected: true,
          imageSource: { uri: 'ethereum.png' },
        },
        {
          id: 'eip155:1-second',
          name: 'Ethereum Mainnet Copy',
          caipChainId: 'eip155:1' as CaipChainId,
          isSelected: true,
          imageSource: { uri: 'ethereum.png' },
        },
        {
          id: 'eip155:137',
          name: 'Polygon',
          caipChainId: 'eip155:137' as CaipChainId,
          isSelected: false,
          imageSource: { uri: 'polygon.png' },
        },
      ];

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: networksWithDuplicates }),
      );

      result.current.deselectAll();

      // Should only disable non-Ethereum networks
      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:137');
      expect(mockDisableNetwork).not.toHaveBeenCalledWith('eip155:1');
      expect(mockDisableNetwork).toHaveBeenCalledTimes(1);
    });
  });

  describe('Bitcoin network handling', () => {
    const bitcoinMainnet =
      'bip122:000000000019d6689c085ae165831e93' as CaipChainId;
    const mockBitcoinAccount = {
      address: '0xbitcoinAddress',
      type: 'bip122:p2wpkh',
      scopes: [bitcoinMainnet],
    };

    beforeEach(() => {
      jest.clearAllMocks();

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
          return [
            {
              caipChainId: 'eip155:1' as CaipChainId,
              chainId: '0x1',
              name: 'Ethereum Mainnet',
            },
            {
              caipChainId: bitcoinMainnet,
              chainId: 'btc-mainnet',
              name: 'Bitcoin Mainnet',
            },
          ];
        }
        if (selector === selectNetworkConfigurationsByCaipChainId) {
          return mockNetworkConfigurations;
        }
        if (selector === selectMultichainAccountsState2Enabled) {
          return false;
        }
        if (selector === selectInternalAccounts) {
          return [mockBitcoinAccount];
        }
        return undefined;
      });

      (isCaipChainId as unknown as jest.Mock).mockReturnValue(true);
      (parseCaipChainId as jest.Mock).mockReturnValue({
        namespace: 'bip122',
        reference: '000000000019d6689c085ae165831e93',
      });
    });

    it('selectCustomNetwork creates new account when no Bitcoin account exists', async () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
          return [
            {
              caipChainId: 'eip155:1' as CaipChainId,
              chainId: '0x1',
              name: 'Ethereum Mainnet',
            },
            {
              caipChainId: bitcoinMainnet,
              chainId: 'btc-mainnet',
              name: 'Bitcoin Mainnet',
            },
          ];
        }
        if (selector === selectNetworkConfigurationsByCaipChainId) {
          return mockNetworkConfigurations;
        }
        if (selector === selectMultichainAccountsState2Enabled) {
          return false;
        }
        if (selector === selectInternalAccounts) {
          return [];
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectCustomNetwork(bitcoinMainnet);

      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        'RootModalFlow',
        {
          screen: 'AddAccount',
          params: {
            clientType: 'bitcoin',
            scope: bitcoinMainnet,
          },
        },
      );
      expect(mockEnableNetwork).not.toHaveBeenCalled();
    });

    it('selectCustomNetwork sets selected address when Bitcoin account exists', async () => {
      const setSelectedAddressSpy = jest.spyOn(Engine, 'setSelectedAddress');

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectCustomNetwork(bitcoinMainnet);

      expect(setSelectedAddressSpy).toHaveBeenCalledWith(
        mockBitcoinAccount.address,
      );
      expect(mockEnableNetwork).toHaveBeenCalledWith(bitcoinMainnet);
    });
  });

  describe('error handling and edge cases', () => {
    describe('callback error handling', () => {
      it('handles callback errors in selectCustomNetwork gracefully', async () => {
        const customChainId = 'eip155:999' as CaipChainId;
        const mockCallback = jest.fn().mockImplementation(() => {
          throw new Error('Callback error');
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        // Should not throw when callback throws
        await expect(
          result.current.selectCustomNetwork(customChainId, mockCallback),
        ).rejects.toThrow('Callback error');

        expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
        expect(mockCallback).toHaveBeenCalled();
      });

      it('handles callback errors in selectPopularNetwork gracefully', async () => {
        const popularChainId = 'eip155:1' as CaipChainId;
        const mockCallback = jest.fn().mockImplementation(() => {
          throw new Error('Callback error');
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        // Should not throw when callback throws
        await expect(
          result.current.selectPopularNetwork(popularChainId, mockCallback),
        ).rejects.toThrow('Callback error');

        expect(mockEnableNetwork).toHaveBeenCalledWith(popularChainId);
        expect(mockCallback).toHaveBeenCalled();
      });

      it('handles callback errors in selectAllPopularNetworks gracefully', async () => {
        const mockCallback = jest.fn().mockImplementation(() => {
          throw new Error('Callback error');
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        // Should not throw when callback throws
        await expect(
          result.current.selectAllPopularNetworks(mockCallback),
        ).rejects.toThrow('Callback error');

        expect(mockEnableAllPopularNetworks).toHaveBeenCalled();
        expect(mockCallback).toHaveBeenCalled();
      });
    });

    describe('Engine.setSelectedAddress error handling', () => {
      it('handles Engine.setSelectedAddress errors in Bitcoin network selection', async () => {
        const bitcoinMainnet =
          'bip122:000000000019d6689c085ae165831e93' as CaipChainId;
        const mockBitcoinAccount = {
          address: '0xbitcoinAddress',
          type: 'bip122:p2wpkh',
          scopes: [bitcoinMainnet],
        };

        mockUseSelector.mockImplementation((selector) => {
          if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
            return [
              {
                caipChainId: bitcoinMainnet,
                chainId: 'btc-mainnet',
                name: 'Bitcoin Mainnet',
              },
            ];
          }
          if (selector === selectInternalAccounts) {
            return [mockBitcoinAccount];
          }
          return false;
        });

        // Mock Engine.setSelectedAddress to throw
        const setSelectedAddressSpy = jest
          .spyOn(Engine, 'setSelectedAddress')
          .mockImplementation(() => {
            throw new Error('Failed to set address');
          });

        (isCaipChainId as unknown as jest.Mock).mockReturnValue(true);
        (parseCaipChainId as jest.Mock).mockReturnValue({
          namespace: 'bip122',
          reference: '000000000019d6689c085ae165831e93',
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        // Should throw when Engine.setSelectedAddress fails
        await expect(
          result.current.selectCustomNetwork(bitcoinMainnet),
        ).rejects.toThrow('Failed to set address');

        expect(setSelectedAddressSpy).toHaveBeenCalledWith(
          mockBitcoinAccount.address,
        );
        // enableNetwork should not be called if setSelectedAddress fails
        expect(mockEnableNetwork).not.toHaveBeenCalled();

        setSelectedAddressSpy.mockRestore();
      });
    });

    describe('network enablement failures', () => {
      it('handles enableNetwork failures in selectCustomNetwork', async () => {
        const customChainId = 'eip155:999' as CaipChainId;
        mockEnableNetwork.mockRejectedValue(new Error('Network enable failed'));

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        await expect(
          result.current.selectCustomNetwork(customChainId),
        ).rejects.toThrow('Network enable failed');

        expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
      });

      it('handles enableNetwork failures in selectPopularNetwork', async () => {
        const popularChainId = 'eip155:1' as CaipChainId;
        mockEnableNetwork.mockRejectedValue(new Error('Network enable failed'));

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        await expect(
          result.current.selectPopularNetwork(popularChainId),
        ).rejects.toThrow('Network enable failed');

        expect(mockEnableNetwork).toHaveBeenCalledWith(popularChainId);
      });

      it('handles enableAllPopularNetworks failures', async () => {
        mockEnableAllPopularNetworks.mockRejectedValue(
          new Error('Enable all failed'),
        );

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        await expect(result.current.selectAllPopularNetworks()).rejects.toThrow(
          'Enable all failed',
        );

        expect(mockEnableAllPopularNetworks).toHaveBeenCalled();
      });
    });
  });

  describe('network state edge cases', () => {
    it('handles networks with malformed caipChainId gracefully', () => {
      const malformedNetworks: ProcessedNetwork[] = [
        {
          id: 'malformed',
          name: 'Malformed Network',
          caipChainId: 'invalid-format' as CaipChainId,
          isSelected: false,
          imageSource: { uri: 'malformed.png' },
        },
      ];

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: malformedNetworks }),
      );

      // Should not throw when initializing with malformed networks
      expect(result.current.customNetworksToReset).toBeDefined();
      expect(Array.isArray(result.current.customNetworksToReset)).toBe(true);
    });

    it('handles empty enabled networks state', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {},
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        enableAllPopularNetworks: mockEnableAllPopularNetworks,
        tryEnableEvmNetwork: jest.fn(),
        enabledNetworksForAllNamespaces: {},
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(result.current.customNetworksToReset).toEqual([]);
    });

    it('handles undefined enabled networks for namespace', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: undefined,
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['enabledNetworksByNamespace'],
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        enableAllPopularNetworks: mockEnableAllPopularNetworks,
        tryEnableEvmNetwork: jest.fn(),
        enabledNetworksForAllNamespaces: {},
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(result.current.customNetworksToReset).toEqual([]);
    });

    it('handles networks with undefined imageSource', () => {
      const networksWithUndefinedImages: ProcessedNetwork[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum Mainnet',
          caipChainId: 'eip155:1' as CaipChainId,
          isSelected: true,
          imageSource: undefined as unknown as ImageSourcePropType,
        },
      ];

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: networksWithUndefinedImages }),
      );

      // Should not throw when networks have undefined imageSource
      expect(typeof result.current.selectNetwork).toBe('function');
      expect(typeof result.current.deselectAll).toBe('function');
    });
  });

  describe('concurrent operations', () => {
    it('handles multiple concurrent selectNetwork calls', async () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      const chainId1 = 'eip155:1' as CaipChainId;
      const chainId2 = 'eip155:137' as CaipChainId;

      // Simulate concurrent calls
      const promise1 = result.current.selectPopularNetwork(chainId1);
      const promise2 = result.current.selectPopularNetwork(chainId2);

      await Promise.all([promise1, promise2]);

      expect(mockEnableNetwork).toHaveBeenCalledWith(chainId1);
      expect(mockEnableNetwork).toHaveBeenCalledWith(chainId2);
      expect(mockEnableNetwork).toHaveBeenCalledTimes(2);
    });

    it('handles mixed network type selection concurrently', async () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      const popularChainId = 'eip155:1' as CaipChainId;
      const customChainId = 'eip155:999' as CaipChainId;

      // Simulate concurrent calls of different types
      const promise1 = result.current.selectPopularNetwork(popularChainId);
      const promise2 = result.current.selectCustomNetwork(customChainId);

      await Promise.all([promise1, promise2]);

      expect(mockEnableNetwork).toHaveBeenCalledWith(popularChainId);
      expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
      expect(mockEnableNetwork).toHaveBeenCalledTimes(2);
    });

    it('handles concurrent selectAllPopularNetworks calls', async () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      // Simulate concurrent calls
      const promise1 = result.current.selectAllPopularNetworks();
      const promise2 = result.current.selectAllPopularNetworks();

      await Promise.all([promise1, promise2]);

      expect(mockEnableAllPopularNetworks).toHaveBeenCalledTimes(2);
    });
  });

  describe('additional input validation and edge cases', () => {
    describe('selectNetwork input handling', () => {
      it('handles empty string input gracefully', () => {
        jest.clearAllMocks();

        // Mock isCaipChainId to return false for empty string, then formatChainIdToCaip to fail
        (isCaipChainId as unknown as jest.Mock).mockImplementation(
          (value) => value !== '',
        );

        mockFormatChainIdToCaip.mockImplementation((value) => {
          if (value === '') {
            throw new Error('Invalid CAIP format');
          }
          return `eip155:${value}` as CaipChainId;
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        // Empty string should trigger error handling
        result.current.selectNetwork('' as CaipChainId);

        // Should have attempted error handling
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('handles null input gracefully', () => {
        jest.clearAllMocks();

        // Mock isCaipChainId to return false for null, then formatChainIdToCaip to fail
        (isCaipChainId as unknown as jest.Mock).mockImplementation(
          (value) => value !== 'null', // String(null) = 'null'
        );

        mockFormatChainIdToCaip.mockImplementation((value) => {
          if (value === null) {
            throw new Error('Invalid CAIP format');
          }
          return `eip155:${value}` as CaipChainId;
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        // Null should trigger error handling
        result.current.selectNetwork(null as never);

        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('handles undefined input gracefully', () => {
        jest.clearAllMocks();

        // Mock isCaipChainId to return false for undefined, then formatChainIdToCaip to fail
        (isCaipChainId as unknown as jest.Mock).mockImplementation(
          (value) => value !== 'undefined', // String(undefined) = 'undefined'
        );

        mockFormatChainIdToCaip.mockImplementation((value) => {
          if (value === undefined) {
            throw new Error('Invalid CAIP format');
          }
          return `eip155:${value}` as CaipChainId;
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        // Undefined should trigger error handling
        result.current.selectNetwork(undefined as never);

        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('handles very large hex numbers', () => {
        jest.clearAllMocks();

        const largeHex = '0xffffffffffffffffffffffffffffffff' as Hex;

        // Set up fresh mock implementation for this test
        (isCaipChainId as unknown as jest.Mock).mockReturnValue(false);
        mockFormatChainIdToCaip.mockImplementation((value) => {
          if (value === largeHex) {
            return 'eip155:ffffffffffffffffffffffffffffffff' as CaipChainId;
          }
          return `eip155:${value}` as CaipChainId;
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        result.current.selectNetwork(largeHex);

        expect(mockFormatChainIdToCaip).toHaveBeenCalledWith(largeHex);
        expect(mockEnableNetwork).toHaveBeenCalledWith(
          'eip155:ffffffffffffffffffffffffffffffff',
        );
      });

      it('handles CAIP chain IDs with special characters in reference', () => {
        const specialChainId = 'eip155:mainnet-fork_123' as CaipChainId;
        (isCaipChainId as unknown as jest.Mock).mockReturnValue(true);
        (parseCaipChainId as jest.Mock).mockReturnValue({
          namespace: 'eip155',
          reference: 'mainnet-fork_123',
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        result.current.selectNetwork(specialChainId);

        expect(mockEnableNetwork).toHaveBeenCalledWith(specialChainId);
      });
    });

    describe('popular network detection edge cases', () => {
      it('handles case sensitivity in CAIP chain ID namespace', () => {
        const chainId = 'EIP155:1' as CaipChainId; // Uppercase namespace
        (isCaipChainId as unknown as jest.Mock).mockReturnValue(true);
        (parseCaipChainId as jest.Mock).mockReturnValue({
          namespace: 'EIP155', // Uppercase
          reference: '1',
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        result.current.selectNetwork(chainId);

        expect(mockEnableNetwork).toHaveBeenCalledWith(chainId);
      });

      it('treats unknown namespace as popular network', () => {
        const unknownNamespaceChainId = 'cosmos:cosmoshub-4' as CaipChainId;
        (isCaipChainId as unknown as jest.Mock).mockReturnValue(true);
        (parseCaipChainId as jest.Mock).mockReturnValue({
          namespace: 'cosmos',
          reference: 'cosmoshub-4',
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        result.current.selectNetwork(unknownNamespaceChainId);

        expect(mockEnableNetwork).toHaveBeenCalledWith(unknownNamespaceChainId);
      });
    });

    describe('memoization and performance', () => {
      it('memoizes popularNetworkChainIds correctly', () => {
        const { result, rerender } = renderHook(
          (props) => useNetworkSelection(props),
          {
            initialProps: { networks: mockNetworks },
          },
        );

        const firstCall = result.current.customNetworksToReset;

        // Rerender with same props should return same memoized result
        rerender({ networks: mockNetworks });

        const secondCall = result.current.customNetworksToReset;
        expect(firstCall).toBe(secondCall); // Same reference due to memoization
      });

      it('recalculates when popularNetworkConfigurations change', () => {
        const { result, rerender } = renderHook(
          (props) => useNetworkSelection(props),
          {
            initialProps: { networks: mockNetworks },
          },
        );

        const firstResult = result.current.customNetworksToReset;

        // Change popular network configurations
        const newPopularConfigs = [
          ...mockPopularNetworkConfigurations,
          {
            caipChainId: 'eip155:13881' as CaipChainId,
            chainId: '0x13881',
            name: 'Mumbai Testnet',
          },
        ];

        mockUseSelector.mockImplementation((selector) => {
          if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
            return newPopularConfigs;
          }
          if (selector === selectMultichainAccountsState2Enabled) {
            return false;
          }
          if (selector === selectInternalAccounts) {
            return [];
          }
          return undefined;
        });

        rerender({ networks: mockNetworks });

        const secondResult = result.current.customNetworksToReset;
        expect(firstResult).not.toBe(secondResult); // Different reference due to dependency change
      });
    });

    describe('NavigationService integration', () => {
      it('handles NavigationService navigation failures gracefully', async () => {
        const bitcoinMainnet =
          'bip122:000000000019d6689c085ae165831e93' as CaipChainId;

        // Mock no Bitcoin account exists
        mockUseSelector.mockImplementation((selector) => {
          if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
            return [
              {
                caipChainId: bitcoinMainnet,
                chainId: 'btc-mainnet',
                name: 'Bitcoin Mainnet',
              },
            ];
          }
          if (selector === selectMultichainAccountsState2Enabled) {
            return false;
          }
          if (selector === selectInternalAccounts) {
            return []; // No Bitcoin accounts
          }
          return undefined;
        });

        // Mock NavigationService to throw
        const mockNavigate = jest.fn().mockImplementation(() => {
          throw new Error('Navigation failed');
        });
        (NavigationService.navigation.navigate as jest.Mock) = mockNavigate;

        (isCaipChainId as unknown as jest.Mock).mockReturnValue(true);
        (parseCaipChainId as jest.Mock).mockReturnValue({
          namespace: 'bip122',
          reference: '000000000019d6689c085ae165831e93',
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        // Should throw when navigation fails
        await expect(
          result.current.selectCustomNetwork(bitcoinMainnet),
        ).rejects.toThrow('Navigation failed');

        expect(mockNavigate).toHaveBeenCalled();
        expect(mockEnableNetwork).not.toHaveBeenCalled();
      });
    });

    describe('type safety and boundary conditions', () => {
      it('handles maximum safe integer in chain ID', () => {
        jest.clearAllMocks();

        const maxSafeInt = Number.MAX_SAFE_INTEGER;
        const maxSafeIntHex = `0x${maxSafeInt.toString(16)}` as Hex;

        // Set up fresh mock implementation for this test
        (isCaipChainId as unknown as jest.Mock).mockReturnValue(false);
        mockFormatChainIdToCaip.mockImplementation((value) => {
          if (value === maxSafeIntHex) {
            return `eip155:${maxSafeInt.toString(16)}` as CaipChainId;
          }
          return `eip155:${value}` as CaipChainId;
        });

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mockNetworks }),
        );

        result.current.selectNetwork(maxSafeIntHex);

        expect(mockFormatChainIdToCaip).toHaveBeenCalledWith(maxSafeIntHex);
        expect(mockEnableNetwork).toHaveBeenCalled();
      });

      it('handles networks array with mixed valid and invalid entries', () => {
        const mixedNetworks: ProcessedNetwork[] = [
          {
            id: 'valid-1',
            name: 'Valid Network',
            caipChainId: 'eip155:1' as CaipChainId,
            isSelected: true,
            imageSource: { uri: 'valid.png' },
          },
          {
            id: '',
            name: '',
            caipChainId: '' as CaipChainId,
            isSelected: false,
            imageSource: { uri: '' },
          },
          {
            id: 'valid-2',
            name: 'Another Valid Network',
            caipChainId: 'eip155:137' as CaipChainId,
            isSelected: true,
            imageSource: { uri: 'valid2.png' },
          },
        ];

        const { result } = renderHook(() =>
          useNetworkSelection({ networks: mixedNetworks }),
        );

        // Should handle mixed array gracefully
        expect(result.current.customNetworksToReset).toBeDefined();
        expect(Array.isArray(result.current.customNetworksToReset)).toBe(true);

        // Should still allow operations on valid entries
        result.current.deselectAll();
        expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:137');
      });
    });
  });
});
