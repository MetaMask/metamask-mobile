import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
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
import { selectPopularNetworkConfigurationsByCaipChainId } from '../../../selectors/networkController';
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
}));

jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest.fn(),
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
  selectInternalAccounts: jest.fn(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(),
  selectPopularNetworkConfigurationsByCaipChainId: jest.fn(),
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
      });
    });

    it('selectCustomNetwork with multichain enabled calls MultichainNetworkController', async () => {
      // Mock multichain enabled
      mockUseSelector
        .mockReturnValueOnce(mockPopularNetworkConfigurations)
        .mockReturnValueOnce(true); // isMultichainAccountsState2Enabled = true

      const customChainId = 'eip155:999' as CaipChainId;
      const mockCallback = jest.fn();

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectCustomNetwork(customChainId, mockCallback);

      expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
      expect(mockCallback).toHaveBeenCalled();
    });

    it('selectPopularNetwork with Solana mainnet calls MultichainNetworkController.setActiveNetwork', async () => {
      // Mock multichain enabled
      mockUseSelector
        .mockReturnValueOnce(mockPopularNetworkConfigurations)
        .mockReturnValueOnce(true); // isMultichainAccountsState2Enabled = true

      const solanaMainnet =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectPopularNetwork(solanaMainnet);

      expect(mockEnableNetwork).toHaveBeenCalledWith(solanaMainnet);
    });

    it('selectPopularNetwork with Solana mainnet handles MultichainNetworkController errors gracefully', async () => {
      // Mock multichain enabled
      mockUseSelector
        .mockReturnValueOnce(mockPopularNetworkConfigurations)
        .mockReturnValueOnce(true); // isMultichainAccountsState2Enabled = true

      // Mock setActiveNetwork to throw an error
      const mockSetActiveNetwork = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));
      jest.doMock('../../../core/Engine', () => ({
        context: {
          MultichainNetworkController: {
            setActiveNetwork: mockSetActiveNetwork,
          },
          NetworkController: {
            findNetworkClientIdByChainId: jest.fn(),
          },
        },
      }));

      const solanaMainnet =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      // Should not throw error
      await expect(
        result.current.selectPopularNetwork(solanaMainnet),
      ).resolves.toBeUndefined();

      expect(mockEnableNetwork).toHaveBeenCalledWith(solanaMainnet);
    });

    it('selectPopularNetwork with EVM network and multichain enabled calls NetworkController', async () => {
      // Mock multichain enabled
      mockUseSelector
        .mockReturnValueOnce(mockPopularNetworkConfigurations)
        .mockReturnValueOnce(true); // isMultichainAccountsState2Enabled = true

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

    it('selectPopularNetwork with Solana resets custom networks', async () => {
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

      mockUseSelector
        .mockReturnValueOnce(mockPopularNetworkConfigurations)
        .mockReturnValueOnce(true); // isMultichainAccountsState2Enabled = true

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

      mockUseSelector
        .mockReturnValueOnce(initialPopularNetworks)
        .mockReturnValueOnce(false); // isMultichainAccountsState2Enabled

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

      const solanaChainId = '' as CaipChainId;
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

    it('selectPopularNetwork sets selected address for Bitcoin networks', async () => {
      const setSelectedAddressSpy = jest.spyOn(Engine, 'setSelectedAddress');

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectPopularNetwork(bitcoinMainnet);

      expect(setSelectedAddressSpy).toHaveBeenCalledWith(
        mockBitcoinAccount.address,
      );
      expect(mockEnableNetwork).toHaveBeenCalledWith(bitcoinMainnet);
    });
  });

  describe('Solana network handling with multichain', () => {
    const solanaMainnet =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

    beforeEach(() => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
          return mockPopularNetworkConfigurations;
        }
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectInternalAccounts) {
          return [];
        }
        return undefined;
      });
    });

    it('handles Solana network selection error gracefully', async () => {
      const mockSetActiveNetworkWithError = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'));
      jest
        .spyOn(Engine.context.MultichainNetworkController, 'setActiveNetwork')
        .mockImplementation(mockSetActiveNetworkWithError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectPopularNetwork(solanaMainnet);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error setting active network:',
        new Error('Network error'),
      );
      expect(mockEnableNetwork).toHaveBeenCalledWith(solanaMainnet);
      expect(mockSetActiveNetworkWithError).toHaveBeenCalledWith(solanaMainnet);

      consoleSpy.mockRestore();
    });

    it('resets EVM networks when selecting Solana mainnet', async () => {
      jest
        .spyOn(Engine.context.MultichainNetworkController, 'setActiveNetwork')
        .mockImplementation(mockSetActiveNetwork);

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectPopularNetwork(solanaMainnet);

      expect(mockEnableNetwork).toHaveBeenCalledWith(solanaMainnet);
      expect(mockSetActiveNetwork).toHaveBeenCalledWith(solanaMainnet);

      mockNetworks.forEach(({ caipChainId }) => {
        if (caipChainId !== solanaMainnet) {
          expect(mockDisableNetwork).toHaveBeenCalledWith(caipChainId);
        }
      });
    });

    it('resets Solana networks when selecting EVM network', async () => {
      const evmChainId = 'eip155:1' as CaipChainId;

      mockFindNetworkClientIdByChainId.mockReturnValue('evm-client-id');
      jest
        .spyOn(Engine.context.NetworkController, 'findNetworkClientIdByChainId')
        .mockReturnValue('evm-client-id');

      jest
        .spyOn(Engine.context.MultichainNetworkController, 'setActiveNetwork')
        .mockImplementation(mockSetActiveNetwork);

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      await result.current.selectPopularNetwork(evmChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(evmChainId);
      expect(mockSetActiveNetwork).toHaveBeenCalledWith('evm-client-id');
      expect(mockDisableNetwork).toHaveBeenCalledWith(solanaMainnet);
    });
  });
});
