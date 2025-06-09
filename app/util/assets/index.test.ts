import { Nft } from '@metamask/assets-controllers';
import {
  compareNftStates,
  formatWithThreshold,
  prepareNftDetectionEvents,
} from '.';
import { Hex } from '@metamask/utils';

describe('formatWithThreshold', () => {
  const enUSCurrencyOptions = { style: 'currency', currency: 'USD' } as const;
  const enEUCurrencyOptions = { style: 'currency', currency: 'EUR' } as const;
  const jpYenCurrencyOptions = { style: 'currency', currency: 'JPY' } as const;
  const numberOptions = { maximumFractionDigits: 2 };

  const cryptoOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
  };

  test('returns an empty string when amount is null', () => {
    expect(formatWithThreshold(null, 10, 'en-US', enUSCurrencyOptions)).toBe(
      '',
    );
  });

  test('formats zero correctly in en-US currency format', () => {
    expect(formatWithThreshold(0, 10, 'en-US', enUSCurrencyOptions)).toBe(
      '$0.00',
    );
  });

  test('ensures USD currency format does not result in 1 decimal place', () => {
    expect(formatWithThreshold(5.1, 0, 'en-US', enUSCurrencyOptions)).toBe(
      '$5.10',
    );
  });

  test('formats amount below threshold correctly with "<" notation', () => {
    expect(formatWithThreshold(5, 10, 'en-US', enUSCurrencyOptions)).toBe(
      '<$10.00',
    );
  });

  test('formats amount above threshold correctly', () => {
    expect(formatWithThreshold(15, 10, 'en-US', enUSCurrencyOptions)).toBe(
      '$15.00',
    );
  });

  test('supports EUR formatting correctly', () => {
    expect(formatWithThreshold(5, 10, 'de-DE', enEUCurrencyOptions)).toBe(
      '<10,00\xa0€',
    );
  });

  test('supports JPY formatting correctly (no decimal places)', () => {
    expect(formatWithThreshold(100, 500, 'ja-JP', jpYenCurrencyOptions)).toBe(
      '<￥500',
    );
  });

  test('formats correctly when the threshold is exactly the same as the amount', () => {
    expect(formatWithThreshold(10, 10, 'en-US', enUSCurrencyOptions)).toBe(
      '$10.00',
    );
  });

  test('handles high precision numbers correctly with currency format', () => {
    expect(
      formatWithThreshold(1234.567, 1000, 'en-US', enUSCurrencyOptions),
    ).toBe('$1,234.57');
  });

  test('handles different locale number formatting without currency', () => {
    expect(formatWithThreshold(1234.56, 1000, 'fr-FR', numberOptions)).toBe(
      '1\u202f234,56',
    );
  });

  // Crypto-specific tests
  test('formats ETH correctly when below threshold', () => {
    expect(formatWithThreshold(0.000009, 0.00001, 'en-US', cryptoOptions)).toBe(
      '<0.00001',
    );
  });

  test('formats ETH correctly when above threshold', () => {
    expect(formatWithThreshold(0.005432, 0.00001, 'en-US', cryptoOptions)).toBe(
      '0.00543',
    );
  });

  test('formats SOL correctly when below threshold', () => {
    expect(formatWithThreshold(0.000009, 0.00001, 'en-US', cryptoOptions)).toBe(
      '<0.00001',
    );
  });

  test('formats SOL correctly when above threshold', () => {
    expect(formatWithThreshold(1.234567, 0.00001, 'en-US', cryptoOptions)).toBe(
      '1.23457',
    );
  });

  test('formats BTC correctly when below threshold', () => {
    expect(
      formatWithThreshold(0.0000009, 0.00001, 'en-US', cryptoOptions),
    ).toBe('<0.00001');
  });

  test('formats BTC correctly when above threshold', () => {
    expect(formatWithThreshold(0.012345, 0.00001, 'en-US', cryptoOptions)).toBe(
      '0.01235',
    );
  });
});

describe('NFT State Comparison Utils', () => {
  const mockNft1: Nft = {
    address: '0x123',
    tokenId: '1',
    name: 'NFT 1',
    description: 'Test NFT 1',
    standard: 'ERC721',
    image: 'image1.jpg',
  };

  const mockNft2: Nft = {
    address: '0x456',
    tokenId: '2',
    name: 'NFT 2',
    description: 'Test NFT 2',
    image: 'image2.jpg',
    standard: 'ERC721',
  };

  const mockNft3: Nft = {
    address: '0x123',
    tokenId: '1', // Same as mockNft1
    name: 'NFT 1 Updated',
    description: 'Updated Test NFT 1',
    image: 'image1_updated.jpg',
    standard: 'ERC721',
  };

  describe('compareNftStates', () => {
    it('should return empty array when newState is undefined', () => {
      const result = compareNftStates({}, undefined);
      expect(result).toEqual([]);
    });

    it('should return all NFTs as new when previousState is undefined', () => {
      const newState = {
        '0x1': [mockNft1],
      };
      const result = compareNftStates(undefined, newState);
      expect(result).toEqual([mockNft1]);
    });

    it('should detect new NFTs across different chains', () => {
      const previousState = {
        '0x1': [mockNft1],
      };
      const newState = {
        '0x1': [mockNft1],
        '0x2': [mockNft2],
      };
      const result = compareNftStates(previousState, newState);
      expect(result).toEqual([mockNft2]);
    });

    it('should not detect NFTs with same address and tokenId as new', () => {
      const previousState = {
        '0x1': [mockNft1],
      };
      const newState = {
        '0x1': [mockNft3], // Same address and tokenId as mockNft1, but different metadata
      };
      const result = compareNftStates(previousState, newState);
      expect(result).toEqual([]);
    });

    it('should handle empty chains', () => {
      const previousState = {
        '0x1': [],
      };
      const newState = {
        '0x1': [mockNft1],
      };
      const result = compareNftStates(previousState, newState);
      expect(result).toEqual([mockNft1]);
    });

    it('should handle multiple new NFTs in same chain', () => {
      const previousState = {
        '0x1': [mockNft1],
      };
      const newState = {
        '0x1': [mockNft1, mockNft2],
      };
      const result = compareNftStates(previousState, newState);
      expect(result).toEqual([mockNft2]);
    });

    it('should handle empty states', () => {
      const previousState = {};
      const newState = {};
      const result = compareNftStates(previousState, newState);
      expect(result).toEqual([]);
    });
  });

  describe('prepareNftDetectionEvents', () => {
    const chainId1 = '0x1' as Hex;
    const chainId2 = '0x2' as Hex;

    const mockParamBuilder = jest.fn().mockImplementation(() => ({
      chain_id: 1,
      source: 'detected' as const,
    }));

    it('should return empty array when states are equal', () => {
      const state = {
        [chainId1]: [mockNft1],
      };

      const result = prepareNftDetectionEvents(state, state, mockParamBuilder);
      expect(result).toEqual([]);
    });

    it('should detect new NFTs and prepare analytics params', () => {
      const previousState = {
        [chainId1]: [mockNft1],
      };

      const newState = {
        [chainId1]: [mockNft1, mockNft2],
        [chainId2]: [mockNft1],
      };

      const result = prepareNftDetectionEvents(
        previousState,
        newState,
        mockParamBuilder,
      );
      expect(result).toEqual([
        { chain_id: 1, source: 'detected' },
        { chain_id: 1, source: 'detected' },
      ]);
    });

    it('should handle undefined states', () => {
      const result = prepareNftDetectionEvents(
        undefined,
        undefined,
        mockParamBuilder,
      );
      expect(result).toEqual([]);
    });

    it('should filter out NFTs where paramBuilder returns undefined', () => {
      const selectiveParamBuilder = (nft: Nft) =>
        nft.address === '0x123'
          ? undefined
          : { chain_id: 1, source: 'detected' as const };

      const previousState = {
        [chainId1]: [mockNft1],
      };

      const newState = {
        [chainId1]: [mockNft1, mockNft2],
      };

      const result = prepareNftDetectionEvents(
        previousState,
        newState,
        selectiveParamBuilder,
      );
      expect(result).toEqual([{ chain_id: 1, source: 'detected' }]);
    });
  });
});
