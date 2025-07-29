import { toDataUrl } from './blockies';

describe('Blockies', () => {
  // Test data - common Ethereum addresses and edge cases
  const testAddresses = [
    '0x0000000000000000000000000000000000000000',
    '0x1234567890123456789012345678901234567890',
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
    '0xabcdef1234567890abcdef1234567890abcdef12',
    '0x742d35Cc6634C0532925a3b8D42C96D8FbBBcC3f',
    '0xa0b86991c31cc0f71f528e2fc398875b06a1a9f',
    '0x000000000000000000000000000000000000dead',
    '0xffffffffffffffffffffffffffffffffffffffff',
  ];

  describe('toDataUrl function', () => {
    test('should return consistent results for the same address', () => {
      const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const result1 = toDataUrl(address);
      const result2 = toDataUrl(address);

      expect(result1).toBe(result2);
      expect(result1).toMatch(/^data:image\/png;base64,/);
    });

    test('should return different results for different addresses', () => {
      const address1 = '0x1234567890123456789012345678901234567890';
      const address2 = '0x0987654321098765432109876543210987654321';

      const result1 = toDataUrl(address1);
      const result2 = toDataUrl(address2);

      expect(result1).not.toBe(result2);
      expect(result1).toMatch(/^data:image\/png;base64,/);
      expect(result2).toMatch(/^data:image\/png;base64,/);
    });

    test('should be case insensitive', () => {
      const lowerCase = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
      const upperCase = '0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045';
      const mixedCase = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

      const result1 = toDataUrl(lowerCase);
      const result2 = toDataUrl(upperCase);
      const result3 = toDataUrl(mixedCase);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    test('should return valid base64 data URL format', () => {
      const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const result = toDataUrl(address);

      expect(result).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/);

      // Extract and validate base64 part
      const base64Part = result.split(',')[1];
      expect(base64Part.length % 4).toBe(0); // Valid base64 padding
    });

    test('should produce valid PNG data', () => {
      const address = '0xa0b86991c31cc0f71f528e2fc398875b06a1a9f';
      const result = toDataUrl(address);
      const base64Data = result.split(',')[1];

      // Decode base64 and check PNG signature
      const binaryString = Buffer.from(base64Data, 'base64').toString('binary');
      const pngSignature = '\x89PNG\r\n\x1A\n';

      expect(binaryString.substring(0, 8)).toBe(pngSignature);
    });
  });

  describe('Performance and consistency', () => {
    test('should generate blockies for all test addresses', () => {
      testAddresses.forEach((address) => {
        const result = toDataUrl(address);
        expect(result).toMatch(/^data:image\/png;base64,/);
        expect(result.length).toBeGreaterThan(100); // Reasonable minimum size
      });
    });

    test('should handle generation speed reasonably', () => {
      const address = '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359';
      const startTime = Date.now();

      // Generate multiple blockies
      for (let i = 0; i < 10; i++) {
        toDataUrl(`${address}${i}`);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should generate 10 blockies in reasonable time (less than 1 second)
      expect(totalTime).toBeLessThan(1000);
    });
  });

  describe('Edge cases', () => {
    test('should handle edge case addresses', () => {
      const validEdgeCases = testAddresses.filter(
        (addr) => addr && addr.startsWith('0x') && addr.length === 42,
      );

      validEdgeCases.forEach((address) => {
        expect(() => toDataUrl(address)).not.toThrow();
        const result = toDataUrl(address);
        expect(result).toMatch(/^data:image\/png;base64,/);
      });
    });

    test('should handle zero address', () => {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const result = toDataUrl(zeroAddress);

      expect(result).toMatch(/^data:image\/png;base64,/);
      expect(result).toMatchSnapshot('zero-address-blockies');
    });

    test('should handle max address', () => {
      const maxAddress = '0xffffffffffffffffffffffffffffffffffffffff';
      const result = toDataUrl(maxAddress);

      expect(result).toMatch(/^data:image\/png;base64,/);
      expect(result).toMatchSnapshot('max-address-blockies');
    });
  });

  describe('Snapshots for consistency', () => {
    // Snapshot tests to catch visual regressions
    test('should generate consistent blockies for known addresses', () => {
      const knownAddresses = [
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // Vitalik's address
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed', // Test address
        '0x742d35Cc6634C0532925a3b8D42C96D8FbBBcC3f', // Another test address
        '0x1234567890123456789012345678901234567890', // Simple pattern
      ];

      knownAddresses.forEach((address, index) => {
        const result = toDataUrl(address);
        expect(result).toMatchSnapshot(`blockies-address-${index}`);
      });
    });

    test('should generate consistent blockies for different patterns', () => {
      const patternAddresses = [
        '0x0000000000000000000000000000000000000001', // Mostly zeros
        '0x1111111111111111111111111111111111111111', // All ones
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // All a's
        '0x0123456789abcdef0123456789abcdef01234567', // Sequential hex
        '0xfedcba9876543210fedcba9876543210fedcba98', // Reverse sequential
      ];

      patternAddresses.forEach((address, index) => {
        const result = toDataUrl(address);
        expect(result).toMatchSnapshot(`blockies-pattern-${index}`);
      });
    });
  });

  describe('Data integrity', () => {
    test('should generate PNG with correct dimensions', () => {
      const address = '0xa0b86991c31cc0f71f528e2fc398875b06a1a9f';
      const result = toDataUrl(address);
      const base64Data = result.split(',')[1];
      const binaryString = Buffer.from(base64Data, 'base64').toString('binary');

      // Check PNG IHDR chunk for dimensions (should be 128x128 by default)
      // PNG structure: signature(8) + IHDR length(4) + "IHDR"(4) + width(4) + height(4) + ...
      const widthBytes = binaryString.substring(16, 20);
      const heightBytes = binaryString.substring(20, 24);

      // Convert bytes to integers (big-endian)
      const width =
        (widthBytes.charCodeAt(0) << 24) |
        (widthBytes.charCodeAt(1) << 16) |
        (widthBytes.charCodeAt(2) << 8) |
        widthBytes.charCodeAt(3);
      const height =
        (heightBytes.charCodeAt(0) << 24) |
        (heightBytes.charCodeAt(1) << 16) |
        (heightBytes.charCodeAt(2) << 8) |
        heightBytes.charCodeAt(3);

      expect(width).toBe(128); // 8 * 16 (size * scale)
      expect(height).toBe(128);
    });

    test('should generate different visual patterns', () => {
      const addresses = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
      ];

      const results = addresses.map((addr) => toDataUrl(addr));

      // All results should be different
      expect(results[0]).not.toBe(results[1]);
      expect(results[1]).not.toBe(results[2]);
      expect(results[0]).not.toBe(results[2]);

      // All should be valid PNG data URLs
      results.forEach((result) => {
        expect(result).toMatch(/^data:image\/png;base64,/);
      });
    });
  });
});
