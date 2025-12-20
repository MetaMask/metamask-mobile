import {
  isValidWildcardTokenList,
  isTokenInWildcardList,
  isTokenAllowed,
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

describe('isTokenAllowed', () => {
  describe('allowlist-only scenarios', () => {
    it('allows token when in allowlist', () => {
      const allowlist: WildcardTokenList = {
        '0x1': ['USDC', 'USDT', 'DAI'],
      };

      const result = isTokenAllowed('USDC', allowlist, {}, '0x1');

      expect(result).toBe(true);
    });

    it('rejects token when not in allowlist', () => {
      const allowlist: WildcardTokenList = {
        '0x1': ['USDC', 'USDT', 'DAI'],
      };

      const result = isTokenAllowed('WBTC', allowlist, {}, '0x1');

      expect(result).toBe(false);
    });

    it('allows all tokens when allowlist is empty', () => {
      const result = isTokenAllowed('WBTC', {}, {}, '0x1');

      expect(result).toBe(true);
    });

    it('allows token when allowlist uses chain wildcard', () => {
      const allowlist: WildcardTokenList = {
        '0x1': ['*'],
      };

      expect(isTokenAllowed('USDC', allowlist, {}, '0x1')).toBe(true);
      expect(isTokenAllowed('WBTC', allowlist, {}, '0x1')).toBe(true);
    });

    it('allows token when allowlist uses global wildcard', () => {
      const allowlist: WildcardTokenList = {
        '*': ['*'],
      };

      expect(isTokenAllowed('USDC', allowlist, {}, '0x1')).toBe(true);
      expect(isTokenAllowed('WBTC', allowlist, {}, '0xa4b1')).toBe(true);
    });

    it('rejects token on wrong chain even when in allowlist for other chain', () => {
      const allowlist: WildcardTokenList = {
        '0x1': ['USDC'],
      };

      const result = isTokenAllowed('USDC', allowlist, {}, '0xa4b1');

      expect(result).toBe(false);
    });
  });

  describe('blocklist-only scenarios', () => {
    it('rejects token when in blocklist', () => {
      const blocklist: WildcardTokenList = {
        '*': ['TUSD'],
      };

      const result = isTokenAllowed('TUSD', {}, blocklist, '0x1');

      expect(result).toBe(false);
    });

    it('allows token when not in blocklist', () => {
      const blocklist: WildcardTokenList = {
        '*': ['TUSD'],
      };

      const result = isTokenAllowed('USDC', {}, blocklist, '0x1');

      expect(result).toBe(true);
    });

    it('allows all tokens when blocklist is empty', () => {
      const result = isTokenAllowed('TUSD', {}, {}, '0x1');

      expect(result).toBe(true);
    });

    it('rejects all tokens on chain when blocklist uses chain wildcard', () => {
      const blocklist: WildcardTokenList = {
        '0x1': ['*'],
      };

      expect(isTokenAllowed('USDC', {}, blocklist, '0x1')).toBe(false);
      expect(isTokenAllowed('WBTC', {}, blocklist, '0x1')).toBe(false);
    });

    it('allows tokens on other chains when only one chain is blocklisted', () => {
      const blocklist: WildcardTokenList = {
        '0x1': ['*'],
      };

      const result = isTokenAllowed('USDC', {}, blocklist, '0xa4b1');

      expect(result).toBe(true);
    });
  });

  describe('combined allowlist + blocklist scenarios', () => {
    it('rejects token in allowlist when also in blocklist', () => {
      const allowlist: WildcardTokenList = {
        '0x1': ['USDC', 'USDT', 'DAI'],
      };
      const blocklist: WildcardTokenList = {
        '*': ['USDT'],
      };

      expect(isTokenAllowed('USDC', allowlist, blocklist, '0x1')).toBe(true);
      expect(isTokenAllowed('USDT', allowlist, blocklist, '0x1')).toBe(false);
      expect(isTokenAllowed('DAI', allowlist, blocklist, '0x1')).toBe(true);
    });

    it('rejects token not in allowlist even if not in blocklist', () => {
      const allowlist: WildcardTokenList = {
        '0x1': ['USDC', 'USDT'],
      };
      const blocklist: WildcardTokenList = {
        '*': ['TUSD'],
      };

      const result = isTokenAllowed('WBTC', allowlist, blocklist, '0x1');

      expect(result).toBe(false);
    });

    it('allows all tokens except blocklisted when allowlist allows all', () => {
      const allowlist: WildcardTokenList = {
        '*': ['*'],
      };
      const blocklist: WildcardTokenList = {
        '*': ['TUSD'],
      };

      expect(isTokenAllowed('USDC', allowlist, blocklist, '0x1')).toBe(true);
      expect(isTokenAllowed('TUSD', allowlist, blocklist, '0x1')).toBe(false);
      expect(isTokenAllowed('WBTC', allowlist, blocklist, '0xa4b1')).toBe(true);
    });

    it('handles chain-specific allowlist with global blocklist', () => {
      const allowlist: WildcardTokenList = {
        '0x1': ['USDC', 'USDT', 'DAI'],
        '0xe708': ['USDC', 'USDT'],
      };
      const blocklist: WildcardTokenList = {
        '*': ['USDT'],
      };

      // Mainnet: USDC allowed, USDT blocked, DAI allowed
      expect(isTokenAllowed('USDC', allowlist, blocklist, '0x1')).toBe(true);
      expect(isTokenAllowed('USDT', allowlist, blocklist, '0x1')).toBe(false);
      expect(isTokenAllowed('DAI', allowlist, blocklist, '0x1')).toBe(true);

      // Linea: USDC allowed, USDT blocked
      expect(isTokenAllowed('USDC', allowlist, blocklist, '0xe708')).toBe(true);
      expect(isTokenAllowed('USDT', allowlist, blocklist, '0xe708')).toBe(
        false,
      );

      // Other chains: nothing allowed (not in allowlist)
      expect(isTokenAllowed('USDC', allowlist, blocklist, '0xa4b1')).toBe(
        false,
      );
    });

    it('handles PM requirement: specific tokens on specific chains', () => {
      const allowlist: WildcardTokenList = {
        '0x1': ['USDC', 'USDT', 'DAI'],
        '0xe708': ['USDC', 'USDT'],
      };
      const blocklist: WildcardTokenList = {};

      // Mainnet: all three allowed
      expect(isTokenAllowed('USDC', allowlist, blocklist, '0x1')).toBe(true);
      expect(isTokenAllowed('USDT', allowlist, blocklist, '0x1')).toBe(true);
      expect(isTokenAllowed('DAI', allowlist, blocklist, '0x1')).toBe(true);
      expect(isTokenAllowed('WBTC', allowlist, blocklist, '0x1')).toBe(false);

      // Linea: only USDC and USDT
      expect(isTokenAllowed('USDC', allowlist, blocklist, '0xe708')).toBe(true);
      expect(isTokenAllowed('USDT', allowlist, blocklist, '0xe708')).toBe(true);
      expect(isTokenAllowed('DAI', allowlist, blocklist, '0xe708')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false when chainId is undefined', () => {
      const result = isTokenAllowed('USDC', {}, {}, undefined);

      expect(result).toBe(false);
    });

    it('returns false when chainId is empty string', () => {
      const result = isTokenAllowed('USDC', {}, {}, '');

      expect(result).toBe(false);
    });

    it('returns false when tokenSymbol is empty string', () => {
      const result = isTokenAllowed('', {}, {}, '0x1');

      expect(result).toBe(false);
    });

    it('uses empty lists as defaults when undefined', () => {
      const result = isTokenAllowed('USDC', undefined, undefined, '0x1');

      expect(result).toBe(true);
    });

    it('performs case-insensitive matching', () => {
      const allowlist: WildcardTokenList = {
        '0x1': ['USDC'],
      };

      expect(isTokenAllowed('usdc', allowlist, {}, '0x1')).toBe(true);
      expect(isTokenAllowed('Usdc', allowlist, {}, '0x1')).toBe(true);
    });
  });
});
