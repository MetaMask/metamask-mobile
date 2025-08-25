import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { useEVMNfts } from './useNfts';
import Engine from '../../../../../core/Engine';
import { selectSelectedAccountGroup } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { selectAllNfts } from '../../../../../selectors/nftController';
import { getNetworkBadgeSource } from '../../utils/network';
import { configureStore } from '@reduxjs/toolkit';

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

describe('useEVMNfts', () => {
  const mockAccount = {
    id: 'account-1',
    address: '0x1234567890123456789012345678901234567890',
  };

  const mockNft = {
    address: '0xabcdef',
    tokenId: '123',
    name: 'Test NFT',
    image: 'https://example.com/image.png',
    standard: 'ERC721',
    collection: {
      name: 'Test Collection',
      imageUrl: 'https://example.com/collection.png',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNetworkBadgeSource.mockReturnValue('network-badge-source');
    mockIsEvmAddress.mockReturnValue(true);
    mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
      'network-client-id',
    );
    mockAssetsContractController.getERC1155BalanceOf.mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      '1' as any,
    );
  });

  it('returns empty array when no EVM account is found', async () => {
    mockSelectSelectedAccountGroup.mockReturnValue({
      accounts: ['account-1'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectInternalAccountsById.mockReturnValue({
      'account-1': mockAccount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSelectAllNfts.mockReturnValue({} as any);

    mockIsEvmAddress.mockReturnValue(false);

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('returns empty array when no NFTs are available', async () => {
    mockSelectSelectedAccountGroup.mockReturnValue({
      accounts: ['account-1'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectInternalAccountsById.mockReturnValue({
      'account-1': mockAccount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSelectAllNfts.mockReturnValue({} as any);

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('transforms NFTs with existing collection data correctly', async () => {
    mockSelectSelectedAccountGroup.mockReturnValue({
      accounts: ['account-1'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectInternalAccountsById.mockReturnValue({
      'account-1': mockAccount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectAllNfts.mockReturnValue({
      [mockAccount.address]: {
        '0x1': [mockNft],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

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

    mockSelectSelectedAccountGroup.mockReturnValue({
      accounts: ['account-1'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectInternalAccountsById.mockReturnValue({
      'account-1': mockAccount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectAllNfts.mockReturnValue({
      [mockAccount.address]: {
        '0x1': [nftWithoutCollection],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

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

  it('handles ERC1155 NFTs and fetches balance', async () => {
    const erc1155Nft = {
      ...mockNft,
      standard: 'ERC1155',
    };

    mockSelectSelectedAccountGroup.mockReturnValue({
      accounts: ['account-1'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectInternalAccountsById.mockReturnValue({
      'account-1': mockAccount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectAllNfts.mockReturnValue({
      [mockAccount.address]: {
        '0x1': [erc1155Nft],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(
        mockAssetsContractController.getERC1155BalanceOf,
      ).toHaveBeenCalledWith(
        mockAccount.address,
        erc1155Nft.address,
        erc1155Nft.tokenId,
        'network-client-id',
      );
      expect(result.current[0].balance).toBe('1');
    });
  });

  it('handles balance fetch error for ERC1155 NFTs', async () => {
    const erc1155Nft = {
      ...mockNft,
      standard: 'ERC1155',
    };

    mockSelectSelectedAccountGroup.mockReturnValue({
      accounts: ['account-1'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectInternalAccountsById.mockReturnValue({
      'account-1': mockAccount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectAllNfts.mockReturnValue({
      [mockAccount.address]: {
        '0x1': [erc1155Nft],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockAssetsContractController.getERC1155BalanceOf.mockRejectedValue(
      new Error('Balance fetch failed'),
    );

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current[0].balance).toBe('0');
    });
  });

  it('handles collection fetch errors gracefully', async () => {
    const nftWithoutCollection = {
      ...mockNft,
      collection: undefined,
    };

    mockSelectSelectedAccountGroup.mockReturnValue({
      accounts: ['account-1'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectInternalAccountsById.mockReturnValue({
      'account-1': mockAccount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectAllNfts.mockReturnValue({
      [mockAccount.address]: {
        '0x1': [nftWithoutCollection],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

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

    mockSelectSelectedAccountGroup.mockReturnValue({
      accounts: ['account-1'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectInternalAccountsById.mockReturnValue({
      'account-1': mockAccount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectAllNfts.mockReturnValue({
      [mockAccount.address]: {
        '0x1': [mockNft],
      },
      [otherAccount.address]: {
        '0x1': [{ ...mockNft, name: 'Other NFT' }],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

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

    mockSelectSelectedAccountGroup.mockReturnValue({
      accounts: ['account-1'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectInternalAccountsById.mockReturnValue({
      'account-1': mockAccount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectAllNfts.mockReturnValue({
      [mockAccount.address]: {
        '0x1': [nftWithoutImage],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

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

    mockSelectSelectedAccountGroup.mockReturnValue({
      accounts: ['account-1'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectInternalAccountsById.mockReturnValue({
      'account-1': mockAccount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectAllNfts.mockReturnValue({
      [mockAccount.address]: {
        '0x1': [nftWithIpfsImage],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHookWithStore(() => useEVMNfts());

    await waitFor(() => {
      expect(result.current[0].image).toBe('https://example.com/valid.png');
    });
  });
});
