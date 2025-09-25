/**
 * Unit tests for Perps rewards utilities
 * Tests CAIP account formatting and rewards integration helpers
 */
import {
  formatAccountToCaipAccountId,
  isCaipAccountId,
  handleRewardsError,
} from './rewardsUtils';
import { toCaipAccountId, parseCaipChainId } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';

// Mock dependencies
jest.mock('@metamask/utils');
jest.mock('@metamask/bridge-controller');
jest.mock('@metamask/controller-utils');

const mockToCaipAccountId = toCaipAccountId as jest.MockedFunction<
  typeof toCaipAccountId
>;
const mockParseCaipChainId = parseCaipChainId as jest.MockedFunction<
  typeof parseCaipChainId
>;
const mockFormatChainIdToCaip = formatChainIdToCaip as jest.MockedFunction<
  typeof formatChainIdToCaip
>;
const mockToChecksumHexAddress = toChecksumHexAddress as jest.MockedFunction<
  typeof toChecksumHexAddress
>;

describe('rewardsUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatAccountToCaipAccountId', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockChainId = '42161';
    const mockCaipChainId = 'eip155:42161';
    const mockCaipAccountId =
      'eip155:42161:0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      mockFormatChainIdToCaip.mockReturnValue(mockCaipChainId);
      mockParseCaipChainId.mockReturnValue({
        namespace: 'eip155',
        reference: '42161',
      });
      mockToCaipAccountId.mockReturnValue(mockCaipAccountId);
      // Mock checksum function to return the same address for basic tests
      mockToChecksumHexAddress.mockReturnValue(mockAddress);
    });

    it('formats valid address and chainId to CAIP account ID', () => {
      // Act
      const result = formatAccountToCaipAccountId(mockAddress, mockChainId);

      // Assert
      expect(result).toBe(mockCaipAccountId);
      expect(mockFormatChainIdToCaip).toHaveBeenCalledWith(mockChainId);
      expect(mockParseCaipChainId).toHaveBeenCalledWith(mockCaipChainId);
      expect(mockToCaipAccountId).toHaveBeenCalledWith(
        'eip155',
        '42161',
        mockAddress,
      );
    });

    it('returns null when formatChainIdToCaip throws', () => {
      // Arrange
      const error = new Error('Invalid chain ID format');
      mockFormatChainIdToCaip.mockImplementation(() => {
        throw error;
      });

      // Act
      const result = formatAccountToCaipAccountId(mockAddress, 'invalid');

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when parseCaipChainId throws', () => {
      // Arrange
      const error = new Error('Invalid CAIP chain ID');
      mockParseCaipChainId.mockImplementation(() => {
        throw error;
      });

      // Act
      const result = formatAccountToCaipAccountId(mockAddress, mockChainId);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when toCaipAccountId throws', () => {
      // Arrange
      const error = new Error('Invalid account format');
      mockToCaipAccountId.mockImplementation(() => {
        throw error;
      });

      // Act
      const result = formatAccountToCaipAccountId(mockAddress, mockChainId);

      // Assert
      expect(result).toBeNull();
    });

    it('handles non-Error objects as error', () => {
      // Arrange
      const error = 'String error';
      mockToCaipAccountId.mockImplementation(() => {
        throw error;
      });

      // Act
      const result = formatAccountToCaipAccountId(mockAddress, mockChainId);

      // Assert
      expect(result).toBeNull();
    });

    describe('address normalization for EVM chains', () => {
      const lowercaseAddress = '0x316bde155acd07609872a56bc32ccfb0b13201fa';
      const checksummedAddress = '0x316BDE155acd07609872a56Bc32CcfB0B13201fA';
      const mixedCaseAddress = '0x316BdE155AcD07609872a56bC32CcFb0b13201Fa';
      const chainId = '1';
      const caipChainId = 'eip155:1';

      beforeEach(() => {
        mockFormatChainIdToCaip.mockReturnValue(caipChainId);
        mockParseCaipChainId.mockReturnValue({
          namespace: 'eip155',
          reference: '1',
        });
        mockToChecksumHexAddress.mockReturnValue(checksummedAddress);
      });

      it('normalizes lowercase EVM address to checksummed format', () => {
        // Arrange
        const expectedCaipId = `eip155:1:${checksummedAddress}`;
        mockToCaipAccountId.mockReturnValue(expectedCaipId);

        // Act
        const result = formatAccountToCaipAccountId(lowercaseAddress, chainId);

        // Assert
        expect(mockToChecksumHexAddress).toHaveBeenCalledWith(lowercaseAddress);
        expect(mockToCaipAccountId).toHaveBeenCalledWith(
          'eip155',
          '1',
          checksummedAddress,
        );
        expect(result).toBe(expectedCaipId);
      });

      it('normalizes mixed case EVM address to checksummed format', () => {
        // Arrange
        const expectedCaipId = `eip155:1:${checksummedAddress}`;
        mockToCaipAccountId.mockReturnValue(expectedCaipId);

        // Act
        const result = formatAccountToCaipAccountId(mixedCaseAddress, chainId);

        // Assert
        expect(mockToChecksumHexAddress).toHaveBeenCalledWith(mixedCaseAddress);
        expect(mockToCaipAccountId).toHaveBeenCalledWith(
          'eip155',
          '1',
          checksummedAddress,
        );
        expect(result).toBe(expectedCaipId);
      });

      it('handles already checksummed EVM address', () => {
        // Arrange
        const expectedCaipId = `eip155:1:${checksummedAddress}`;
        mockToCaipAccountId.mockReturnValue(expectedCaipId);

        // Act
        const result = formatAccountToCaipAccountId(
          checksummedAddress,
          chainId,
        );

        // Assert
        expect(mockToChecksumHexAddress).toHaveBeenCalledWith(
          checksummedAddress,
        );
        expect(mockToCaipAccountId).toHaveBeenCalledWith(
          'eip155',
          '1',
          checksummedAddress,
        );
        expect(result).toBe(expectedCaipId);
      });

      it('produces identical CAIP IDs for same address in different cases (regression test)', () => {
        // Arrange - This test prevents the original bug from recurring
        const expectedCaipId = `eip155:1:${checksummedAddress}`;
        mockToCaipAccountId.mockReturnValue(expectedCaipId);

        // Act - Same address in different cases
        const result1 = formatAccountToCaipAccountId(lowercaseAddress, chainId);
        const result2 = formatAccountToCaipAccountId(
          checksummedAddress,
          chainId,
        );
        const result3 = formatAccountToCaipAccountId(mixedCaseAddress, chainId);

        // Assert - All should produce identical CAIP account IDs
        expect(result1).toBe(expectedCaipId);
        expect(result2).toBe(expectedCaipId);
        expect(result3).toBe(expectedCaipId);
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);

        // Verify checksum function was called for each address
        expect(mockToChecksumHexAddress).toHaveBeenNthCalledWith(
          1,
          lowercaseAddress,
        );
        expect(mockToChecksumHexAddress).toHaveBeenNthCalledWith(
          2,
          checksummedAddress,
        );
        expect(mockToChecksumHexAddress).toHaveBeenNthCalledWith(
          3,
          mixedCaseAddress,
        );
      });
    });

    describe('non-EVM chain handling', () => {
      const btcAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      const chainId = '1';

      beforeEach(() => {
        mockFormatChainIdToCaip.mockReturnValue(
          'bip122:000000000019d6689c085ae165831e93',
        );
        mockParseCaipChainId.mockReturnValue({
          namespace: 'bip122',
          reference: '000000000019d6689c085ae165831e93',
        });
      });

      it('does not normalize non-EVM addresses', () => {
        // Arrange
        const expectedCaipId = `bip122:000000000019d6689c085ae165831e93:${btcAddress}`;
        mockToCaipAccountId.mockReturnValue(expectedCaipId);

        // Act
        const result = formatAccountToCaipAccountId(btcAddress, chainId);

        // Assert
        expect(mockToChecksumHexAddress).not.toHaveBeenCalled();
        expect(mockToCaipAccountId).toHaveBeenCalledWith(
          'bip122',
          '000000000019d6689c085ae165831e93',
          btcAddress, // Original address, not normalized
        );
        expect(result).toBe(expectedCaipId);
      });
    });
  });

  describe('isCaipAccountId', () => {
    it('returns true for valid CAIP account ID format', () => {
      // Act & Assert
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
      // Act & Assert
      expect(isCaipAccountId(null)).toBe(false);
      expect(isCaipAccountId(undefined)).toBe(false);
      expect(isCaipAccountId(123)).toBe(false);
      expect(isCaipAccountId({})).toBe(false);
      expect(isCaipAccountId([])).toBe(false);
    });

    it('returns false for invalid format strings', () => {
      // Act & Assert
      expect(isCaipAccountId('')).toBe(false);
      expect(isCaipAccountId('invalid')).toBe(false);
      expect(isCaipAccountId('eip155')).toBe(false);
      expect(isCaipAccountId('eip155:1')).toBe(false);
      expect(isCaipAccountId('1:0x123')).toBe(false); // Missing namespace
      expect(isCaipAccountId('btc:1:0x123')).toBe(false); // Wrong namespace
    });

    it('returns true for CAIP IDs with additional segments', () => {
      // Act & Assert
      expect(isCaipAccountId('eip155:1:0x123:extra:segments')).toBe(true);
    });
  });

  describe('handleRewardsError', () => {
    it('handles Error objects and logs them', () => {
      // Arrange
      const error = new Error('Test error message');
      const context = { userId: '123', operation: 'getDiscount' };

      // Act
      const result = handleRewardsError(error, context);

      // Assert
      expect(result).toBe('Rewards operation failed');
    });

    it('handles non-Error objects', () => {
      // Arrange
      const error = 'String error message';
      const context = { operation: 'testOperation' };

      // Act
      const result = handleRewardsError(error, context);

      // Assert
      expect(result).toBe('Rewards operation failed');
    });

    it('works without context parameter', () => {
      // Arrange
      const error = new Error('Test error');

      // Act
      const result = handleRewardsError(error);

      // Assert
      expect(result).toBe('Rewards operation failed');
    });
  });
});
