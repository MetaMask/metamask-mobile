import { Nft } from '@metamask/assets-controllers';
import { compareNftStates, formatWithThreshold } from '.';

// describe('formatWithThreshold', () => {
//   const enUSCurrencyOptions = { style: 'currency', currency: 'USD' };
//   const enEUCurrencyOptions = { style: 'currency', currency: 'EUR' };
//   const jpYenCurrencyOptions = { style: 'currency', currency: 'JPY' };
//   const numberOptions = { maximumFractionDigits: 2 };

//   const cryptoOptions = {
//     minimumFractionDigits: 0,
//     maximumFractionDigits: 5,
//   };

//   test('returns an empty string when amount is null', () => {
//     expect(formatWithThreshold(null, 10, 'en-US', enUSCurrencyOptions)).toBe(
//       '',
//     );
//   });

//   test('formats zero correctly in en-US currency format', () => {
//     expect(formatWithThreshold(0, 10, 'en-US', enUSCurrencyOptions)).toBe(
//       '$0.00',
//     );
//   });

//   test('ensures USD currency format does not result in 1 decimal place', () => {
//     expect(formatWithThreshold(5.1, 0, 'en-US', enUSCurrencyOptions)).toBe(
//       '$5.10',
//     );
//   });

//   test('formats amount below threshold correctly with "<" notation', () => {
//     expect(formatWithThreshold(5, 10, 'en-US', enUSCurrencyOptions)).toBe(
//       '<$10.00',
//     );
//   });

//   test('formats amount above threshold correctly', () => {
//     expect(formatWithThreshold(15, 10, 'en-US', enUSCurrencyOptions)).toBe(
//       '$15.00',
//     );
//   });

//   test('supports EUR formatting correctly', () => {
//     expect(formatWithThreshold(5, 10, 'de-DE', enEUCurrencyOptions)).toBe(
//       '<10,00\xa0€',
//     );
//   });

//   test('supports JPY formatting correctly (no decimal places)', () => {
//     expect(formatWithThreshold(100, 500, 'ja-JP', jpYenCurrencyOptions)).toBe(
//       '<￥500',
//     );
//   });

//   test('formats correctly when the threshold is exactly the same as the amount', () => {
//     expect(formatWithThreshold(10, 10, 'en-US', enUSCurrencyOptions)).toBe(
//       '$10.00',
//     );
//   });

//   test('handles high precision numbers correctly with currency format', () => {
//     expect(
//       formatWithThreshold(1234.567, 1000, 'en-US', enUSCurrencyOptions),
//     ).toBe('$1,234.57');
//   });

//   test('handles different locale number formatting without currency', () => {
//     expect(formatWithThreshold(1234.56, 1000, 'fr-FR', numberOptions)).toBe(
//       '1\u202f234,56',
//     );
//   });

//   // Crypto-specific tests
//   test('formats ETH correctly when below threshold', () => {
//     expect(formatWithThreshold(0.000009, 0.00001, 'en-US', cryptoOptions)).toBe(
//       '<0.00001',
//     );
//   });

//   test('formats ETH correctly when above threshold', () => {
//     expect(formatWithThreshold(0.005432, 0.00001, 'en-US', cryptoOptions)).toBe(
//       '0.00543',
//     );
//   });

//   test('formats SOL correctly when below threshold', () => {
//     expect(formatWithThreshold(0.000009, 0.00001, 'en-US', cryptoOptions)).toBe(
//       '<0.00001',
//     );
//   });

//   test('formats SOL correctly when above threshold', () => {
//     expect(formatWithThreshold(1.234567, 0.00001, 'en-US', cryptoOptions)).toBe(
//       '1.23457',
//     );
//   });

//   test('formats BTC correctly when below threshold', () => {
//     expect(
//       formatWithThreshold(0.0000009, 0.00001, 'en-US', cryptoOptions),
//     ).toBe('<0.00001');
//   });

//   test('formats BTC correctly when above threshold', () => {
//     expect(formatWithThreshold(0.012345, 0.00001, 'en-US', cryptoOptions)).toBe(
//       '0.01235',
//     );
//   });
// });

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
});
