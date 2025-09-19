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

// Mock dependencies
jest.mock('@metamask/utils');
jest.mock('@metamask/bridge-controller');

const mockToCaipAccountId = toCaipAccountId as jest.MockedFunction<
  typeof toCaipAccountId
>;
const mockParseCaipChainId = parseCaipChainId as jest.MockedFunction<
  typeof parseCaipChainId
>;
const mockFormatChainIdToCaip = formatChainIdToCaip as jest.MockedFunction<
  typeof formatChainIdToCaip
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
