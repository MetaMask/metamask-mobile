/* eslint-disable import/no-namespace */
import { selectAllCollectiblesByChain } from './collectibles';
import * as AccountsControllerSelectorsModule from '../../selectors/accountsController';
import * as NFTControllerSelectorsModule from '../../selectors/nftController';
import type { RootState } from '../index';
import type { Hex } from '@metamask/utils';
import { Nft } from '@metamask/assets-controllers';

jest.mock('../../selectors/accountsController');
jest.mock('../../selectors/nftController');

describe('selectAllCollectiblesByChain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectAllCollectiblesByChain.clearCache();
  });

  const arrange = () => {
    const mockSelectSelectedInternalAccountAddress = jest.spyOn(
      AccountsControllerSelectorsModule,
      'selectSelectedInternalAccountAddress',
    );
    const mockSelectAllNfts = jest.spyOn(
      NFTControllerSelectorsModule,
      'selectAllNfts',
    );
    return {
      mockSelectSelectedInternalAccountAddress,
      mockSelectAllNfts,
    };
  };

  const mockState: RootState = {} as RootState;
  const mockChainId: Hex = '0x1';
  const mockAddress = '0x123456789abcdef';
  const mockNftContracts = {
    [mockAddress]: {
      [mockChainId]: [
        { address: '0xcontract1', tokenId: '1', name: 'NFT 1' } as Nft,
        { address: '0xcontract2', tokenId: '2', name: 'NFT 2' } as Nft,
      ],
      '0x89': [{ address: '0xcontract3', tokenId: '3', name: 'NFT 3' } as Nft],
    },
  };

  it('returns collectibles for valid address and chain', () => {
    const { mockSelectSelectedInternalAccountAddress, mockSelectAllNfts } =
      arrange();
    mockSelectSelectedInternalAccountAddress.mockReturnValue(mockAddress);
    mockSelectAllNfts.mockReturnValue(mockNftContracts);

    const result = selectAllCollectiblesByChain(mockState, mockChainId);

    expect(result).toEqual(mockNftContracts[mockAddress][mockChainId]);
    expect(result).toHaveLength(2);
  });

  it.each([
    {
      case: 'no address',
      selectedAddress: undefined,
      allNfts: mockNftContracts,
      chainId: mockChainId,
    },
    {
      case: 'no nfts',
      selectedAddress: mockAddress,
      allNfts: {},
      chainId: mockChainId,
    },
    {
      case: 'missing address',
      selectedAddress: '0xnonexistent',
      allNfts: mockNftContracts,
      chainId: mockChainId,
    },
    {
      case: 'missing chainId',
      selectedAddress: mockAddress,
      allNfts: mockNftContracts,
      chainId: '0xnonexistent' as Hex,
    },
  ])('returns empty array - $case', ({ selectedAddress, allNfts, chainId }) => {
    const { mockSelectSelectedInternalAccountAddress, mockSelectAllNfts } =
      arrange();

    mockSelectSelectedInternalAccountAddress.mockReturnValue(selectedAddress);
    mockSelectAllNfts.mockReturnValue(allNfts);

    const result = selectAllCollectiblesByChain(mockState, chainId);

    expect(result).toEqual([]);
  });
});
