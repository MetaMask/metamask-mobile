import { Hex } from '@metamask/utils';
import {
  areValidAllowedPaymentTokens,
  convertSymbolAllowlistToAddresses,
  isMusdConversionPaymentToken,
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

describe('areValidAllowedPaymentTokens', () => {
  it('returns true for valid Record<Hex, Hex[]>', () => {
    const validInput: Record<Hex, Hex[]> = {
      '0x1': ['0xabc' as Hex, '0xdef' as Hex],
      '0x2': ['0x123' as Hex],
    };

    const result = areValidAllowedPaymentTokens(validInput);

    expect(result).toBe(true);
  });

  it('returns false for null', () => {
    const result = areValidAllowedPaymentTokens(null);

    expect(result).toBe(false);
  });

  it('returns false for undefined', () => {
    const result = areValidAllowedPaymentTokens(undefined);

    expect(result).toBe(false);
  });

  it('returns false for arrays', () => {
    const result = areValidAllowedPaymentTokens(['0x1', '0x2']);

    expect(result).toBe(false);
  });

  it('returns false when keys are not hex strings', () => {
    const invalidInput = {
      notHex: ['0xabc' as Hex],
    };

    const result = areValidAllowedPaymentTokens(invalidInput);

    expect(result).toBe(false);
  });

  it('returns false when values are not arrays', () => {
    const invalidInput = {
      '0x1': '0xabc',
    };

    const result = areValidAllowedPaymentTokens(invalidInput);

    expect(result).toBe(false);
  });

  it('returns false when array elements are not hex strings', () => {
    const invalidInput = {
      '0x1': ['notHex'],
    };

    const result = areValidAllowedPaymentTokens(invalidInput);

    expect(result).toBe(false);
  });

  it('returns true for empty object', () => {
    const result = areValidAllowedPaymentTokens({});

    expect(result).toBe(true);
  });

  it('returns true for object with empty arrays', () => {
    const validInput: Record<Hex, Hex[]> = {
      '0x1': [],
    };

    const result = areValidAllowedPaymentTokens(validInput);

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
