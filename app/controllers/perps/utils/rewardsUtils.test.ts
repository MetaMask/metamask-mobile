import {
  formatAccountToCaipAccountId,
  isCaipAccountId,
  handleRewardsError,
} from './rewardsUtils';
import type { PerpsLogger } from '../types';

describe('rewardsUtils', () => {
  describe('formatAccountToCaipAccountId', () => {
    it('formats hex chain ID and address to CAIP-10', () => {
      const result = formatAccountToCaipAccountId(
        '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
        '0xa4b1',
      );
      expect(result).toMatch(/^eip155:42161:0x/);
    });

    it('formats decimal chain ID and address to CAIP-10', () => {
      const result = formatAccountToCaipAccountId(
        '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
        '42161',
      );
      expect(result).toMatch(/^eip155:42161:0x/);
    });

    it('returns null for invalid chain ID (NaN) and logs error', () => {
      const mockLogger: PerpsLogger = {
        error: jest.fn(),
      };

      const result = formatAccountToCaipAccountId(
        '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
        'abc',
        mockLogger,
      );

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid chain ID: abc'),
        }),
        expect.any(Object),
      );
    });

    it('returns null for empty chain ID and logs error', () => {
      const mockLogger: PerpsLogger = {
        error: jest.fn(),
      };

      const result = formatAccountToCaipAccountId(
        '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
        '',
        mockLogger,
      );

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('returns null without logger for invalid chain ID', () => {
      const result = formatAccountToCaipAccountId(
        '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
        'not-a-number',
      );

      expect(result).toBeNull();
    });
  });

  describe('isCaipAccountId', () => {
    it('returns true for valid CAIP-10 account ID', () => {
      expect(isCaipAccountId('eip155:1:0xABC')).toBe(true);
    });

    it('returns false for non-string value', () => {
      expect(isCaipAccountId(123)).toBe(false);
      expect(isCaipAccountId(null)).toBe(false);
    });

    it('returns false for non-eip155 namespace', () => {
      expect(isCaipAccountId('solana:1:abc')).toBe(false);
    });

    it('returns false for string with fewer than 3 parts', () => {
      expect(isCaipAccountId('eip155:1')).toBe(false);
    });
  });

  describe('handleRewardsError', () => {
    it('returns user-friendly error message', () => {
      const result = handleRewardsError(new Error('test'));
      expect(result).toBe('Rewards operation failed');
    });

    it('logs error when logger is provided', () => {
      const mockLogger: PerpsLogger = { error: jest.fn() };
      handleRewardsError(new Error('test'), mockLogger, { key: 'value' });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
