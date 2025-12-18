import {
  isValidWildcardTokenList,
  isTokenInWildcardList,
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

describe('isTokenInWildcardList', () => {
  describe('global wildcard matching', () => {
    it('matches USDC on any chain when global wildcard includes USDC', () => {
      const tokenList: WildcardTokenList = {
        '*': ['USDC'],
      };

      const result = isTokenInWildcardList('USDC', tokenList, '0x1');

      expect(result).toBe(true);
    });

    it('matches USDC on different chain when global wildcard includes USDC', () => {
      const tokenList: WildcardTokenList = {
        '*': ['USDC'],
      };

      const result = isTokenInWildcardList('USDC', tokenList, '0xa4b1');

      expect(result).toBe(true);
    });

    it('does not match USDT when global wildcard only includes USDC', () => {
      const tokenList: WildcardTokenList = {
        '*': ['USDC'],
      };

      const result = isTokenInWildcardList('USDT', tokenList, '0x1');

      expect(result).toBe(false);
    });

    it('matches all tokens when global wildcard includes asterisk', () => {
      const tokenList: WildcardTokenList = {
        '*': ['*'],
      };

      expect(isTokenInWildcardList('USDC', tokenList, '0x1')).toBe(true);
      expect(isTokenInWildcardList('USDT', tokenList, '0x1')).toBe(true);
      expect(isTokenInWildcardList('DAI', tokenList, '0xa4b1')).toBe(true);
    });
  });

  describe('chain-specific wildcard matching', () => {
    it('matches all tokens on specific chain when chain has asterisk', () => {
      const tokenList: WildcardTokenList = {
        '0x1': ['*'],
      };

      expect(isTokenInWildcardList('USDC', tokenList, '0x1')).toBe(true);
      expect(isTokenInWildcardList('USDT', tokenList, '0x1')).toBe(true);
      expect(isTokenInWildcardList('DAI', tokenList, '0x1')).toBe(true);
    });

    it('does not match tokens on other chains when only one chain has wildcard', () => {
      const tokenList: WildcardTokenList = {
        '0x1': ['*'],
      };

      const result = isTokenInWildcardList('USDC', tokenList, '0xa4b1');

      expect(result).toBe(false);
    });
  });

  describe('chain-specific symbol matching', () => {
    it('matches specific symbol on specific chain', () => {
      const tokenList: WildcardTokenList = {
        '0xa4b1': ['USDT', 'DAI'],
      };

      expect(isTokenInWildcardList('USDT', tokenList, '0xa4b1')).toBe(true);
      expect(isTokenInWildcardList('DAI', tokenList, '0xa4b1')).toBe(true);
    });

    it('does not match unlisted symbol on that chain', () => {
      const tokenList: WildcardTokenList = {
        '0xa4b1': ['USDT', 'DAI'],
      };

      const result = isTokenInWildcardList('USDC', tokenList, '0xa4b1');

      expect(result).toBe(false);
    });

    it('does not match listed symbol on different chain', () => {
      const tokenList: WildcardTokenList = {
        '0xa4b1': ['USDT', 'DAI'],
      };

      const result = isTokenInWildcardList('USDT', tokenList, '0x1');

      expect(result).toBe(false);
    });
  });

  describe('combined rules (additive)', () => {
    it('matches USDC globally AND all tokens on mainnet', () => {
      const tokenList: WildcardTokenList = {
        '*': ['USDC'],
        '0x1': ['*'],
      };

      // USDC matched globally
      expect(isTokenInWildcardList('USDC', tokenList, '0xa4b1')).toBe(true);

      // All tokens matched on mainnet
      expect(isTokenInWildcardList('USDT', tokenList, '0x1')).toBe(true);
      expect(isTokenInWildcardList('DAI', tokenList, '0x1')).toBe(true);

      // Non-USDC on non-mainnet is not matched
      expect(isTokenInWildcardList('USDT', tokenList, '0xa4b1')).toBe(false);
    });

    it('handles complex combined list', () => {
      const tokenList: WildcardTokenList = {
        '*': ['USDC'],
        '0x1': ['*'],
        '0xa4b1': ['USDT'],
      };

      // Global USDC match
      expect(isTokenInWildcardList('USDC', tokenList, '0x38')).toBe(true);

      // Mainnet all matched
      expect(isTokenInWildcardList('DAI', tokenList, '0x1')).toBe(true);

      // Arbitrum USDT matched
      expect(isTokenInWildcardList('USDT', tokenList, '0xa4b1')).toBe(true);

      // Arbitrum DAI not matched
      expect(isTokenInWildcardList('DAI', tokenList, '0xa4b1')).toBe(false);
    });
  });

  describe('case-insensitive matching', () => {
    it('matches lowercase symbol against uppercase list', () => {
      const tokenList: WildcardTokenList = {
        '0x1': ['USDC'],
      };

      const result = isTokenInWildcardList('usdc', tokenList, '0x1');

      expect(result).toBe(true);
    });

    it('matches uppercase symbol against lowercase list', () => {
      const tokenList: WildcardTokenList = {
        '0x1': ['usdc'],
      };

      const result = isTokenInWildcardList('USDC', tokenList, '0x1');

      expect(result).toBe(true);
    });

    it('matches mixed case symbol', () => {
      const tokenList: WildcardTokenList = {
        '0x1': ['UsDc'],
      };

      const result = isTokenInWildcardList('uSdC', tokenList, '0x1');

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns false for empty list', () => {
      const result = isTokenInWildcardList('USDC', {}, '0x1');

      expect(result).toBe(false);
    });

    it('returns false when chainId is undefined', () => {
      const tokenList: WildcardTokenList = {
        '*': ['USDC'],
      };

      const result = isTokenInWildcardList('USDC', tokenList, undefined);

      expect(result).toBe(false);
    });

    it('returns false when chainId is empty string', () => {
      const tokenList: WildcardTokenList = {
        '*': ['USDC'],
      };

      const result = isTokenInWildcardList('USDC', tokenList, '');

      expect(result).toBe(false);
    });

    it('returns false when tokenSymbol is empty string', () => {
      const tokenList: WildcardTokenList = {
        '*': ['USDC'],
      };

      const result = isTokenInWildcardList('', tokenList, '0x1');

      expect(result).toBe(false);
    });

    it('uses empty list as default when list is undefined', () => {
      const result = isTokenInWildcardList('USDC', undefined, '0x1');

      expect(result).toBe(false);
    });
  });
});
