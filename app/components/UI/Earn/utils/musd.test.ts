import { Hex } from '@metamask/utils';
import {
  isValidPaymentTokenMap,
  convertSymbolAllowlistToAddresses,
  isMusdConversionPaymentToken,
  isValidWildcardBlocklist,
  isMusdConversionPaymentTokenBlocked,
  WildcardBlocklist,
} from './musd';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import { CONVERTIBLE_STABLECOINS_BY_CHAIN } from '../constants/musd';

describe('convertSymbolAllowlistToAddresses', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.resetAllMocks();
    consoleWarnSpy.mockRestore();
  });

  describe('valid conversions', () => {
    it('converts symbols to addresses for Mainnet', () => {
      const input = {
        [NETWORKS_CHAIN_ID.MAINNET]: ['USDC', 'USDT', 'DAI'],
      };

      const result = convertSymbolAllowlistToAddresses(input);

      expect(result[NETWORKS_CHAIN_ID.MAINNET]).toHaveLength(3);
      expect(result[NETWORKS_CHAIN_ID.MAINNET]).toContain(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      );
      expect(result[NETWORKS_CHAIN_ID.MAINNET]).toContain(
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
      );
      expect(result[NETWORKS_CHAIN_ID.MAINNET]).toContain(
        '0x6b175474e89094c44da98b954eedeac495271d0f',
      );
    });
  });

  describe('invalid chain IDs', () => {
    it('warns and skips unsupported chain ID', () => {
      const input = {
        '0x999': ['USDC'],
      };

      const result = convertSymbolAllowlistToAddresses(input);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported chain ID "0x999"'),
      );
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('processes valid chains and warns about invalid chains', () => {
      const input = {
        [NETWORKS_CHAIN_ID.MAINNET]: ['USDC'],
        '0x999': ['USDT'],
      };

      const result = convertSymbolAllowlistToAddresses(input);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(result[NETWORKS_CHAIN_ID.MAINNET]).toBeDefined();
      expect(result['0x999' as Hex]).toBeUndefined();
    });
  });

  describe('invalid token symbols', () => {
    it('warns about invalid token symbols and excludes them', () => {
      const input = {
        [NETWORKS_CHAIN_ID.MAINNET]: ['USDC', 'INVALID_TOKEN'],
      };

      const result = convertSymbolAllowlistToAddresses(input);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid token symbols'),
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('INVALID_TOKEN'),
      );
      expect(result[NETWORKS_CHAIN_ID.MAINNET]).toHaveLength(1);
      expect(result[NETWORKS_CHAIN_ID.MAINNET]).toContain(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      );
    });

    it('returns empty result when all symbols are invalid', () => {
      const input = {
        [NETWORKS_CHAIN_ID.MAINNET]: ['INVALID1', 'INVALID2'],
      };

      const result = convertSymbolAllowlistToAddresses(input);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(result[NETWORKS_CHAIN_ID.MAINNET]).toBeUndefined();
    });
  });

  describe('mixed valid and invalid symbols', () => {
    it('includes valid symbols and warns about invalid ones', () => {
      const input = {
        [NETWORKS_CHAIN_ID.MAINNET]: ['USDC', 'INVALID', 'USDT'],
      };

      const result = convertSymbolAllowlistToAddresses(input);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid token symbols'),
      );
      expect(result[NETWORKS_CHAIN_ID.MAINNET]).toHaveLength(2);
      expect(result[NETWORKS_CHAIN_ID.MAINNET]).toContain(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      );
      expect(result[NETWORKS_CHAIN_ID.MAINNET]).toContain(
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
      );
    });
  });

  describe('edge cases', () => {
    it('returns empty object for empty input', () => {
      const input = {};

      const result = convertSymbolAllowlistToAddresses(input);

      expect(result).toEqual({});
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('handles empty symbol array', () => {
      const input = {
        [NETWORKS_CHAIN_ID.MAINNET]: [],
      };

      const result = convertSymbolAllowlistToAddresses(input);

      expect(result[NETWORKS_CHAIN_ID.MAINNET]).toBeUndefined();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});

describe('isValidPaymentTokenMap', () => {
  it('returns true for valid Record<Hex, Hex[]>', () => {
    const validInput: Record<Hex, Hex[]> = {
      '0x1': ['0xabc' as Hex, '0xdef' as Hex],
      '0x2': ['0x123' as Hex],
    };

    const result = isValidPaymentTokenMap(validInput);

    expect(result).toBe(true);
  });

  it('returns false for null', () => {
    const result = isValidPaymentTokenMap(null);

    expect(result).toBe(false);
  });

  it('returns false for undefined', () => {
    const result = isValidPaymentTokenMap(undefined);

    expect(result).toBe(false);
  });

  it('returns false for arrays', () => {
    const result = isValidPaymentTokenMap(['0x1', '0x2']);

    expect(result).toBe(false);
  });

  it('returns false when keys are not hex strings', () => {
    const invalidInput = {
      notHex: ['0xabc' as Hex],
    };

    const result = isValidPaymentTokenMap(invalidInput);

    expect(result).toBe(false);
  });

  it('returns false when values are not arrays', () => {
    const invalidInput = {
      '0x1': '0xabc',
    };

    const result = isValidPaymentTokenMap(invalidInput);

    expect(result).toBe(false);
  });

  it('returns false when array elements are not hex strings', () => {
    const invalidInput = {
      '0x1': ['notHex'],
    };

    const result = isValidPaymentTokenMap(invalidInput);

    expect(result).toBe(false);
  });

  it('returns true for empty object', () => {
    const result = isValidPaymentTokenMap({});

    expect(result).toBe(true);
  });

  it('returns true for object with empty arrays', () => {
    const validInput: Record<Hex, Hex[]> = {
      '0x1': [],
    };

    const result = isValidPaymentTokenMap(validInput);

    expect(result).toBe(true);
  });
});

describe('isMusdConversionPaymentToken', () => {
  describe('supported chains with valid tokens', () => {
    it('returns true for USDC on Mainnet', () => {
      const result = isMusdConversionPaymentToken(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        CONVERTIBLE_STABLECOINS_BY_CHAIN,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(result).toBe(true);
    });

    it('returns true for DAI on Mainnet', () => {
      const result = isMusdConversionPaymentToken(
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        CONVERTIBLE_STABLECOINS_BY_CHAIN,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(result).toBe(true);
    });
  });

  describe('case-insensitive address matching', () => {
    it('returns true for mixed case USDC address on Mainnet', () => {
      const result = isMusdConversionPaymentToken(
        '0xA0B86991c6218B36c1d19D4a2e9Eb0cE3606eB48',
        CONVERTIBLE_STABLECOINS_BY_CHAIN,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(result).toBe(true);
    });
  });

  describe('unsupported chains', () => {
    it('returns false for valid token on unsupported chain', () => {
      const result = isMusdConversionPaymentToken(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        CONVERTIBLE_STABLECOINS_BY_CHAIN,
        '0x999' as Hex,
      );

      expect(result).toBe(false);
    });

    it('returns false for Polygon chain', () => {
      const result = isMusdConversionPaymentToken(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        CONVERTIBLE_STABLECOINS_BY_CHAIN,
        '0x89' as Hex,
      );

      expect(result).toBe(false);
    });
  });

  describe('non-convertible tokens', () => {
    it('returns false for random address on Mainnet', () => {
      const result = isMusdConversionPaymentToken(
        '0x1234567890123456789012345678901234567890',
        CONVERTIBLE_STABLECOINS_BY_CHAIN,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(result).toBe(false);
    });

    it('returns false for WETH address on Mainnet', () => {
      const result = isMusdConversionPaymentToken(
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        CONVERTIBLE_STABLECOINS_BY_CHAIN,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(result).toBe(false);
    });
  });

  describe('custom allowlist', () => {
    it('uses custom allowlist when provided', () => {
      const customAllowlist: Record<Hex, Hex[]> = {
        [NETWORKS_CHAIN_ID.MAINNET]: [
          '0x1234567890123456789012345678901234567890' as Hex,
        ],
      };

      const result = isMusdConversionPaymentToken(
        '0x1234567890123456789012345678901234567890',
        customAllowlist,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(result).toBe(true);
    });

    it('returns false for default convertible token when custom allowlist excludes it', () => {
      const customAllowlist: Record<Hex, Hex[]> = {
        [NETWORKS_CHAIN_ID.MAINNET]: [
          '0x1234567890123456789012345678901234567890' as Hex,
        ],
      };

      const result = isMusdConversionPaymentToken(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        customAllowlist,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(result).toBe(false);
    });

    it('works with empty custom allowlist', () => {
      const customAllowlist: Record<Hex, Hex[]> = {};

      const result = isMusdConversionPaymentToken(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        customAllowlist,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for empty address', () => {
      const result = isMusdConversionPaymentToken(
        '',
        CONVERTIBLE_STABLECOINS_BY_CHAIN,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(result).toBe(false);
    });

    it('returns false for empty chain ID', () => {
      const result = isMusdConversionPaymentToken(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        CONVERTIBLE_STABLECOINS_BY_CHAIN,
        '',
      );

      expect(result).toBe(false);
    });
  });
});

describe('isValidWildcardBlocklist', () => {
  describe('valid blocklists', () => {
    it('returns true for valid blocklist with chain-specific symbols', () => {
      const blocklist: WildcardBlocklist = {
        '0x1': ['USDC', 'USDT'],
        '0xa4b1': ['DAI'],
      };

      const result = isValidWildcardBlocklist(blocklist);

      expect(result).toBe(true);
    });

    it('returns true for blocklist with global wildcard key', () => {
      const blocklist: WildcardBlocklist = {
        '*': ['USDC'],
      };

      const result = isValidWildcardBlocklist(blocklist);

      expect(result).toBe(true);
    });

    it('returns true for blocklist with chain wildcard symbol', () => {
      const blocklist: WildcardBlocklist = {
        '0x1': ['*'],
      };

      const result = isValidWildcardBlocklist(blocklist);

      expect(result).toBe(true);
    });

    it('returns true for combined wildcard blocklist', () => {
      const blocklist: WildcardBlocklist = {
        '*': ['USDC'],
        '0x1': ['*'],
        '0xa4b1': ['USDT', 'DAI'],
      };

      const result = isValidWildcardBlocklist(blocklist);

      expect(result).toBe(true);
    });

    it('returns true for empty object', () => {
      const result = isValidWildcardBlocklist({});

      expect(result).toBe(true);
    });

    it('returns true for object with empty arrays', () => {
      const blocklist: WildcardBlocklist = {
        '0x1': [],
      };

      const result = isValidWildcardBlocklist(blocklist);

      expect(result).toBe(true);
    });
  });

  describe('invalid blocklists', () => {
    it('returns false for null', () => {
      const result = isValidWildcardBlocklist(null);

      expect(result).toBe(false);
    });

    it('returns false for undefined', () => {
      const result = isValidWildcardBlocklist(undefined);

      expect(result).toBe(false);
    });

    it('returns false for arrays', () => {
      const result = isValidWildcardBlocklist(['0x1', 'USDC']);

      expect(result).toBe(false);
    });

    it('returns false when values are not arrays', () => {
      const invalidInput = {
        '0x1': 'USDC',
      };

      const result = isValidWildcardBlocklist(invalidInput);

      expect(result).toBe(false);
    });

    it('returns false when array elements are not strings', () => {
      const invalidInput = {
        '0x1': [123, 456],
      };

      const result = isValidWildcardBlocklist(invalidInput);

      expect(result).toBe(false);
    });

    it('returns false for primitive values', () => {
      expect(isValidWildcardBlocklist('string')).toBe(false);
      expect(isValidWildcardBlocklist(123)).toBe(false);
      expect(isValidWildcardBlocklist(true)).toBe(false);
    });
  });
});

describe('isMusdConversionPaymentTokenBlocked', () => {
  describe('global wildcard blocking', () => {
    it('blocks USDC on any chain when global wildcard includes USDC', () => {
      const blocklist: WildcardBlocklist = {
        '*': ['USDC'],
      };

      const result = isMusdConversionPaymentTokenBlocked(
        'USDC',
        blocklist,
        '0x1',
      );

      expect(result).toBe(true);
    });

    it('blocks USDC on different chain when global wildcard includes USDC', () => {
      const blocklist: WildcardBlocklist = {
        '*': ['USDC'],
      };

      const result = isMusdConversionPaymentTokenBlocked(
        'USDC',
        blocklist,
        '0xa4b1',
      );

      expect(result).toBe(true);
    });

    it('does not block USDT when global wildcard only includes USDC', () => {
      const blocklist: WildcardBlocklist = {
        '*': ['USDC'],
      };

      const result = isMusdConversionPaymentTokenBlocked(
        'USDT',
        blocklist,
        '0x1',
      );

      expect(result).toBe(false);
    });

    it('blocks all tokens when global wildcard includes asterisk', () => {
      const blocklist: WildcardBlocklist = {
        '*': ['*'],
      };

      expect(
        isMusdConversionPaymentTokenBlocked('USDC', blocklist, '0x1'),
      ).toBe(true);
      expect(
        isMusdConversionPaymentTokenBlocked('USDT', blocklist, '0x1'),
      ).toBe(true);
      expect(
        isMusdConversionPaymentTokenBlocked('DAI', blocklist, '0xa4b1'),
      ).toBe(true);
    });
  });

  describe('chain-specific wildcard blocking', () => {
    it('blocks all tokens on specific chain when chain has asterisk', () => {
      const blocklist: WildcardBlocklist = {
        '0x1': ['*'],
      };

      expect(
        isMusdConversionPaymentTokenBlocked('USDC', blocklist, '0x1'),
      ).toBe(true);
      expect(
        isMusdConversionPaymentTokenBlocked('USDT', blocklist, '0x1'),
      ).toBe(true);
      expect(isMusdConversionPaymentTokenBlocked('DAI', blocklist, '0x1')).toBe(
        true,
      );
    });

    it('does not block tokens on other chains when only one chain has wildcard', () => {
      const blocklist: WildcardBlocklist = {
        '0x1': ['*'],
      };

      const result = isMusdConversionPaymentTokenBlocked(
        'USDC',
        blocklist,
        '0xa4b1',
      );

      expect(result).toBe(false);
    });
  });

  describe('chain-specific symbol blocking', () => {
    it('blocks specific symbol on specific chain', () => {
      const blocklist: WildcardBlocklist = {
        '0xa4b1': ['USDT', 'DAI'],
      };

      expect(
        isMusdConversionPaymentTokenBlocked('USDT', blocklist, '0xa4b1'),
      ).toBe(true);
      expect(
        isMusdConversionPaymentTokenBlocked('DAI', blocklist, '0xa4b1'),
      ).toBe(true);
    });

    it('does not block unlisted symbol on that chain', () => {
      const blocklist: WildcardBlocklist = {
        '0xa4b1': ['USDT', 'DAI'],
      };

      const result = isMusdConversionPaymentTokenBlocked(
        'USDC',
        blocklist,
        '0xa4b1',
      );

      expect(result).toBe(false);
    });

    it('does not block listed symbol on different chain', () => {
      const blocklist: WildcardBlocklist = {
        '0xa4b1': ['USDT', 'DAI'],
      };

      const result = isMusdConversionPaymentTokenBlocked(
        'USDT',
        blocklist,
        '0x1',
      );

      expect(result).toBe(false);
    });
  });

  describe('combined rules (additive)', () => {
    it('blocks USDC globally AND all tokens on mainnet', () => {
      const blocklist: WildcardBlocklist = {
        '*': ['USDC'],
        '0x1': ['*'],
      };

      // USDC blocked globally
      expect(
        isMusdConversionPaymentTokenBlocked('USDC', blocklist, '0xa4b1'),
      ).toBe(true);

      // All tokens blocked on mainnet
      expect(
        isMusdConversionPaymentTokenBlocked('USDT', blocklist, '0x1'),
      ).toBe(true);
      expect(isMusdConversionPaymentTokenBlocked('DAI', blocklist, '0x1')).toBe(
        true,
      );

      // Non-USDC on non-mainnet is allowed
      expect(
        isMusdConversionPaymentTokenBlocked('USDT', blocklist, '0xa4b1'),
      ).toBe(false);
    });

    it('handles complex combined blocklist', () => {
      const blocklist: WildcardBlocklist = {
        '*': ['USDC'],
        '0x1': ['*'],
        '0xa4b1': ['USDT'],
      };

      // Global USDC block
      expect(
        isMusdConversionPaymentTokenBlocked('USDC', blocklist, '0x38'),
      ).toBe(true);

      // Mainnet all blocked
      expect(isMusdConversionPaymentTokenBlocked('DAI', blocklist, '0x1')).toBe(
        true,
      );

      // Arbitrum USDT blocked
      expect(
        isMusdConversionPaymentTokenBlocked('USDT', blocklist, '0xa4b1'),
      ).toBe(true);

      // Arbitrum DAI allowed
      expect(
        isMusdConversionPaymentTokenBlocked('DAI', blocklist, '0xa4b1'),
      ).toBe(false);
    });
  });

  describe('case-insensitive matching', () => {
    it('matches lowercase symbol against uppercase blocklist', () => {
      const blocklist: WildcardBlocklist = {
        '0x1': ['USDC'],
      };

      const result = isMusdConversionPaymentTokenBlocked(
        'usdc',
        blocklist,
        '0x1',
      );

      expect(result).toBe(true);
    });

    it('matches uppercase symbol against lowercase blocklist', () => {
      const blocklist: WildcardBlocklist = {
        '0x1': ['usdc'],
      };

      const result = isMusdConversionPaymentTokenBlocked(
        'USDC',
        blocklist,
        '0x1',
      );

      expect(result).toBe(true);
    });

    it('matches mixed case symbol', () => {
      const blocklist: WildcardBlocklist = {
        '0x1': ['UsDc'],
      };

      const result = isMusdConversionPaymentTokenBlocked(
        'uSdC',
        blocklist,
        '0x1',
      );

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns false for empty blocklist', () => {
      const result = isMusdConversionPaymentTokenBlocked('USDC', {}, '0x1');

      expect(result).toBe(false);
    });

    it('returns false when chainId is undefined', () => {
      const blocklist: WildcardBlocklist = {
        '*': ['USDC'],
      };

      const result = isMusdConversionPaymentTokenBlocked(
        'USDC',
        blocklist,
        undefined,
      );

      expect(result).toBe(false);
    });

    it('returns false when chainId is empty string', () => {
      const blocklist: WildcardBlocklist = {
        '*': ['USDC'],
      };

      const result = isMusdConversionPaymentTokenBlocked('USDC', blocklist, '');

      expect(result).toBe(false);
    });

    it('returns false when tokenSymbol is empty string', () => {
      const blocklist: WildcardBlocklist = {
        '*': ['USDC'],
      };

      const result = isMusdConversionPaymentTokenBlocked('', blocklist, '0x1');

      expect(result).toBe(false);
    });

    it('uses empty blocklist as default when blocklist is undefined', () => {
      const result = isMusdConversionPaymentTokenBlocked(
        'USDC',
        undefined,
        '0x1',
      );

      expect(result).toBe(false);
    });
  });
});
