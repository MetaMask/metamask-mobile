import { getHighestFiatToken } from './getHighestFiatToken';
import { BridgeToken } from '../../Bridge/types';

// Mock token data for testing
const createMockToken = (
  address: string,
  tokenFiatAmount: number | undefined,
  overrides: Partial<BridgeToken> = {},
): BridgeToken => ({
  address,
  decimals: 18,
  image: '',
  name: `Token ${address}`,
  symbol: `TKN${address.slice(-2)}`,
  balance: '1000000000000000000',
  chainId: '0x1',
  tokenFiatAmount,
  ...overrides,
});

describe('getHighestFiatToken', () => {
  const priorityTokenAddress =
    '0x1234567890abcdef1234567890abcdef12345678' as const;

  describe('edge cases', () => {
    it('should return undefined when tokens array is empty', () => {
      const result = getHighestFiatToken([], priorityTokenAddress);
      expect(result).toBeUndefined();
    });

    it('should return undefined when all tokens are filtered out due to priority token', () => {
      const tokens = [
        createMockToken(priorityTokenAddress, 100),
        createMockToken(priorityTokenAddress.toUpperCase(), 200),
      ];

      const result = getHighestFiatToken(tokens, priorityTokenAddress);
      expect(result).toBeUndefined();
    });

    it('should return undefined when only priority token exists (case insensitive)', () => {
      const tokens = [createMockToken(priorityTokenAddress.toUpperCase(), 100)];

      const result = getHighestFiatToken(tokens, priorityTokenAddress);
      expect(result).toBeUndefined();
    });
  });

  describe('priority token filtering', () => {
    it('should filter out priority token from consideration', () => {
      const priorityToken = createMockToken(priorityTokenAddress, 1000);
      const otherToken = createMockToken(
        '0xabcdef1234567890abcdef1234567890abcdef12',
        500,
      );

      const tokens = [priorityToken, otherToken];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      expect(result).toBe(otherToken);
    });

    it('should handle priority token address case insensitively', () => {
      const priorityToken = createMockToken(
        priorityTokenAddress.toUpperCase(),
        1000,
      );
      const otherToken = createMockToken(
        '0xabcdef1234567890abcdef1234567890abcdef12',
        500,
      );

      const tokens = [priorityToken, otherToken];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      expect(result).toBe(otherToken);
    });
  });

  describe('fiat amount comparison', () => {
    it('should return token with highest fiat amount', () => {
      const token1 = createMockToken(
        '0xtoken1000000000000000000000000000000000000',
        100,
      );
      const token2 = createMockToken(
        '0xtoken2000000000000000000000000000000000000',
        500,
      );
      const token3 = createMockToken(
        '0xtoken3000000000000000000000000000000000000',
        300,
      );

      const tokens = [token1, token2, token3];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      expect(result).toBe(token2);
    });

    it('should handle tokens with undefined fiat amounts as 0', () => {
      const tokenWithUndefined = createMockToken(
        '0xtoken1000000000000000000000000000000000000',
        undefined,
      );
      const tokenWithValue = createMockToken(
        '0xtoken2000000000000000000000000000000000000',
        100,
      );

      const tokens = [tokenWithUndefined, tokenWithValue];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      expect(result).toBe(tokenWithValue);
    });

    it('should handle all tokens with undefined fiat amounts', () => {
      const token1 = createMockToken(
        '0xtoken1000000000000000000000000000000000000',
        undefined,
      );
      const token2 = createMockToken(
        '0xtoken2000000000000000000000000000000000000',
        undefined,
      );

      const tokens = [token1, token2];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      // Should return undefined when all tokens have undefined/0 fiat amounts
      // because the reduce starts with undefined and no token has > 0 fiat amount
      expect(result).toBeUndefined();
    });

    it('should handle tokens with zero fiat amounts', () => {
      const token1 = createMockToken(
        '0xtoken1000000000000000000000000000000000000',
        0,
      );
      const token2 = createMockToken(
        '0xtoken2000000000000000000000000000000000000',
        100,
      );

      const tokens = [token1, token2];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      expect(result).toBe(token2);
    });

    it('should return null when all tokens have zero fiat amounts', () => {
      const token1 = createMockToken(
        '0xtoken1000000000000000000000000000000000000',
        0,
      );
      const token2 = createMockToken(
        '0xtoken2000000000000000000000000000000000000',
        0,
      );

      const tokens = [token1, token2];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      // Should return undefined when all tokens have zero fiat amounts
      expect(result).toBeUndefined();
    });

    it('should handle negative fiat amounts', () => {
      const token1 = createMockToken(
        '0xtoken1000000000000000000000000000000000000',
        -50,
      );
      const token2 = createMockToken(
        '0xtoken2000000000000000000000000000000000000',
        100,
      );
      const token3 = createMockToken(
        '0xtoken3000000000000000000000000000000000000',
        -10,
      );

      const tokens = [token1, token2, token3];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      expect(result).toBe(token2);
    });

    it('should return first token when multiple tokens have same highest fiat amount', () => {
      const token1 = createMockToken(
        '0xtoken1000000000000000000000000000000000000',
        100,
      );
      const token2 = createMockToken(
        '0xtoken2000000000000000000000000000000000000',
        100,
      );
      const token3 = createMockToken(
        '0xtoken3000000000000000000000000000000000000',
        50,
      );

      const tokens = [token1, token2, token3];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      expect(result).toBe(token1);
    });
  });

  describe('complex scenarios', () => {
    it('should work with mix of undefined, zero, positive, and negative fiat amounts', () => {
      const tokenUndefined = createMockToken(
        '0xtoken1000000000000000000000000000000000000',
        undefined,
      );
      const tokenZero = createMockToken(
        '0xtoken2000000000000000000000000000000000000',
        0,
      );
      const tokenNegative = createMockToken(
        '0xtoken3000000000000000000000000000000000000',
        -25,
      );
      const tokenPositive = createMockToken(
        '0xtoken4000000000000000000000000000000000000',
        150,
      );
      const priorityToken = createMockToken(priorityTokenAddress, 1000);

      const tokens = [
        tokenUndefined,
        tokenZero,
        tokenNegative,
        tokenPositive,
        priorityToken,
      ];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      expect(result).toBe(tokenPositive);
    });

    it('should maintain token properties in returned result', () => {
      const token = createMockToken(
        '0xtoken1000000000000000000000000000000000000',
        100,
        {
          name: 'Test Token',
          symbol: 'TEST',
          decimals: 6,
        },
      );

      const tokens = [token];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      expect(result).toBe(token);
      expect(result?.name).toBe('Test Token');
      expect(result?.symbol).toBe('TEST');
      expect(result?.decimals).toBe(6);
    });

    it('should work with large fiat amounts', () => {
      const token1 = createMockToken(
        '0xtoken1000000000000000000000000000000000000',
        999999999.99,
      );
      const token2 = createMockToken(
        '0xtoken2000000000000000000000000000000000000',
        1000000000,
      );

      const tokens = [token1, token2];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      expect(result).toBe(token2);
    });

    it('should work with very small fiat amounts', () => {
      const token1 = createMockToken(
        '0xtoken1000000000000000000000000000000000000',
        0.000001,
      );
      const token2 = createMockToken(
        '0xtoken2000000000000000000000000000000000000',
        0.000002,
      );

      const tokens = [token1, token2];
      const result = getHighestFiatToken(tokens, priorityTokenAddress);

      expect(result).toBe(token2);
    });
  });
});
