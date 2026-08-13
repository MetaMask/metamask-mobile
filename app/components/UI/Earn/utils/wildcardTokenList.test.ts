import {
  isValidWildcardTokenList,
  WildcardTokenList,
} from './wildcardTokenList';

describe('isValidWildcardTokenList', () => {
  describe('valid lists', () => {
    it('returns true for valid list with chain-specific symbols', () => {
      const tokenList: WildcardTokenList = {
        '0x1': ['USDC', 'USDT'],
        '0xa4b1': ['DAI'],
      };

      const result = isValidWildcardTokenList(tokenList);

      expect(result).toBe(true);
    });

    it('returns true for list with global wildcard key', () => {
      const tokenList: WildcardTokenList = {
        '*': ['USDC'],
      };

      const result = isValidWildcardTokenList(tokenList);

      expect(result).toBe(true);
    });

    it('returns true for list with chain wildcard symbol', () => {
      const tokenList: WildcardTokenList = {
        '0x1': ['*'],
      };

      const result = isValidWildcardTokenList(tokenList);

      expect(result).toBe(true);
    });

    it('returns true for combined wildcard list', () => {
      const tokenList: WildcardTokenList = {
        '*': ['USDC'],
        '0x1': ['*'],
        '0xa4b1': ['USDT', 'DAI'],
      };

      const result = isValidWildcardTokenList(tokenList);

      expect(result).toBe(true);
    });

    it('returns true for empty object', () => {
      const result = isValidWildcardTokenList({});

      expect(result).toBe(true);
    });

    it('returns true for object with empty arrays', () => {
      const tokenList: WildcardTokenList = {
        '0x1': [],
      };

      const result = isValidWildcardTokenList(tokenList);

      expect(result).toBe(true);
    });
  });

  describe('invalid lists', () => {
    it('returns false for null', () => {
      const result = isValidWildcardTokenList(null);

      expect(result).toBe(false);
    });

    it('returns false for undefined', () => {
      const result = isValidWildcardTokenList(undefined);

      expect(result).toBe(false);
    });

    it('returns false for arrays', () => {
      const result = isValidWildcardTokenList(['0x1', 'USDC']);

      expect(result).toBe(false);
    });

    it('returns false when values are not arrays', () => {
      const invalidInput = {
        '0x1': 'USDC',
      };

      const result = isValidWildcardTokenList(invalidInput);

      expect(result).toBe(false);
    });

    it('returns false when array elements are not strings', () => {
      const invalidInput = {
        '0x1': [123, 456],
      };

      const result = isValidWildcardTokenList(invalidInput);

      expect(result).toBe(false);
    });

    it('returns false for primitive values', () => {
      expect(isValidWildcardTokenList('string')).toBe(false);
      expect(isValidWildcardTokenList(123)).toBe(false);
      expect(isValidWildcardTokenList(true)).toBe(false);
    });
  });
});
