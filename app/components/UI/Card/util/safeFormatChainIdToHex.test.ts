import { safeFormatChainIdToHex } from './safeFormatChainIdToHex';

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToHex: jest.fn(),
}));

import { formatChainIdToHex } from '@metamask/bridge-controller';

const mockFormatChainIdToHex = formatChainIdToHex as jest.MockedFunction<
  typeof formatChainIdToHex
>;

describe('safeFormatChainIdToHex', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful formatting', () => {
    it('returns formatted hex string for decimal chain ID', () => {
      const chainId = '1';
      const expectedHex = '0x1';
      mockFormatChainIdToHex.mockReturnValue(expectedHex);

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(expectedHex);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
      expect(mockFormatChainIdToHex).toHaveBeenCalledTimes(1);
    });

    it('returns formatted hex string for Linea mainnet chain ID', () => {
      const chainId = '59144';
      const expectedHex = '0xe708';
      mockFormatChainIdToHex.mockReturnValue(expectedHex);

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(expectedHex);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });

    it('returns formatted hex string for Polygon chain ID', () => {
      const chainId = '137';
      const expectedHex = '0x89';
      mockFormatChainIdToHex.mockReturnValue(expectedHex);

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(expectedHex);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });

    it('returns formatted hex string for Arbitrum chain ID', () => {
      const chainId = '42161';
      const expectedHex = '0xa4b1';
      mockFormatChainIdToHex.mockReturnValue(expectedHex);

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(expectedHex);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });

    it('returns formatted hex string when already in hex format', () => {
      const chainId = '0x1';
      const expectedHex = '0x1';
      mockFormatChainIdToHex.mockReturnValue(expectedHex);

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(expectedHex);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });
  });

  describe('error handling', () => {
    it('returns original chain ID when formatChainIdToHex throws Error', () => {
      const chainId = 'invalid-chain-id';
      mockFormatChainIdToHex.mockImplementation(() => {
        throw new Error('Invalid chain ID format');
      });

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(chainId);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });

    it('returns original chain ID when formatChainIdToHex throws TypeError', () => {
      const chainId = 'malformed';
      mockFormatChainIdToHex.mockImplementation(() => {
        throw new TypeError('Type error in formatting');
      });

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(chainId);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });

    it('returns original chain ID when formatChainIdToHex throws string error', () => {
      const chainId = 'bad-format';
      mockFormatChainIdToHex.mockImplementation(() => {
        throw 'String error message';
      });

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(chainId);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });

    it('returns original chain ID when formatChainIdToHex throws undefined', () => {
      const chainId = 'unexpected-error';
      mockFormatChainIdToHex.mockImplementation(() => {
        throw undefined;
      });

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(chainId);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });
  });

  describe('edge cases', () => {
    it('returns original empty string when formatChainIdToHex throws', () => {
      const chainId = '';
      mockFormatChainIdToHex.mockImplementation(() => {
        throw new Error('Empty chain ID');
      });

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(chainId);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });

    it('returns formatted result for large chain ID number', () => {
      const chainId = '999999999';
      const expectedHex = '0x3b9ac9ff';
      mockFormatChainIdToHex.mockReturnValue(expectedHex);

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(expectedHex);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });

    it('returns original special characters string when formatChainIdToHex throws', () => {
      const chainId = '@#$%';
      mockFormatChainIdToHex.mockImplementation(() => {
        throw new Error('Invalid characters');
      });

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(chainId);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });

    it('returns formatted result for zero chain ID', () => {
      const chainId = '0';
      const expectedHex = '0x0';
      mockFormatChainIdToHex.mockReturnValue(expectedHex);

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(expectedHex);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });

    it('returns original negative number string when formatChainIdToHex throws', () => {
      const chainId = '-1';
      mockFormatChainIdToHex.mockImplementation(() => {
        throw new Error('Negative chain ID');
      });

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(chainId);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });

    it('returns original decimal number string when formatChainIdToHex throws', () => {
      const chainId = '1.5';
      mockFormatChainIdToHex.mockImplementation(() => {
        throw new Error('Decimal chain ID');
      });

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(chainId);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });

    it('returns original whitespace string when formatChainIdToHex throws', () => {
      const chainId = '   ';
      mockFormatChainIdToHex.mockImplementation(() => {
        throw new Error('Whitespace chain ID');
      });

      const result = safeFormatChainIdToHex(chainId);

      expect(result).toBe(chainId);
      expect(mockFormatChainIdToHex).toHaveBeenCalledWith(chainId);
    });
  });
});
