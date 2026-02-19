import { renderHook } from '@testing-library/react-hooks';
import useHasNfts from './useHasNfts';
import useOwnedNfts from './useOwnedNfts';

jest.mock('./useOwnedNfts');

const mockUseOwnedNfts = useOwnedNfts as jest.MockedFunction<
  typeof useOwnedNfts
>;

const createMockNft = (address: string, tokenId: string) => ({
  address,
  tokenId,
  isCurrentlyOwned: true,
  name: `NFT ${tokenId}`,
  image: `https://example.com/nft-${tokenId}.png`,
});

describe('useHasNfts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when user has no NFTs', () => {
    mockUseOwnedNfts.mockReturnValue([]);

    const { result } = renderHook(() => useHasNfts());

    expect(result.current).toBe(false);
  });

  it('returns true when user has one NFT', () => {
    mockUseOwnedNfts.mockReturnValue([createMockNft('0x123', '1')] as never);

    const { result } = renderHook(() => useHasNfts());

    expect(result.current).toBe(true);
  });

  it('returns true when user has multiple NFTs', () => {
    mockUseOwnedNfts.mockReturnValue([
      createMockNft('0x123', '1'),
      createMockNft('0x456', '2'),
      createMockNft('0x789', '3'),
    ] as never);

    const { result } = renderHook(() => useHasNfts());

    expect(result.current).toBe(true);
  });
});
