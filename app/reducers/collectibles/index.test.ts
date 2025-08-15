import { ChainId } from '@metamask/controller-utils';
import { KnownCaipNamespace } from '@metamask/utils';
import reducer, {
  ADD_FAVORITE_COLLECTIBLE,
  REMOVE_FAVORITE_COLLECTIBLE,
  multichainCollectibleContractsByEnabledNetworksSelector,
  multichainCollectiblesByEnabledNetworksSelector,
} from './index';
import mockedEngine from '../../core/__mocks__/MockedEngine';
import { RootState } from '../../reducers';

const emptyAction = { type: null };

const collectibleA1 = { tokenId: '101', address: '0xA' };
const collectibleA2 = { tokenId: '102', address: '0xA' };
const collectibleB1 = { tokenId: '101', address: '0xB' };
const collectibleB2 = { tokenId: '102', address: '0xB' };
const selectedAddressA = '0x0A';
const selectedAddressB = '0x0B';

jest.mock('../../core/Engine', () => ({
  init: () => mockedEngine.init(),
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
    },
  },
}));

describe('collectibles reducer', () => {
  it('should add favorite', () => {
    const initalState = reducer(undefined, emptyAction);
    const firstState = reducer(initalState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: ChainId.mainnet,
      collectible: collectibleA1,
    });
    expect(firstState).toEqual({
      favorites: {
        [selectedAddressA]: { [ChainId.mainnet]: [collectibleA1] },
      },
      isNftFetchingProgress: false,
    });
  });

  it('should add favorite by selectedAddress', () => {
    const initalState = reducer(undefined, emptyAction);
    const firstState = reducer(initalState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: ChainId.mainnet,
      collectible: collectibleA1,
    });
    const secondState = reducer(firstState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressB,
      chainId: ChainId.mainnet,
      collectible: collectibleA2,
    });
    expect(secondState).toEqual({
      favorites: {
        [selectedAddressA]: {
          [ChainId.mainnet]: [collectibleA1],
        },
        [selectedAddressB]: {
          [ChainId.mainnet]: [collectibleA2],
        },
      },
      isNftFetchingProgress: false,
    });
  });

  it('should add favorite by chainId', () => {
    const initalState = reducer(undefined, emptyAction);
    const firstState = reducer(initalState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: ChainId.mainnet,
      collectible: collectibleA1,
    });
    const secondState = reducer(firstState, {
      type: ADD_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: ChainId.sepolia,
      collectible: collectibleA2,
    });
    expect(secondState).toEqual({
      favorites: {
        [selectedAddressA]: {
          [ChainId.mainnet]: [collectibleA1],
          [ChainId.sepolia]: [collectibleA2],
        },
      },
      isNftFetchingProgress: false,
    });
  });

  it('should remove favorite collectible', () => {
    const firstState = {
      favorites: {
        [selectedAddressA]: { [ChainId.mainnet]: [collectibleA1] },
      },
      isNftFetchingProgress: false,
    };
    const secondState = reducer(firstState, {
      type: REMOVE_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: ChainId.mainnet,
      collectible: collectibleA1,
    });
    expect(secondState).toEqual({
      favorites: { [selectedAddressA]: { [ChainId.mainnet]: [] } },
      isNftFetchingProgress: false,
    });
  });

  it('should remove favorite collectible by address', () => {
    const firstState = {
      favorites: {
        [selectedAddressA]: {
          [ChainId.mainnet]: [collectibleA1, collectibleA2],
        },
        [selectedAddressB]: {
          [ChainId.mainnet]: [collectibleB1, collectibleB2],
        },
      },
      isNftFetchingProgress: false,
    };
    const secondState = reducer(firstState, {
      type: REMOVE_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressB,
      chainId: ChainId.mainnet,
      collectible: collectibleB1,
    });
    expect(secondState).toEqual({
      favorites: {
        [selectedAddressA]: {
          [ChainId.mainnet]: [collectibleA1, collectibleA2],
        },
        [selectedAddressB]: { [ChainId.mainnet]: [collectibleB2] },
      },
      isNftFetchingProgress: false,
    });
  });

  it('should remove favorite collectible by chainId', () => {
    const firstState = {
      favorites: {
        [selectedAddressA]: {
          [ChainId.mainnet]: [collectibleA1, collectibleA2],
          [ChainId.sepolia]: [collectibleA1],
        },
      },
      isNftFetchingProgress: false,
    };
    const secondState = reducer(firstState, {
      type: REMOVE_FAVORITE_COLLECTIBLE,
      selectedAddress: selectedAddressA,
      chainId: ChainId.sepolia,
      collectible: collectibleA1,
    });
    expect(secondState).toEqual({
      favorites: {
        [selectedAddressA]: {
          [ChainId.mainnet]: [collectibleA1, collectibleA2],
          [ChainId.sepolia]: [],
        },
      },
      isNftFetchingProgress: false,
    });
  });
});

describe('collectibles selectors', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockAddress2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

  const mockNftContracts = {
    name: 'Contract 1',
    address: '0xContractA',
    symbol: 'C1',
  };

  const mockNfts = [
    {
      tokenId: '1',
      address: '0xContractA',
      name: 'NFT 1',
      image: 'https://example.com/nft1.png',
    },
    {
      tokenId: '2',
      address: '0xContractA',
      name: 'NFT 2',
      image: 'https://example.com/nft2.png',
    },
  ];

  const createMockState = (
    allNftContracts = {},
    allNfts = {},
    selectedAddress = mockAddress,
    enabledNetworks = {},
  ) =>
    ({
      engine: {
        backgroundState: {
          NftController: {
            allNftContracts,
            allNfts,
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: selectedAddress
                ? `account-${selectedAddress}`
                : '',
              accounts: selectedAddress
                ? {
                    [`account-${selectedAddress}`]: {
                      address: selectedAddress,
                      id: `account-${selectedAddress}`,
                      metadata: {
                        name: 'Account 1',
                        keyring: { type: 'HD Key Tree' },
                      },
                      methods: [],
                      type: 'eip155:eoa',
                    },
                  }
                : {},
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: enabledNetworks,
          },
        },
      },
    } as unknown as RootState);

  describe('multichainCollectibleContractsByEnabledNetworksSelector', () => {
    it('should return contracts only for enabled networks', () => {
      const allNftContracts = {
        [mockAddress]: {
          '0x1': [mockNftContracts],
          '0x89': [{ ...mockNftContracts, name: 'Contract 2' }],
          '0xa86a': [{ ...mockNftContracts, name: 'Contract 3' }],
        },
      };

      const state = createMockState(allNftContracts, {}, mockAddress, {
        [KnownCaipNamespace.Eip155]: {
          '0x1': true,
          '0x89': false,
          '0xa86a': true,
        },
      });

      const result =
        multichainCollectibleContractsByEnabledNetworksSelector(state);

      // Only enabled networks are included in the result
      expect(result).toEqual({
        '0x1': [mockNftContracts],
        '0xa86a': [{ ...mockNftContracts, name: 'Contract 3' }],
      });
      // Disabled network is not included
      expect((result as Record<string, unknown>)['0x89']).toBeUndefined();
    });

    it('should return empty object when no contracts exist for address', () => {
      const state = createMockState(
        {}, // No contracts
        {},
        mockAddress,
        {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x89': true,
          },
        },
      );

      const result =
        multichainCollectibleContractsByEnabledNetworksSelector(state);
      expect(result).toEqual({});
    });

    it('should return empty object when no networks are enabled', () => {
      const allNftContracts = {
        [mockAddress]: {
          '0x1': [mockNftContracts],
          '0x89': [mockNftContracts],
        },
      };

      const state = createMockState(allNftContracts, {}, mockAddress, {
        [KnownCaipNamespace.Eip155]: {
          '0x1': false,
          '0x89': false,
        },
      });

      const result =
        multichainCollectibleContractsByEnabledNetworksSelector(state);
      expect(result).toEqual({});
    });

    it('should handle missing chains in contracts data', () => {
      const allNftContracts = {
        [mockAddress]: {
          '0x1': [mockNftContracts],
          // '0x89' not present in contracts
        },
      };

      const state = createMockState(allNftContracts, {}, mockAddress, {
        [KnownCaipNamespace.Eip155]: {
          '0x1': true,
          '0x89': true, // Enabled but no contracts
          '0xa86a': true,
        },
      });

      const result =
        multichainCollectibleContractsByEnabledNetworksSelector(state);

      expect(result).toEqual({
        '0x1': [mockNftContracts],
        '0x89': [], // Empty array for enabled but missing chain
        '0xa86a': [],
      });
    });

    it('should handle missing EIP155 namespace in enabled networks', () => {
      const allNftContracts = {
        [mockAddress]: {
          '0x1': [mockNftContracts],
        },
      };

      const state = createMockState(allNftContracts, {}, mockAddress, {
        // No EIP155 namespace
        [KnownCaipNamespace.Solana]: {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
        },
      });

      // The selector should return empty object when EIP155 namespace is missing
      const result =
        multichainCollectibleContractsByEnabledNetworksSelector(state);
      expect(result).toEqual({});
    });

    it('should handle different addresses correctly', () => {
      const allNftContracts = {
        [mockAddress]: {
          '0x1': [mockNftContracts],
        },
        [mockAddress2]: {
          '0x1': [{ ...mockNftContracts, name: 'Different Contract' }],
        },
      };

      const state = createMockState(
        allNftContracts,
        {},
        mockAddress2, // Selected different address
        {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
          },
        },
      );

      const result =
        multichainCollectibleContractsByEnabledNetworksSelector(state);

      expect(result).toEqual({
        '0x1': [{ ...mockNftContracts, name: 'Different Contract' }],
      });
    });
  });

  describe('multichainCollectiblesByEnabledNetworksSelector', () => {
    it('should return NFTs only for enabled networks', () => {
      const allNfts = {
        [mockAddress]: {
          '0x1': mockNfts,
          '0x89': [{ ...mockNfts[0], tokenId: '3' }],
          '0xa86a': [{ ...mockNfts[0], tokenId: '4' }],
        },
      };

      const state = createMockState({}, allNfts, mockAddress, {
        [KnownCaipNamespace.Eip155]: {
          '0x1': true,
          '0x89': false,
          '0xa86a': true,
        },
      });

      const result = multichainCollectiblesByEnabledNetworksSelector(state);

      expect(result).toEqual({
        '0x1': mockNfts,
        '0xa86a': [{ ...mockNfts[0], tokenId: '4' }],
      });
      expect((result as Record<string, unknown>)['0x89']).toBeUndefined();
    });

    it('should return empty object when no NFTs exist for address', () => {
      const state = createMockState(
        {},
        {}, // No NFTs
        mockAddress,
        {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x89': true,
          },
        },
      );

      const result = multichainCollectiblesByEnabledNetworksSelector(state);
      expect(result).toEqual({});
    });

    it('should return empty object when no networks are enabled', () => {
      const allNfts = {
        [mockAddress]: {
          '0x1': mockNfts,
          '0x89': mockNfts,
        },
      };

      const state = createMockState({}, allNfts, mockAddress, {
        [KnownCaipNamespace.Eip155]: {
          '0x1': false,
          '0x89': false,
        },
      });

      const result = multichainCollectiblesByEnabledNetworksSelector(state);
      expect(result).toEqual({});
    });

    it('should filter out disabled networks correctly', () => {
      const allNfts = {
        [mockAddress]: {
          '0x1': mockNfts,
          '0x89': [{ ...mockNfts[0], tokenId: '3' }],
          '0xa86a': [{ ...mockNfts[0], tokenId: '4' }],
          '0x38': [{ ...mockNfts[0], tokenId: '5' }],
        },
      };

      const state = createMockState({}, allNfts, mockAddress, {
        [KnownCaipNamespace.Eip155]: {
          '0x1': true,
          '0x89': false,
          '0xa86a': true,
          '0x38': false,
        },
      });

      const result = multichainCollectiblesByEnabledNetworksSelector(state);

      expect(result).toEqual({
        '0x1': mockNfts,
        '0xa86a': [{ ...mockNfts[0], tokenId: '4' }],
      });
      expect((result as Record<string, unknown>)['0x89']).toBeUndefined();
      expect((result as Record<string, unknown>)['0x38']).toBeUndefined();
    });

    it('should handle all networks enabled', () => {
      const allNfts = {
        [mockAddress]: {
          '0x1': mockNfts,
          '0x89': [{ ...mockNfts[0], tokenId: '3' }],
          '0xa86a': [{ ...mockNfts[0], tokenId: '4' }],
        },
      };

      const state = createMockState({}, allNfts, mockAddress, {
        [KnownCaipNamespace.Eip155]: {
          '0x1': true,
          '0x89': true,
          '0xa86a': true,
        },
      });

      const result = multichainCollectiblesByEnabledNetworksSelector(state);
      expect(result).toEqual(allNfts[mockAddress]);
    });

    it('should handle missing EIP155 namespace in enabled networks', () => {
      const allNfts = {
        [mockAddress]: {
          '0x1': mockNfts,
        },
      };

      const state = createMockState({}, allNfts, mockAddress, {
        // No EIP155 namespace
        [KnownCaipNamespace.Solana]: {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
        },
      });

      // The selector should return empty object when EIP155 namespace is missing
      const result = multichainCollectiblesByEnabledNetworksSelector(state);
      expect(result).toEqual({});
    });

    it('should return empty object when EIP155 namespace exists but is empty', () => {
      const allNfts = {
        [mockAddress]: {
          '0x1': mockNfts,
        },
      };

      const state = createMockState({}, allNfts, mockAddress, {
        [KnownCaipNamespace.Eip155]: {},
      });

      const result = multichainCollectiblesByEnabledNetworksSelector(state);
      expect(result).toEqual({});
    });

    it('should handle switching between addresses', () => {
      const allNfts = {
        [mockAddress]: {
          '0x1': mockNfts,
        },
        [mockAddress2]: {
          '0x1': [{ ...mockNfts[0], tokenId: '100', name: 'Different NFT' }],
        },
      };

      const state1 = createMockState({}, allNfts, mockAddress, {
        [KnownCaipNamespace.Eip155]: {
          '0x1': true,
        },
      });

      const result1 = multichainCollectiblesByEnabledNetworksSelector(state1);
      expect(result1).toEqual({
        '0x1': mockNfts,
      });

      const state2 = createMockState({}, allNfts, mockAddress2, {
        [KnownCaipNamespace.Eip155]: {
          '0x1': true,
        },
      });

      const result2 = multichainCollectiblesByEnabledNetworksSelector(state2);
      expect(result2).toEqual({
        '0x1': [{ ...mockNfts[0], tokenId: '100', name: 'Different NFT' }],
      });
    });

    it('should only return NFTs for chains that exist in the data', () => {
      const allNfts = {
        [mockAddress]: {
          '0x1': mockNfts,
          '0x89': [{ ...mockNfts[0], tokenId: '3' }],
          // '0xa86a' not present in NFTs data
        },
      };

      const state = createMockState({}, allNfts, mockAddress, {
        [KnownCaipNamespace.Eip155]: {
          '0x1': true,
          '0x89': true,
          '0xa86a': true, // Enabled but no NFTs
          '0x38': true, // Enabled but no NFTs
        },
      });

      const result = multichainCollectiblesByEnabledNetworksSelector(state);

      expect(result).toEqual({
        '0x1': mockNfts,
        '0x89': [{ ...mockNfts[0], tokenId: '3' }],
      });
      expect((result as Record<string, unknown>)['0xa86a']).toBeUndefined();
      expect((result as Record<string, unknown>)['0x38']).toBeUndefined();
    });
  });
});
