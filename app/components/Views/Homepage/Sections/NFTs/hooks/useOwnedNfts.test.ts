import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useOwnedNfts from './useOwnedNfts';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const createMockNft = (
  address: string,
  tokenId: string,
  isCurrentlyOwned = true,
) => ({
  address,
  tokenId,
  isCurrentlyOwned,
  name: `NFT ${tokenId}`,
  image: `https://example.com/nft-${tokenId}.png`,
});

describe('useOwnedNfts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when no NFTs exist', () => {
    mockUseSelector.mockReturnValue({});

    const { result } = renderHook(() => useOwnedNfts());

    expect(result.current).toEqual([]);
  });

  it('returns owned NFTs from a single chain', () => {
    const ownedNft = createMockNft('0x123', '1', true);
    mockUseSelector.mockReturnValue({
      '0x1': [ownedNft],
    });

    const { result } = renderHook(() => useOwnedNfts());

    expect(result.current).toEqual([ownedNft]);
  });

  it('returns owned NFTs from multiple chains', () => {
    const nft1 = createMockNft('0x123', '1', true);
    const nft2 = createMockNft('0x456', '2', true);
    mockUseSelector.mockReturnValue({
      '0x1': [nft1],
      '0x89': [nft2],
    });

    const { result } = renderHook(() => useOwnedNfts());

    expect(result.current).toHaveLength(2);
    expect(result.current).toContainEqual(nft1);
    expect(result.current).toContainEqual(nft2);
  });

  it('filters out NFTs that are not currently owned', () => {
    const ownedNft = createMockNft('0x123', '1', true);
    const notOwnedNft = createMockNft('0x456', '2', false);
    mockUseSelector.mockReturnValue({
      '0x1': [ownedNft, notOwnedNft],
    });

    const { result } = renderHook(() => useOwnedNfts());

    expect(result.current).toEqual([ownedNft]);
    expect(result.current).not.toContainEqual(notOwnedNft);
  });

  it('returns empty array when all NFTs are not currently owned', () => {
    const notOwned1 = createMockNft('0x123', '1', false);
    const notOwned2 = createMockNft('0x456', '2', false);
    mockUseSelector.mockReturnValue({
      '0x1': [notOwned1, notOwned2],
    });

    const { result } = renderHook(() => useOwnedNfts());

    expect(result.current).toEqual([]);
  });

  it('flattens NFTs from multiple chains correctly', () => {
    const chain1Nfts = [
      createMockNft('0x111', '1', true),
      createMockNft('0x222', '2', true),
    ];
    const chain2Nfts = [
      createMockNft('0x333', '3', true),
      createMockNft('0x444', '4', false), // Not owned, should be filtered
    ];
    mockUseSelector.mockReturnValue({
      '0x1': chain1Nfts,
      '0x89': chain2Nfts,
    });

    const { result } = renderHook(() => useOwnedNfts());

    expect(result.current).toHaveLength(3);
    expect(result.current).toContainEqual(chain1Nfts[0]);
    expect(result.current).toContainEqual(chain1Nfts[1]);
    expect(result.current).toContainEqual(chain2Nfts[0]);
  });
});
