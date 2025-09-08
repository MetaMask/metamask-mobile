import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { configureStore } from '@reduxjs/toolkit';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountGroupType } from '@metamask/account-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountId } from '@metamask/accounts-controller';
import { Nft, NftControllerState } from '@metamask/assets-controllers';
import BigNumber from 'bignumber.js';

import Engine from '../../../../../core/Engine';
import { selectSelectedAccountGroup } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { selectAllNfts } from '../../../../../selectors/nftController';
import { getNetworkBadgeSource } from '../../utils/network';
import { useEVMNfts } from './useNfts';
import { useSendScope } from './useSendScope';

jest.mock('ethers/lib/utils', () => ({
  isAddress: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NftController: {
      getNFTContractInfo: jest.fn(),
    },
    AssetsContractController: {
      getERC1155BalanceOf: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
  },
}));

jest.mock('../../../../../selectors/multichainAccounts/accountTreeController');
jest.mock('../../../../../selectors/accountsController');
jest.mock('../../../../../selectors/nftController');
jest.mock('../../utils/network');
jest.mock('./useSendScope');

const mockIsEvmAddress = isEvmAddress as jest.MockedFunction<
  typeof isEvmAddress
>;
const mockSelectSelectedAccountGroup =
  selectSelectedAccountGroup as jest.MockedFunction<
    typeof selectSelectedAccountGroup
  >;
const mockSelectInternalAccountsById =
  selectInternalAccountsById as jest.MockedFunction<
    typeof selectInternalAccountsById
  >;
const mockSelectAllNfts = selectAllNfts as jest.MockedFunction<
  typeof selectAllNfts
>;
const mockGetNetworkBadgeSource = getNetworkBadgeSource as jest.MockedFunction<
  typeof getNetworkBadgeSource
>;
const mockuseSendScope = useSendScope as jest.MockedFunction<
  typeof useSendScope
>;

const mockNftController = Engine.context.NftController as jest.Mocked<
  typeof Engine.context.NftController
>;
const mockAssetsContractController = Engine.context
  .AssetsContractController as jest.Mocked<
  typeof Engine.context.AssetsContractController
>;
const mockNetworkController = Engine.context.NetworkController as jest.Mocked<
  typeof Engine.context.NetworkController
>;

const createMockStore = () =>
  configureStore({
    reducer: {
      app: () => ({}),
    },
    preloadedState: {
      app: {},
    },
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderHookWithStore = (hook: () => any) => {
  const store = createMockStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(hook, { wrapper });
};

type MockAllNfts = NftControllerState['allNfts'];

const createMockAccountGroup = (accounts: string[]): AccountGroupObject => ({
  id: 'test-group-id' as AccountGroupObject['id'],
  type: AccountGroupType.SingleAccount,
  accounts: [accounts[0]] as [string],
  metadata: {
    name: 'Test Account Group',
    pinned: false,
    hidden: false,
  },
});

const createMockMultichainAccountGroup = (
  accounts: string[],
): AccountGroupObject =>
  ({
    id: 'entropy:test-wallet/1' as const,
    type: AccountGroupType.MultichainAccount,
    accounts: accounts as AccountGroupObject['accounts'],
    metadata: {
      name: 'Test Multichain Account Group',
      pinned: false,
      hidden: false,
    },
  } as unknown as AccountGroupObject);

const createMockInternalAccount = (
  id: string,
  address: string,
): InternalAccount => ({
  id,
  address,
  type: 'eip155:eoa' as const,
  options: {},
  metadata: {
    name: `Account ${id}`,
    importTime: Date.now(),
    keyring: { type: 'HD Key Tree' },
  },
  scopes: [`eip155:1`],
  methods: ['eth_sendTransaction', 'eth_sign'],
});

const createMockInternalAccountsById = (
  accounts: Record<string, { id: string; address: string }>,
): Record<AccountId, InternalAccount> => {
  const result: Record<AccountId, InternalAccount> = {};
  Object.entries(accounts).forEach(([key, { id, address }]) => {
    result[key] = createMockInternalAccount(id, address);
  });
  return result;
};

const createMockAllNfts = (
  nftsByAddressAndChain: Record<string, Record<string, Partial<Nft>[]>>,
): MockAllNfts => {
  const result: Record<string, Record<string, Nft[]>> = {};
  Object.entries(nftsByAddressAndChain).forEach(([address, chains]) => {
    result[address] = {};
    Object.entries(chains).forEach(([chainId, nfts]) => {
      result[address][chainId] = nfts.map(
        (nft) =>
          ({
            address: '',
            tokenId: '',
            name: '',
            description: '',
            image: '',
            standard: 'ERC721',
            favorite: false,
            isCurrentlyOwned: true,
            ...nft,
          } as Nft),
      );
    });
  });
  return result;
};

const mockNft = {
  address: '0xabcdef',
  tokenId: '123',
  name: 'Test NFT',
  description: 'Test NFT description',
  image: 'https://example.com/image.png',
  standard: 'ERC721',
  favorite: false,
  isCurrentlyOwned: true,
  collection: {
    name: 'Test Collection',
    imageUrl: 'https://example.com/collection.png',
  },
};

describe('useEVMNfts', () => {
  const mockAccount = {
    id: 'account-1',
    address: '0x1234567890123456789012345678901234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNetworkBadgeSource.mockReturnValue('network-badge-source');
    mockIsEvmAddress.mockReturnValue(true);
    mockuseSendScope.mockReturnValue({
      isSolanaOnly: false,
      isEvmOnly: true,
      isBIP44: false,
    });
    mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
      'network-client-id',
    );
    mockAssetsContractController.getERC1155BalanceOf.mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new BigNumber('1') as any,
    );
  });

  it('returns empty array when isEvm is false', async () => {
    mockuseSendScope.mockReturnValue({
      isSolanaOnly: false,
      isEvmOnly: false,
      isBIP44: false,
    });

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [mockNft],
        },
      }),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('returns empty array when no EVM account is found', async () => {
    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(createMockAllNfts({}));

    mockIsEvmAddress.mockReturnValue(false);

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('returns empty array when no NFTs are available', async () => {
    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(createMockAllNfts({}));

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('transforms NFTs with existing collection data correctly', async () => {
    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [mockNft],
        },
      }),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual({
        address: mockNft.address,
        standard: 'ERC721',
        name: mockNft.name,
        collectionName: mockNft.collection.name,
        image: mockNft.image,
        chainId: '0x1',
        tokenId: mockNft.tokenId,
        accountId: mockAccount.id,
        networkBadgeSource: 'network-badge-source',
        balance: undefined,
      });
    });
  });

  it('fetches collection info for NFTs without collection data', async () => {
    const nftWithoutCollection = {
      ...mockNft,
      collection: undefined,
    };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nftWithoutCollection],
        },
      }),
    );

    mockNftController.getNFTContractInfo.mockResolvedValue({
      collections: [mockNft.collection],
    });

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(mockNftController.getNFTContractInfo).toHaveBeenCalledWith(
        [mockNft.address],
        '0x1',
      );
      expect(result.current).toHaveLength(1);
      expect(result.current[0].collectionName).toBe(mockNft.collection.name);
    });
  });

  it('filters out ERC1155 NFTs', async () => {
    const erc1155Nft = {
      ...mockNft,
      standard: 'ERC1155',
    };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [erc1155Nft],
        },
      }),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toHaveLength(0);
    });
  });

  it('returns empty array when collection fetch fails', async () => {
    const nftWithoutCollection = {
      ...mockNft,
      collection: undefined,
    };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nftWithoutCollection],
        },
      }),
    );

    mockNftController.getNFTContractInfo.mockRejectedValue(
      new Error('Collection fetch failed'),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('filters NFTs by account address', async () => {
    const otherAccount = {
      id: 'account-2',
      address: '0x9876543210987654321098765432109876543210',
    };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
        'account-2': otherAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [mockNft],
        },
        [otherAccount.address]: {
          '0x1': [{ ...mockNft, name: 'Other NFT' }],
        },
      }),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
      expect(result.current[0].name).toBe('Test NFT');
    });
  });

  it('uses fallback image sources when primary image is unavailable', async () => {
    const nftWithoutImage = {
      ...mockNft,
      image: undefined,
      imageUrl: 'https://example.com/fallback.png',
    };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nftWithoutImage],
        },
      }),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current[0].image).toBe('https://example.com/fallback.png');
    });
  });

  it('skips IPFS image URLs', async () => {
    const nftWithIpfsImage = {
      ...mockNft,
      image: 'ipfs://QmTest',
      imageUrl: 'https://example.com/valid.png',
    };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nftWithIpfsImage],
        },
      }),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current[0].image).toBe('https://example.com/valid.png');
    });
  });

  it('returns empty array when selectedAccountGroup is null', async () => {
    mockSelectSelectedAccountGroup.mockReturnValue(null);
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({}),
    );
    mockSelectAllNfts.mockReturnValue(createMockAllNfts({}));

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('returns empty array when allNFTS is null', async () => {
    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(null as unknown as MockAllNfts);

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('selects first EVM account when multiple accounts exist', async () => {
    const nonEvmAccount = { id: 'account-2', address: 'cosmos1abc...' };
    const secondEvmAccount = { id: 'account-3', address: '0xabcd...' };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockMultichainAccountGroup(['account-2', 'account-1', 'account-3']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
        'account-2': nonEvmAccount,
        'account-3': secondEvmAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [mockNft],
        },
      }),
    );

    mockIsEvmAddress.mockImplementation((address: string) =>
      address.startsWith('0x'),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
      expect(result.current[0].accountId).toBe(mockAccount.id);
    });
  });

  it('returns NFTs from multiple chains', async () => {
    const nftChain1 = { ...mockNft, name: 'NFT Chain 1' };
    const nftChain2 = { ...mockNft, name: 'NFT Chain 2' };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nftChain1],
          '0x89': [nftChain2],
        },
      }),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toHaveLength(2);
      expect(result.current[0].chainId).toBe('0x1');
      expect(result.current[1].chainId).toBe('0x89');
    });
  });

  it('skips NFTs with missing required fields', async () => {
    const invalidNfts = [
      { ...mockNft, standard: undefined },
      { ...mockNft, tokenId: undefined },
      mockNft,
    ];

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': invalidNfts,
        },
      }),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
      expect(result.current[0].name).toBe('Test NFT');
    });
  });

  it('uses collection sampleImages as fallback', async () => {
    const nftWithSampleImages = {
      ...mockNft,
      image: undefined,
      imageUrl: undefined,
      collection: {
        ...mockNft.collection,
        imageUrl: undefined,
        sampleImages: [
          'https://example.com/sample1.png',
          'https://example.com/sample2.png',
        ],
      },
    };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nftWithSampleImages],
        },
      }),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current[0].image).toBe('https://example.com/sample1.png');
    });
  });

  it('returns undefined image when all URLs are IPFS or undefined', async () => {
    const nftWithOnlyIpfs = {
      ...mockNft,
      image: 'ipfs://QmTest1',
      imageUrl: 'ipfs://QmTest2',
      collection: {
        ...mockNft.collection,
        imageUrl: 'ipfs://QmTest3',
        sampleImages: ['ipfs://QmTest4'],
      },
    };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nftWithOnlyIpfs],
        },
      }),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current[0].image).toBeUndefined();
    });
  });

  it('fetches missing collections for NFTs without collection data', async () => {
    const nftWithCollection = mockNft;
    const nftWithoutCollection = {
      ...mockNft,
      collection: undefined,
      name: 'No Collection NFT',
    };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nftWithCollection, nftWithoutCollection],
        },
      }),
    );

    mockNftController.getNFTContractInfo.mockResolvedValue({
      collections: [
        {
          name: 'Fetched Collection',
          imageUrl: 'https://example.com/fetched.png',
        },
      ],
    });

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toHaveLength(2);
      expect(result.current[0].collectionName).toBe('Test Collection');
      expect(result.current[1].collectionName).toBe('Fetched Collection');
    });
  });

  it('returns empty array when getNFTContractInfo returns empty collections', async () => {
    const nftWithoutCollection = { ...mockNft, collection: undefined };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nftWithoutCollection],
        },
      }),
    );

    mockNftController.getNFTContractInfo.mockResolvedValue({
      collections: [],
    });

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('groups NFTs by chain when fetching missing collections', async () => {
    const nft1 = {
      ...mockNft,
      collection: undefined,
      name: 'NFT 1',
      address: '0xaaa',
    };
    const nft2 = {
      ...mockNft,
      collection: undefined,
      name: 'NFT 2',
      address: '0xbbb',
    };
    const nft3 = {
      ...mockNft,
      collection: undefined,
      name: 'NFT 3',
      address: '0xccc',
    };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nft1, nft2],
          '0x89': [nft3],
        },
      }),
    );

    mockNftController.getNFTContractInfo.mockResolvedValue({
      collections: [{ name: 'Collection A' }, { name: 'Collection B' }],
    });

    renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(mockNftController.getNFTContractInfo).toHaveBeenCalledTimes(2);
      expect(mockNftController.getNFTContractInfo).toHaveBeenCalledWith(
        ['0xaaa', '0xbbb'],
        '0x1',
      );
      expect(mockNftController.getNFTContractInfo).toHaveBeenCalledWith(
        ['0xccc'],
        '0x89',
      );
    });
  });

  it('preserves undefined name fields in NFT data', async () => {
    const nftWithoutName = {
      ...mockNft,
      name: undefined,
    };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nftWithoutName],
        },
      }),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current[0].name).toBeUndefined();
      expect(result.current[0].collectionName).toBe('Test Collection');
    });
  });

  it('preserves undefined collection name', async () => {
    const nftWithNamelessCollection = {
      ...mockNft,
      collection: {
        ...mockNft.collection,
        name: undefined,
      },
    };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nftWithNamelessCollection],
        },
      }),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current[0].collectionName).toBeUndefined();
    });
  });

  it('deduplicates contract addresses when fetching collections', async () => {
    const nft1 = { ...mockNft, collection: undefined, tokenId: '1' };
    const nft2 = { ...mockNft, collection: undefined, tokenId: '2' };

    mockSelectSelectedAccountGroup.mockReturnValue(
      createMockAccountGroup(['account-1']),
    );
    mockSelectInternalAccountsById.mockReturnValue(
      createMockInternalAccountsById({
        'account-1': mockAccount,
      }),
    );
    mockSelectAllNfts.mockReturnValue(
      createMockAllNfts({
        [mockAccount.address]: {
          '0x1': [nft1, nft2],
        },
      }),
    );

    mockNftController.getNFTContractInfo.mockResolvedValue({
      collections: [{ name: 'Shared Collection' }],
    });

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(mockNftController.getNFTContractInfo).toHaveBeenCalledWith(
        [mockNft.address],
        '0x1',
      );
      expect(result.current).toHaveLength(2);
      expect(result.current[0].collectionName).toBe('Shared Collection');
      expect(result.current[1].collectionName).toBe('Shared Collection');
    });
  });
});
