/**
 * Unit tests for Perps rewards utilities
 * Tests CAIP account formatting and rewards integration helpers
 */
import {
  formatAccountToCaipAccountId,
  isCaipAccountId,
  handleRewardsError,
} from '@metamask/perps-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';

describe('rewardsUtils', () => {
  describe('formatAccountToCaipAccountId', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockChainId = '42161';

    it('formats valid address and chainId to CAIP account ID', () => {
      const checksummedAddress = toChecksumHexAddress(mockAddress);

      const result = formatAccountToCaipAccountId(mockAddress, mockChainId);

      expect(result).toBe(`eip155:${mockChainId}:${checksummedAddress}`);
    });

    it('returns null when chain ID is not numeric', () => {
      const result = formatAccountToCaipAccountId(mockAddress, 'invalid');

      expect(result).toBeNull();
    });

    describe('address normalization for EVM chains', () => {
      const lowercaseAddress = '0x316bde155acd07609872a56bc32ccfb0b13201fa';
      const checksummedAddress = '0x316BDE155acd07609872a56Bc32CcfB0B13201fA';
      const mixedCaseAddress = '0x316BdE155AcD07609872a56bC32CcFb0b13201Fa';
      const chainId = '1';
      const expectedCaipId = `eip155:1:${toChecksumHexAddress(checksummedAddress)}`;

      it('normalizes lowercase EVM address to checksummed format', () => {
        const result = formatAccountToCaipAccountId(lowercaseAddress, chainId);

        expect(result).toBe(expectedCaipId);
      });

      it('normalizes mixed case EVM address to checksummed format', () => {
        const result = formatAccountToCaipAccountId(mixedCaseAddress, chainId);

        expect(result).toBe(expectedCaipId);
      });

      it('keeps an already checksummed EVM address', () => {
        const result = formatAccountToCaipAccountId(
          checksummedAddress,
          chainId,
        );

        expect(result).toBe(expectedCaipId);
      });

      it('produces identical CAIP IDs for the same address in different cases', () => {
        const result1 = formatAccountToCaipAccountId(lowercaseAddress, chainId);
        const result2 = formatAccountToCaipAccountId(
          checksummedAddress,
          chainId,
        );
        const result3 = formatAccountToCaipAccountId(mixedCaseAddress, chainId);

        expect(result1).toBe(expectedCaipId);
        expect(result2).toBe(expectedCaipId);
        expect(result3).toBe(expectedCaipId);
      });
    });
  });

  describe('isCaipAccountId', () => {
    it('returns true for valid CAIP account ID format', () => {
      expect(
        isCaipAccountId('eip155:1:0x1234567890123456789012345678901234567890'),
      ).toBe(true);
      expect(
        isCaipAccountId(
          'eip155:42161:0xabcdef1234567890123456789012345678901234',
        ),
      ).toBe(true);
      expect(
        isCaipAccountId(
          'eip155:137:0x0000000000000000000000000000000000000000',
        ),
      ).toBe(true);
    });

    it('returns false for non-string values', () => {
      expect(isCaipAccountId(null)).toBe(false);
      expect(isCaipAccountId(undefined)).toBe(false);
      expect(isCaipAccountId(123)).toBe(false);
      expect(isCaipAccountId({})).toBe(false);
      expect(isCaipAccountId([])).toBe(false);
    });

    it('returns false for invalid format strings', () => {
      expect(isCaipAccountId('')).toBe(false);
      expect(isCaipAccountId('invalid')).toBe(false);
      expect(isCaipAccountId('eip155')).toBe(false);
      expect(isCaipAccountId('eip155:1')).toBe(false);
      expect(isCaipAccountId('1:0x123')).toBe(false);
      expect(isCaipAccountId('btc:1:0x123')).toBe(false);
    });

    it('returns true for CAIP IDs with additional segments', () => {
      expect(isCaipAccountId('eip155:1:0x123:extra:segments')).toBe(true);
    });
  });

  describe('handleRewardsError', () => {
    it('handles Error objects and logs them', () => {
      const error = new Error('Test error message');
      const context = { userId: '123', operation: 'getDiscount' };

      const result = handleRewardsError(error, undefined, context);

      expect(result).toBe('Rewards operation failed');
    });

    it('handles non-Error objects', () => {
      const error = 'String error message';
      const context = { operation: 'testOperation' };

      const result = handleRewardsError(error, undefined, context);

      expect(result).toBe('Rewards operation failed');
    });

    it('works without context parameter', () => {
      const error = new Error('Test error');

      const result = handleRewardsError(error);

      expect(result).toBe('Rewards operation failed');
    });
  });
});
