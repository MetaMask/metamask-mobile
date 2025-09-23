import { renderHook, act } from '@testing-library/react-hooks';

import { AssetType, Nft } from '../../types/token';
import { useTokenSearch } from './useTokenSearch';

const mockTokens: AssetType[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    balance: '100',
    chainId: '0x1',
    name: 'Ethereum',
    symbol: 'ETH',
    isNative: true,
  },
  {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    balance: '50',
    chainId: '0x1',
    name: 'USD Coin',
    symbol: 'USDC',
    isNative: false,
  },
  {
    address: '0x9876543210987654321098765432109876543210',
    balance: '200',
    chainId: '0x1',
    name: 'Tether USD',
    symbol: 'USDT',
    isNative: false,
  },
] as AssetType[];

const mockNfts: Nft[] = [
  {
    address: '0x1111111111111111111111111111111111111111',
    standard: 'ERC721',
    name: 'Bored Ape #1',
    collectionName: 'Bored Ape Yacht Club',
    chainId: '0x1',
    tokenId: '1',
    accountId: 'account1',
    networkBadgeSource: { uri: 'image1.png' },
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    standard: 'ERC721',
    name: 'CryptoPunk #1000',
    collectionName: 'CryptoPunks',
    chainId: '0x1',
    tokenId: '1000',
    accountId: 'account1',
    networkBadgeSource: { uri: 'image2.png' },
    type: 'nft',
  },
  {
    address: '0x3333333333333333333333333333333333333333',
    standard: 'ERC1155',
    name: 'Art Piece #5',
    collectionName: 'Digital Art Collection',
    chainId: '0x89',
    tokenId: '5',
    accountId: 'account1',
    networkBadgeSource: { uri: 'image3.png' },
  },
  {
    address: '0x4444444444444444444444444444444444444444',
    standard: 'ERC721',
    name: 'Ape Avatar #200',
    collectionName: 'Ape Avatars',
    chainId: '0x89',
    tokenId: '200',
    accountId: 'account1',
    networkBadgeSource: { uri: 'image4.png' },
  },
] as Nft[];

describe('useTokenSearch', () => {
  it('return all tokens when search query is empty', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens, []));

    expect(result.current.filteredTokens).toEqual(mockTokens);
    expect(result.current.searchQuery).toBe('');
  });

  it('filter tokens by symbol (case insensitive)', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens, []));

    act(() => {
      result.current.setSearchQuery('usdc');
    });

    expect(result.current.filteredTokens).toHaveLength(1);
    expect(result.current.filteredTokens[0].symbol).toBe('USDC');
  });

  it('filter tokens by name (case insensitive)', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens, []));

    act(() => {
      result.current.setSearchQuery('ethereum');
    });

    expect(result.current.filteredTokens).toHaveLength(1);
    expect(result.current.filteredTokens[0].name).toBe('Ethereum');
  });

  it('filter tokens by address (case insensitive)', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens, []));

    act(() => {
      result.current.setSearchQuery(
        '0x1234567890123456789012345678901234567890',
      );
    });

    expect(result.current.filteredTokens).toHaveLength(1);
    expect(result.current.filteredTokens[0].address).toBe(
      '0x1234567890123456789012345678901234567890',
    );
  });

  it('filter tokens by partial address', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens, []));

    act(() => {
      result.current.setSearchQuery('123456');
    });

    expect(result.current.filteredTokens).toHaveLength(1);
    expect(result.current.filteredTokens[0].address).toBe(
      '0x1234567890123456789012345678901234567890',
    );
  });

  it('return multiple tokens when search matches multiple criteria', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens, []));

    act(() => {
      result.current.setSearchQuery('USD');
    });

    expect(result.current.filteredTokens).toHaveLength(2);
    expect(result.current.filteredTokens.map((t) => t.symbol)).toEqual([
      'USDC',
      'USDT',
    ]);
  });

  it('handle whitespace in search query', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens, []));

    act(() => {
      result.current.setSearchQuery('  usdc  ');
    });

    expect(result.current.filteredTokens).toHaveLength(1);
    expect(result.current.filteredTokens[0].symbol).toBe('USDC');
  });

  it('return empty array when no tokens match', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens, []));

    act(() => {
      result.current.setSearchQuery('nonexistent');
    });

    expect(result.current.filteredTokens).toHaveLength(0);
  });

  it('clear search when clearSearch is called', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens, []));

    act(() => {
      result.current.setSearchQuery('usdc');
    });

    expect(result.current.searchQuery).toBe('usdc');
    expect(result.current.filteredTokens).toHaveLength(1);

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.filteredTokens).toEqual(mockTokens);
  });

  it('handle empty tokens array', () => {
    const { result } = renderHook(() => useTokenSearch([], []));

    expect(result.current.filteredTokens).toEqual([]);

    act(() => {
      result.current.setSearchQuery('eth');
    });

    expect(result.current.filteredTokens).toEqual([]);
  });

  it('search for "eth" matches both ETH symbol and Tether USD name', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens, []));

    act(() => {
      result.current.setSearchQuery('eth');
    });

    expect(result.current.filteredTokens).toHaveLength(2);
    expect(result.current.filteredTokens.map((t) => t.symbol)).toEqual([
      'ETH',
      'USDT',
    ]);
  });

  describe('filteredNfts', () => {
    it('return all NFTs when search query is empty and no network filter', () => {
      const { result } = renderHook(() => useTokenSearch([], mockNfts));

      expect(result.current.filteredNfts).toEqual(mockNfts);
    });

    it('return all NFTs when search query is empty and network filter is "all"', () => {
      const { result } = renderHook(() => useTokenSearch([], mockNfts, 'all'));

      expect(result.current.filteredNfts).toEqual(mockNfts);
    });

    it('filter NFTs by chainId when network filter is specified', () => {
      const { result } = renderHook(() => useTokenSearch([], mockNfts, '0x1'));

      expect(result.current.filteredNfts).toHaveLength(2);
      expect(
        result.current.filteredNfts.every((nft) => nft.chainId === '0x1'),
      ).toBe(true);
    });

    it('filter NFTs by name (case insensitive)', () => {
      const { result } = renderHook(() => useTokenSearch([], mockNfts));

      act(() => {
        result.current.setSearchQuery('bored ape');
      });

      expect(result.current.filteredNfts).toHaveLength(1);
      expect(result.current.filteredNfts[0].name).toBe('Bored Ape #1');
    });

    it('filter NFTs by collection name (case insensitive)', () => {
      const { result } = renderHook(() => useTokenSearch([], mockNfts));

      act(() => {
        result.current.setSearchQuery('cryptopunks');
      });

      expect(result.current.filteredNfts).toHaveLength(1);
      expect(result.current.filteredNfts[0].collectionName).toBe('CryptoPunks');
    });

    it('filter NFTs by partial name match', () => {
      const { result } = renderHook(() => useTokenSearch([], mockNfts));

      act(() => {
        result.current.setSearchQuery('ape');
      });

      expect(result.current.filteredNfts).toHaveLength(2);
      expect(result.current.filteredNfts.map((nft) => nft.name)).toEqual([
        'Bored Ape #1',
        'Ape Avatar #200',
      ]);
    });

    it('combine network filter and search query', () => {
      const { result } = renderHook(() => useTokenSearch([], mockNfts, '0x89'));

      act(() => {
        result.current.setSearchQuery('ape');
      });

      expect(result.current.filteredNfts).toHaveLength(1);
      expect(
        result.current.filteredNfts.every((nft) => nft.chainId === '0x89'),
      ).toBe(true);
      expect(result.current.filteredNfts.map((nft) => nft.name)).toEqual([
        'Ape Avatar #200',
      ]);
    });

    it('return empty array when no NFTs match search query', () => {
      const { result } = renderHook(() => useTokenSearch([], mockNfts));

      act(() => {
        result.current.setSearchQuery('nonexistent');
      });

      expect(result.current.filteredNfts).toHaveLength(0);
    });

    it('return empty array when no NFTs match network filter', () => {
      const { result } = renderHook(() => useTokenSearch([], mockNfts, '0x99'));

      expect(result.current.filteredNfts).toHaveLength(0);
    });

    it('handle whitespace in NFT search query', () => {
      const { result } = renderHook(() => useTokenSearch([], mockNfts));

      act(() => {
        result.current.setSearchQuery('  bored ape  ');
      });

      expect(result.current.filteredNfts).toHaveLength(1);
      expect(result.current.filteredNfts[0].name).toBe('Bored Ape #1');
    });

    it('clear search resets NFT filtering but keeps network filter', () => {
      const { result } = renderHook(() => useTokenSearch([], mockNfts, '0x1'));

      act(() => {
        result.current.setSearchQuery('bored');
      });

      expect(result.current.filteredNfts).toHaveLength(1);

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.filteredNfts).toHaveLength(2);
      expect(
        result.current.filteredNfts.every((nft) => nft.chainId === '0x1'),
      ).toBe(true);
    });

    it('handle empty NFTs array', () => {
      const { result } = renderHook(() => useTokenSearch([], []));

      expect(result.current.filteredNfts).toEqual([]);

      act(() => {
        result.current.setSearchQuery('test');
      });

      expect(result.current.filteredNfts).toEqual([]);
    });

    it('filter NFTs with undefined name and collectionName', () => {
      const nftsWithMissingData: Nft[] = [
        {
          address: '0x5555555555555555555555555555555555555555',
          standard: 'ERC721',
          chainId: '0x1',
          tokenId: '999',
          accountId: 'account1',
          networkBadgeSource: { uri: 'image5.png' },
        },
      ];

      const { result } = renderHook(() =>
        useTokenSearch([], nftsWithMissingData),
      );

      act(() => {
        result.current.setSearchQuery('test');
      });

      expect(result.current.filteredNfts).toHaveLength(0);
    });
  });
});
