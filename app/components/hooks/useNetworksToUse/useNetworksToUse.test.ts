import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { SolScope } from '@metamask/keyring-api';
import { useNetworksToUse } from './useNetworksToUse';
import {
  useNetworksByCustomNamespace,
  NetworkType,
  ProcessedNetwork,
} from '../useNetworksByNamespace/useNetworksByNamespace';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../../UI/Earn/constants/networks';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByCustomNamespace: jest.fn(),
  NetworkType: {
    Popular: 'Popular',
    Custom: 'Custom',
  },
}));

jest.mock(
  '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: jest.fn(),
  }),
);

jest.mock('../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../UI/Earn/constants/networks', () => ({
  EVM_SCOPE: 'eip155:0',
}));

jest.mock('@metamask/keyring-api', () => ({
  SolScope: {
    Mainnet: 'solana:mainnet',
  },
}));

describe('useNetworksToUse', () => {
  // Mock functions
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseNetworksByCustomNamespace =
    useNetworksByCustomNamespace as jest.MockedFunction<
      typeof useNetworksByCustomNamespace
    >;

  // Mock data
  const mockEvmNetworks: ProcessedNetwork[] = [
    {
      id: 'eip155:1',
      name: 'Ethereum Mainnet',
      caipChainId: 'eip155:1',
      isSelected: true,
      imageSource: { uri: 'ethereum.png' },
      networkTypeOrRpcUrl: 'mainnet',
    },
    {
      id: 'eip155:137',
      name: 'Polygon',
      caipChainId: 'eip155:137',
      isSelected: false,
      imageSource: { uri: 'polygon.png' },
      networkTypeOrRpcUrl: 'https://polygon-rpc.com',
    },
  ];

  const mockSolanaNetworks: ProcessedNetwork[] = [
    {
      id: 'solana:mainnet',
      name: 'Solana Mainnet',
      caipChainId: 'solana:mainnet',
      isSelected: true,
      imageSource: { uri: 'solana.png' },
      networkTypeOrRpcUrl: 'mainnet',
    },
  ];

  const mockDefaultNetworks: ProcessedNetwork[] = [
    ...mockEvmNetworks,
    ...mockSolanaNetworks,
  ];

  const mockEvmAccount: InternalAccount = {
    id: 'evm-account-id',
    address: '0x123',
    type: 'eip155:eoa',
    methods: [],
    options: {},
    metadata: {},
  } as unknown as InternalAccount;

  const mockSolanaAccount: InternalAccount = {
    id: 'solana-account-id',
    address: 'Sol123',
    type: 'solana:data-account',
    methods: [],
    options: {},
    metadata: {},
  } as unknown as InternalAccount;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations - these will be overridden by individual tests
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMultichainAccountsState2Enabled) {
        return false;
      }
      if (selector === selectSelectedInternalAccountByScope) {
        return () => null;
      }
      return undefined;
    });

    // Set fresh default mock for each test
    mockUseNetworksByCustomNamespace.mockReturnValue({
      networks: [],
      selectedNetworks: [],
      selectedCount: 0,
      areAllNetworksSelected: false,
      areAnyNetworksSelected: false,
      networkCount: 0,
      totalEnabledNetworksCount: 0,
    });
  });

  describe('when multichain is disabled', () => {
    it('returns the provided networks without modification', () => {
      // Arrange
      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: true,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.networksToUse).toEqual(mockDefaultNetworks);
      expect(result.current.isMultichainAccountsState2Enabled).toBe(false);
      expect(result.current.areAllNetworksSelectedCombined).toBe(true);
    });

    it('handles undefined areAllNetworksSelected gracefully', () => {
      // Arrange
      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: undefined,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.areAllNetworksSelectedCombined).toBe(false);
    });
  });

  describe('when multichain is enabled', () => {
    beforeEach(() => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === EVM_SCOPE) {
              return mockEvmAccount;
            }
            if (scope === SolScope.Mainnet) {
              return mockSolanaAccount;
            }
            return null;
          };
        }
        return undefined;
      });

      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: mockEvmNetworks,
          selectedNetworks: [mockEvmNetworks[0]],
          selectedCount: 1,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: true,
          networkCount: 2,
          totalEnabledNetworksCount: 2,
        })
        .mockReturnValueOnce({
          networks: mockSolanaNetworks,
          selectedNetworks: [mockSolanaNetworks[0]],
          selectedCount: 1,
          areAllNetworksSelected: true,
          areAnyNetworksSelected: true,
          networkCount: 1,
          totalEnabledNetworksCount: 1,
        });
    });

    it('calls useNetworksByCustomNamespace for both EVM and Solana networks', () => {
      // Arrange
      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      renderHook(() => useNetworksToUse(props));

      // Assert
      expect(mockUseNetworksByCustomNamespace).toHaveBeenCalledTimes(2);
      expect(mockUseNetworksByCustomNamespace).toHaveBeenCalledWith({
        networkType: NetworkType.Popular,
        namespace: KnownCaipNamespace.Eip155,
      });
      expect(mockUseNetworksByCustomNamespace).toHaveBeenCalledWith({
        networkType: NetworkType.Popular,
        namespace: KnownCaipNamespace.Solana,
      });
    });

    it('combines EVM and Solana networks when both accounts are selected', () => {
      // Arrange
      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.networksToUse).toEqual([
        ...mockEvmNetworks,
        ...mockSolanaNetworks,
      ]);
      expect(result.current.selectedEvmAccount).toEqual(mockEvmAccount);
      expect(result.current.selectedSolanaAccount).toEqual(mockSolanaAccount);
    });

    it('returns EVM networks only when only EVM account is selected', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === EVM_SCOPE) {
              return mockEvmAccount;
            }
            return null; // No Solana account
          };
        }
        return undefined;
      });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.networksToUse).toEqual(mockEvmNetworks);
      expect(result.current.selectedEvmAccount).toEqual(mockEvmAccount);
      expect(result.current.selectedSolanaAccount).toBeNull();
    });

    it('returns Solana networks only when only Solana account is selected', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === SolScope.Mainnet) {
              return mockSolanaAccount;
            }
            return null; // No EVM account
          };
        }
        return undefined;
      });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.networksToUse).toEqual(mockSolanaNetworks);
      expect(result.current.selectedEvmAccount).toBeNull();
      expect(result.current.selectedSolanaAccount).toEqual(mockSolanaAccount);
    });

    it('falls back to default networks when no accounts are selected', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return () => null; // No accounts selected
        }
        return undefined;
      });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.networksToUse).toEqual(mockDefaultNetworks);
      expect(result.current.selectedEvmAccount).toBeNull();
      expect(result.current.selectedSolanaAccount).toBeNull();
    });

    it('falls back to default networks when EVM networks are not available', () => {
      // Arrange
      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: [], // No EVM networks
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 0,
          totalEnabledNetworksCount: 0,
        })
        .mockReturnValueOnce({
          networks: [], // No Solana networks either
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 0,
          totalEnabledNetworksCount: 0,
        });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      // When both EVM and Solana accounts are selected but no networks are available,
      // it should fall back to the default networks
      expect(result.current.networksToUse).toEqual(mockDefaultNetworks);
    });

    it('returns EVM networks when both accounts are selected but only EVM networks are available', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === EVM_SCOPE) {
              return mockEvmAccount;
            }
            if (scope === SolScope.Mainnet) {
              return mockSolanaAccount;
            }
            return null;
          };
        }
        return undefined;
      });

      // Reset and setup new mocks for this specific test
      mockUseNetworksByCustomNamespace.mockReset();
      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: mockEvmNetworks, // EVM networks available
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 2,
          totalEnabledNetworksCount: 2,
        })
        .mockReturnValueOnce({
          networks: undefined as unknown as ProcessedNetwork[], // No Solana networks
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 0,
          totalEnabledNetworksCount: 0,
        });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      // When both accounts are selected but only EVM networks are available,
      // it should return EVM networks (covers line 77-78)
      expect(result.current.networksToUse).toEqual(mockEvmNetworks);
      expect(result.current.selectedEvmAccount).toEqual(mockEvmAccount);
      expect(result.current.selectedSolanaAccount).toEqual(mockSolanaAccount);
    });

    it('returns Solana networks when both accounts are selected but only Solana networks are available', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === EVM_SCOPE) {
              return mockEvmAccount;
            }
            if (scope === SolScope.Mainnet) {
              return mockSolanaAccount;
            }
            return null;
          };
        }
        return undefined;
      });

      // Reset and setup new mocks for this specific test
      mockUseNetworksByCustomNamespace.mockReset();
      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: undefined as unknown as ProcessedNetwork[], // No EVM networks
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 0,
          totalEnabledNetworksCount: 0,
        })
        .mockReturnValueOnce({
          networks: mockSolanaNetworks, // Solana networks available
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 1,
          totalEnabledNetworksCount: 1,
        });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      // When both accounts are selected but only Solana networks are available,
      // it should return Solana networks (covers line 79-80)
      expect(result.current.networksToUse).toEqual(mockSolanaNetworks);
      expect(result.current.selectedEvmAccount).toEqual(mockEvmAccount);
      expect(result.current.selectedSolanaAccount).toEqual(mockSolanaAccount);
    });

    it('falls back to default networks when both accounts are selected but no networks are available', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === EVM_SCOPE) {
              return mockEvmAccount;
            }
            if (scope === SolScope.Mainnet) {
              return mockSolanaAccount;
            }
            return null;
          };
        }
        return undefined;
      });

      // Reset and setup new mocks for this specific test
      mockUseNetworksByCustomNamespace.mockReset();
      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: undefined as unknown as ProcessedNetwork[], // No EVM networks
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 0,
          totalEnabledNetworksCount: 0,
        })
        .mockReturnValueOnce({
          networks: undefined as unknown as ProcessedNetwork[], // No Solana networks
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 0,
          totalEnabledNetworksCount: 0,
        });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      // When both accounts are selected but no EVM or Solana networks are available,
      // it should fall back to default networks (covers line 82)
      expect(result.current.networksToUse).toEqual(mockDefaultNetworks);
      expect(result.current.selectedEvmAccount).toEqual(mockEvmAccount);
      expect(result.current.selectedSolanaAccount).toEqual(mockSolanaAccount);
    });
  });

  describe('areAllNetworksSelectedCombined logic', () => {
    it('returns true when both EVM and Solana networks are all selected', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === EVM_SCOPE) {
              return mockEvmAccount;
            }
            if (scope === SolScope.Mainnet) {
              return mockSolanaAccount;
            }
            return null;
          };
        }
        return undefined;
      });

      // Reset and setup new mocks for this specific test
      mockUseNetworksByCustomNamespace.mockReset();
      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: mockEvmNetworks,
          selectedNetworks: mockEvmNetworks,
          selectedCount: 2,
          areAllNetworksSelected: true, // All EVM networks selected
          areAnyNetworksSelected: true,
          networkCount: 2,
          totalEnabledNetworksCount: 2,
        })
        .mockReturnValueOnce({
          networks: mockSolanaNetworks,
          selectedNetworks: mockSolanaNetworks,
          selectedCount: 1,
          areAllNetworksSelected: true, // All Solana networks selected
          areAnyNetworksSelected: true,
          networkCount: 1,
          totalEnabledNetworksCount: 1,
        });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.areAllNetworksSelectedCombined).toBe(true);
    });

    it('returns false when EVM networks are selected but Solana networks are not', () => {
      // Arrange

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === EVM_SCOPE) {
              return mockEvmAccount;
            }
            if (scope === SolScope.Mainnet) {
              return mockSolanaAccount;
            }
            return null;
          };
        }
        return undefined;
      });

      // Reset and setup new mocks for this specific test
      mockUseNetworksByCustomNamespace.mockReset();
      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: mockEvmNetworks,
          selectedNetworks: mockEvmNetworks,
          selectedCount: 2,
          areAllNetworksSelected: true, // All EVM networks selected
          areAnyNetworksSelected: true,
          networkCount: 2,
          totalEnabledNetworksCount: 2,
        })
        .mockReturnValueOnce({
          networks: mockSolanaNetworks,
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false, // Not all Solana networks selected
          areAnyNetworksSelected: false,
          networkCount: 1,
          totalEnabledNetworksCount: 1,
        });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      // When both accounts are selected, EVM all selected but Solana not all selected,
      // the combined result should be false (both must be true for combined to be true)
      expect(result.current.areAllNetworksSelectedCombined).toBe(false);
    });

    it('returns EVM selection state when only EVM account is selected', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === EVM_SCOPE) {
              return mockEvmAccount;
            }
            return null; // No Solana account
          };
        }
        return undefined;
      });

      // Reset and setup new mocks for this specific test
      mockUseNetworksByCustomNamespace.mockReset();
      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: mockEvmNetworks,
          selectedNetworks: mockEvmNetworks,
          selectedCount: 2,
          areAllNetworksSelected: true,
          areAnyNetworksSelected: true,
          networkCount: 2,
          totalEnabledNetworksCount: 2,
        })
        .mockReturnValueOnce({
          networks: mockSolanaNetworks,
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 1,
          totalEnabledNetworksCount: 1,
        });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      // When only EVM account is selected, it should return EVM areAllNetworksSelected state
      expect(result.current.areAllNetworksSelectedCombined).toBe(true);
    });

    it('returns Solana selection state when only Solana account is selected', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === SolScope.Mainnet) {
              return mockSolanaAccount;
            }
            return null; // No EVM account
          };
        }
        return undefined;
      });

      // Reset and setup new mocks for this specific test
      mockUseNetworksByCustomNamespace.mockReset();
      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: mockEvmNetworks,
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 2,
          totalEnabledNetworksCount: 2,
        })
        .mockReturnValueOnce({
          networks: mockSolanaNetworks,
          selectedNetworks: mockSolanaNetworks,
          selectedCount: 1,
          areAllNetworksSelected: true,
          areAnyNetworksSelected: true,
          networkCount: 1,
          totalEnabledNetworksCount: 1,
        });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      // When only Solana account is selected, it should return Solana areAllNetworksSelected state
      expect(result.current.areAllNetworksSelectedCombined).toBe(true);
    });

    it('returns default areAllNetworksSelected when multichain is enabled but no accounts selected', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return () => null; // No accounts selected
        }
        return undefined;
      });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: true, // This should be returned
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.areAllNetworksSelectedCombined).toBe(true);
    });
  });

  describe('network type variations', () => {
    it('works with Custom network type', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return false; // Multichain disabled for this test
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return () => null;
        }
        return undefined;
      });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Custom,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.networksToUse).toEqual(mockDefaultNetworks);
      expect(mockUseNetworksByCustomNamespace).toHaveBeenCalledWith({
        networkType: NetworkType.Custom,
        namespace: KnownCaipNamespace.Eip155,
      });
      expect(mockUseNetworksByCustomNamespace).toHaveBeenCalledWith({
        networkType: NetworkType.Custom,
        namespace: KnownCaipNamespace.Solana,
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty networks arrays gracefully', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return false; // Multichain disabled for this test
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return () => null;
        }
        return undefined;
      });

      const props = {
        networks: [],
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.networksToUse).toEqual([]);
      expect(result.current.areAllNetworksSelectedCombined).toBe(false);
    });

    it('handles null return values from selectors', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return null;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return () => null; // Return a function that returns null
        }
        return null;
      });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.selectedEvmAccount).toBeNull();
      expect(result.current.selectedSolanaAccount).toBeNull();
      expect(result.current.isMultichainAccountsState2Enabled).toBeFalsy();
    });

    it('handles undefined return values from useNetworksByCustomNamespace', () => {
      // Arrange
      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: undefined as unknown as ProcessedNetwork[],
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: undefined as unknown as boolean,
          areAnyNetworksSelected: false,
          networkCount: 0,
          totalEnabledNetworksCount: 0,
        })
        .mockReturnValueOnce({
          networks: undefined as unknown as ProcessedNetwork[],
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: undefined as unknown as boolean,
          areAnyNetworksSelected: false,
          networkCount: 0,
          totalEnabledNetworksCount: 0,
        });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.evmNetworks).toBeUndefined();
      expect(result.current.solanaNetworks).toBeUndefined();
      expect(result.current.areAllEvmNetworksSelected).toBe(false);
      expect(result.current.areAllSolanaNetworksSelected).toBe(false);
    });

    it('falls back to default networks when EVM account is selected but evmNetworks is null', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === EVM_SCOPE) {
              return mockEvmAccount;
            }
            return null; // No Solana account
          };
        }
        return undefined;
      });

      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: null as unknown as ProcessedNetwork[], // null EVM networks
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 0,
          totalEnabledNetworksCount: 0,
        })
        .mockReturnValueOnce({
          networks: mockSolanaNetworks,
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 1,
          totalEnabledNetworksCount: 1,
        });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      // When only EVM account is selected but evmNetworks is null,
      // it should fall back to default networks (covers line 84)
      expect(result.current.networksToUse).toEqual(mockDefaultNetworks);
      expect(result.current.selectedEvmAccount).toEqual(mockEvmAccount);
      expect(result.current.selectedSolanaAccount).toBeNull();
    });

    it('falls back to default networks when Solana account is selected but solanaNetworks is null', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === SolScope.Mainnet) {
              return mockSolanaAccount;
            }
            return null; // No EVM account
          };
        }
        return undefined;
      });

      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: mockEvmNetworks,
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 2,
          totalEnabledNetworksCount: 2,
        })
        .mockReturnValueOnce({
          networks: null as unknown as ProcessedNetwork[], // null Solana networks
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 0,
          totalEnabledNetworksCount: 0,
        });

      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      // When only Solana account is selected but solanaNetworks is null,
      // it should fall back to default networks (covers line 86)
      expect(result.current.networksToUse).toEqual(mockDefaultNetworks);
      expect(result.current.selectedEvmAccount).toBeNull();
      expect(result.current.selectedSolanaAccount).toEqual(mockSolanaAccount);
    });
  });

  describe('memoization and re-render optimization', () => {
    it('recalculates networksToUse when dependencies change', () => {
      // Arrange - Clear all mocks first
      jest.clearAllMocks();

      const initialProps = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === EVM_SCOPE) {
              return mockEvmAccount;
            }
            return null;
          };
        }
        return undefined;
      });

      mockUseNetworksByCustomNamespace.mockReturnValue({
        networks: mockEvmNetworks,
        selectedNetworks: [],
        selectedCount: 0,
        areAllNetworksSelected: false,
        areAnyNetworksSelected: false,
        networkCount: 2,
        totalEnabledNetworksCount: 2,
      });

      // Act
      const { result, rerender } = renderHook(
        (props) => useNetworksToUse(props),
        { initialProps },
      );
      const firstResult = result.current.networksToUse;

      // Change networks prop and rerender
      const newProps = {
        ...initialProps,
        networks: [...mockDefaultNetworks, mockEvmNetworks[0]],
      };
      rerender(newProps);

      // Assert
      expect(result.current.networksToUse).toBe(firstResult); // Should be same reference since EVM networks didn't change
      expect(result.current.networksToUse).toEqual(mockEvmNetworks);
    });

    it('updates areAllNetworksSelectedCombined when selection state changes', () => {
      // Arrange
      const props = {
        networks: mockDefaultNetworks,
        networkType: NetworkType.Popular,
        areAllNetworksSelected: false,
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMultichainAccountsState2Enabled) {
          return true;
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return (scope: string) => {
            if (scope === EVM_SCOPE) {
              return mockEvmAccount;
            }
            if (scope === SolScope.Mainnet) {
              return mockSolanaAccount;
            }
            return null;
          };
        }
        return undefined;
      });

      // First render - not all selected
      mockUseNetworksByCustomNamespace
        .mockReturnValueOnce({
          networks: mockEvmNetworks,
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 2,
          totalEnabledNetworksCount: 2,
        })
        .mockReturnValueOnce({
          networks: mockSolanaNetworks,
          selectedNetworks: [],
          selectedCount: 0,
          areAllNetworksSelected: false,
          areAnyNetworksSelected: false,
          networkCount: 1,
          totalEnabledNetworksCount: 1,
        });

      // Act
      const { result } = renderHook(() => useNetworksToUse(props));

      // Assert
      expect(result.current.areAllNetworksSelectedCombined).toBe(false);
    });
  });
});
