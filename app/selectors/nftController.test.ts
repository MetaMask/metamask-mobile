import {
  Nft,
  NftContract,
  NftControllerState,
} from '@metamask/assets-controllers';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { RootState } from '../reducers';
import {
  selectAllNftContracts,
  selectAllNfts,
  selectAllNftsFlat,
  multichainCollectibleForEvmAccount,
} from './nftController';

// Mock the external selectors that are dependencies
jest.mock('./accountsController');
jest.mock('./networkEnablementController');

import { selectLastSelectedEvmAccount } from './accountsController';
import { selectEnabledNetworksByNamespace } from './networkEnablementController';

const mockSelectLastSelectedEvmAccount =
  selectLastSelectedEvmAccount as jest.MockedFunction<
    typeof selectLastSelectedEvmAccount
  >;
const mockSelectEnabledNetworksByNamespace =
  selectEnabledNetworksByNamespace as jest.MockedFunction<
    typeof selectEnabledNetworksByNamespace
  >;

describe('NftController Selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock NFT data
  const mockNft1: Nft = {
    address: '0xContract1' as Hex,
    tokenId: '1',
    name: 'Test NFT 1',
    description: 'A test NFT',
    image: 'https://test.com/image1.png',
    standard: 'ERC721',
  };

  const mockNft2: Nft = {
    address: '0xContract2' as Hex,
    tokenId: '2',
    name: 'Test NFT 2',
    description: 'Another test NFT',
    image: 'https://test.com/image2.png',
    standard: 'ERC721',
  };

  const mockNft3: Nft = {
    address: '0xContract3' as Hex,
    tokenId: '3',
    name: 'Test NFT 3',
    description: 'Third test NFT',
    image: 'https://test.com/image3.png',
    standard: 'ERC1155',
  };

  // Mock NFT contract data
  const mockNftContract1: NftContract = {
    address: '0xContract1' as Hex,
    name: 'Test Contract 1',
    symbol: 'TC1',
    schemaName: 'ERC721',
  };

  const mockNftContract2: NftContract = {
    address: '0xContract2' as Hex,
    name: 'Test Contract 2',
    symbol: 'TC2',
    schemaName: 'ERC721',
  };

  const mockNftContract3: NftContract = {
    address: '0xContract3' as Hex,
    name: 'Test Contract 3',
    symbol: 'TC3',
    schemaName: 'ERC1155',
  };

  const mockAccountAddress = '0xAccount1' as Hex;
  const mockAccountAddress2 = '0xAccount2' as Hex;

  const mockNftControllerState: NftControllerState = {
    allNfts: {
      [mockAccountAddress]: {
        '0x1': [mockNft1, mockNft2],
        '0x89': [mockNft3],
      },
      [mockAccountAddress2]: {
        '0x1': [mockNft2],
      },
    },
    allNftContracts: {
      [mockAccountAddress]: {
        '0x1': [mockNftContract1, mockNftContract2],
        '0x89': [mockNftContract3],
      },
      [mockAccountAddress2]: {
        '0x1': [mockNftContract2],
      },
    },
    ignoredNfts: [],
  };

  const mockSelectedEvmAccount = {
    address: mockAccountAddress,
    id: 'account-1',
    metadata: {
      name: 'Test Account',
      importTime: Date.now(),
      keyring: {
        type: 'HD Key Tree',
      },
    },
    options: {},
    methods: ['eth_sign'],
    type: 'eip155:eoa' as const,
    scopes: ['eip155:1', 'eip155:89'] as `${string}:${string}`[],
  };

  const mockEnabledNetworks = {
    [KnownCaipNamespace.Eip155]: {
      '0x1': true,
      '0x89': true,
      '0xa': false, // Optimism disabled
    },
  };

  const createMockRootState = (
    nftControllerState: Partial<NftControllerState> = mockNftControllerState,
    selectedAccount = mockSelectedEvmAccount,
    enabledNetworks = mockEnabledNetworks,
  ): RootState =>
    ({
      engine: {
        backgroundState: {
          NftController: nftControllerState as NftControllerState,
          AccountsController: {
            internalAccounts: {
              selectedAccount: selectedAccount?.id || '',
              accounts: {
                [selectedAccount?.id || '']: selectedAccount,
              },
            },
          },
          NetworkEnablementController: {
            enabledNetworksByNamespace: enabledNetworks,
          },
        },
      },
    } as unknown as RootState);

  describe('selectAllNftContracts', () => {
    it('returns all NFT contracts from NftController state', () => {
      // Arrange
      const mockState = createMockRootState();

      // Act
      const result = selectAllNftContracts(mockState);

      // Assert
      expect(result).toEqual(mockNftControllerState.allNftContracts);
    });

    it('returns empty object when no NFT contracts exist', () => {
      // Arrange
      const emptyNftState = { ...mockNftControllerState, allNftContracts: {} };
      const mockState = createMockRootState(emptyNftState);

      // Act
      const result = selectAllNftContracts(mockState);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('selectAllNfts', () => {
    it('returns all NFTs from NftController state', () => {
      // Arrange
      const mockState = createMockRootState();

      // Act
      const result = selectAllNfts(mockState);

      // Assert
      expect(result).toEqual(mockNftControllerState.allNfts);
    });

    it('returns empty object when no NFTs exist', () => {
      // Arrange
      const emptyNftState = { ...mockNftControllerState, allNfts: {} };
      const mockState = createMockRootState(emptyNftState);

      // Act
      const result = selectAllNfts(mockState);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('selectAllNftsFlat', () => {
    it('returns flattened array of all NFTs across all accounts and chains', () => {
      // Arrange
      const mockState = createMockRootState();

      // Act
      const result = selectAllNftsFlat(mockState);

      // Assert
      expect(result).toEqual([mockNft1, mockNft2, mockNft3, mockNft2]);
      expect(result).toHaveLength(4);
    });

    it('returns empty array when no NFTs exist', () => {
      // Arrange
      const emptyNftState = { ...mockNftControllerState, allNfts: {} };
      const mockState = createMockRootState(emptyNftState);

      // Act
      const result = selectAllNftsFlat(mockState);

      // Assert
      expect(result).toEqual([]);
    });

    it('returns empty array when accounts have no chains', () => {
      // Arrange
      const stateWithEmptyChains = {
        ...mockNftControllerState,
        allNfts: {
          [mockAccountAddress]: {},
        },
      };
      const mockState = createMockRootState(stateWithEmptyChains);

      // Act
      const result = selectAllNftsFlat(mockState);

      // Assert
      expect(result).toEqual([]);
    });

    it('handles mixed empty and populated accounts', () => {
      // Arrange
      const mixedState: Partial<NftControllerState> = {
        ...mockNftControllerState,
        allNfts: {
          [mockAccountAddress]: {
            '0x1': [mockNft1],
          },
          [mockAccountAddress2]: {
            '0x1': [],
          },
        },
      };
      const mockState = createMockRootState(mixedState);

      // Act
      const result = selectAllNftsFlat(mockState);

      // Assert
      expect(result).toEqual([mockNft1]);
    });
  });

  describe('multichainCollectibleForEvmAccount', () => {
    beforeEach(() => {
      // Set up default mock returns
      mockSelectLastSelectedEvmAccount.mockReturnValue(mockSelectedEvmAccount);
      mockSelectEnabledNetworksByNamespace.mockReturnValue(mockEnabledNetworks);
    });

    it('returns NFT contracts for selected account filtered by enabled networks', () => {
      // Arrange
      const mockState = createMockRootState();

      // Act
      const result = multichainCollectibleForEvmAccount(mockState);

      // Assert
      expect(result).toEqual({
        '0x1': [mockNftContract1, mockNftContract2],
        '0x89': [mockNftContract3],
      });
    });

    it('returns empty object when no account is selected', () => {
      // Arrange
      mockSelectLastSelectedEvmAccount.mockReturnValue(undefined);
      const mockState = createMockRootState();

      // Act
      const result = multichainCollectibleForEvmAccount(mockState);

      // Assert
      expect(result).toEqual({});
    });

    it('returns empty object when selected account has no address', () => {
      // Arrange
      const accountWithoutAddress = {
        ...mockSelectedEvmAccount,
        address: undefined,
        metadata: {
          ...mockSelectedEvmAccount.metadata,
          importTime: Date.now(),
        },
        scopes: ['eip155:1', 'eip155:89'] as `${string}:${string}`[],
      };
      // @ts-expect-error - Testing edge case with invalid account
      mockSelectLastSelectedEvmAccount.mockReturnValue(accountWithoutAddress);
      const mockState = createMockRootState();

      // Act
      const result = multichainCollectibleForEvmAccount(mockState);

      // Assert
      expect(result).toEqual({});
    });

    it('returns empty object when account has no contracts', () => {
      // Arrange
      const stateWithoutContracts = {
        ...mockNftControllerState,
        allNftContracts: {},
      };
      const mockState = createMockRootState(stateWithoutContracts);

      // Act
      const result = multichainCollectibleForEvmAccount(mockState);

      // Assert
      expect(result).toEqual({});
    });

    it('returns empty object when account contracts are empty', () => {
      // Arrange
      const stateWithEmptyContracts = {
        ...mockNftControllerState,
        allNftContracts: {
          [mockAccountAddress]: {},
        },
      };
      const mockState = createMockRootState(stateWithEmptyContracts);

      // Act
      const result = multichainCollectibleForEvmAccount(mockState);

      // Assert
      expect(result).toEqual({});
    });

    it('returns empty object when no EIP155 networks are enabled', () => {
      // Arrange
      const disabledNetworks = {
        [KnownCaipNamespace.Eip155]: {},
      };
      mockSelectEnabledNetworksByNamespace.mockReturnValue(disabledNetworks);
      const mockState = createMockRootState();

      // Act
      const result = multichainCollectibleForEvmAccount(mockState);

      // Assert
      expect(result).toEqual({});
    });

    it('returns empty object when enabledNetworks is undefined', () => {
      // Arrange
      // @ts-expect-error - Testing edge case with undefined value
      mockSelectEnabledNetworksByNamespace.mockReturnValue(undefined);
      const mockState = createMockRootState();

      // Act
      const result = multichainCollectibleForEvmAccount(mockState);

      // Assert
      expect(result).toEqual({});
    });

    it('returns empty object when EIP155 namespace is missing', () => {
      // Arrange
      const networksWithoutEip155 = {
        [KnownCaipNamespace.Bip122]: {
          'bip122:000000000019d6689c085ae165831e93': true,
        },
      };
      mockSelectEnabledNetworksByNamespace.mockReturnValue(
        networksWithoutEip155,
      );
      const mockState = createMockRootState();

      // Act
      const result = multichainCollectibleForEvmAccount(mockState);

      // Assert
      expect(result).toEqual({});
    });

    it('filters out disabled networks', () => {
      // Arrange
      const partiallyEnabledNetworks = {
        [KnownCaipNamespace.Eip155]: {
          '0x1': true, // Ethereum enabled
          '0x89': false, // Polygon disabled
          '0xa': true, // Optimism enabled but no contracts
        },
      };
      mockSelectEnabledNetworksByNamespace.mockReturnValue(
        partiallyEnabledNetworks,
      );
      const mockState = createMockRootState();

      // Act
      const result = multichainCollectibleForEvmAccount(mockState);

      // Assert
      expect(result).toEqual({
        '0x1': [mockNftContract1, mockNftContract2],
        // 0x89 should be filtered out (disabled)
        // 0xa should be filtered out (no contracts)
      });
    });

    it('only includes chains that have contracts', () => {
      // Arrange
      const networksWithExtraChains = {
        [KnownCaipNamespace.Eip155]: {
          '0x1': true, // Has contracts
          '0x89': true, // Has contracts
          '0xa': true, // No contracts
          '0x38': true, // No contracts
        },
      };
      mockSelectEnabledNetworksByNamespace.mockReturnValue(
        networksWithExtraChains,
      );
      const mockState = createMockRootState();

      // Act
      const result = multichainCollectibleForEvmAccount(mockState);

      // Assert
      expect(result).toEqual({
        '0x1': [mockNftContract1, mockNftContract2],
        '0x89': [mockNftContract3],
        // 0xa and 0x38 should not appear (no contracts)
      });
    });

    it('works with different account addresses', () => {
      // Arrange
      const accountWithDifferentAddress = {
        ...mockSelectedEvmAccount,
        address: mockAccountAddress2,
        id: 'account-2',
        metadata: {
          ...mockSelectedEvmAccount.metadata,
          importTime: Date.now(),
        },
        scopes: ['eip155:1', 'eip155:89'] as `${string}:${string}`[],
      };
      mockSelectLastSelectedEvmAccount.mockReturnValue(
        accountWithDifferentAddress,
      );
      const mockState = createMockRootState();

      // Act
      const result = multichainCollectibleForEvmAccount(mockState);

      // Assert
      expect(result).toEqual({
        '0x1': [mockNftContract2],
        // Account2 only has contracts on chain 0x1
      });
    });

    it('returns empty object when all networks are disabled', () => {
      // Arrange
      const allDisabledNetworks = {
        [KnownCaipNamespace.Eip155]: {
          '0x1': false,
          '0x89': false,
        },
      };
      mockSelectEnabledNetworksByNamespace.mockReturnValue(allDisabledNetworks);
      const mockState = createMockRootState();

      // Act
      const result = multichainCollectibleForEvmAccount(mockState);

      // Assert
      expect(result).toEqual({});
    });
  });
});
