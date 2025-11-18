import {
  parseTypedDataMessage,
  extractSpenderFromApprovalData,
  extractSpenderFromPermitMessage,
  resemblesAddress,
  PRIMARY_TYPES_PERMIT,
} from './address-scan-util';
import { Hex } from '@metamask/utils';

describe('address-scan-util', () => {
  describe('resemblesAddress', () => {
    it('returns true for valid Ethereum addresses', () => {
      expect(
        resemblesAddress('0x1234567890123456789012345678901234567890'),
      ).toBe(true);
      expect(
        resemblesAddress('0xAbCdEf1234567890123456789012345678901234'),
      ).toBe(true);
    });

    it('returns false for invalid addresses', () => {
      expect(resemblesAddress('0x123')).toBe(false);
      expect(resemblesAddress('1234567890123456789012345678901234567890')).toBe(
        false,
      );
      expect(
        resemblesAddress('0xGGGG567890123456789012345678901234567890'),
      ).toBe(false);
      expect(resemblesAddress('')).toBe(false);
      expect(resemblesAddress(undefined)).toBe(false);
    });
  });

  describe('parseTypedDataMessage', () => {
    it('parses typed data from string', () => {
      const typedDataString = JSON.stringify({
        domain: {
          name: 'Test',
          version: '1',
          chainId: 1,
          verifyingContract: '0x1234567890123456789012345678901234567890',
        },
        message: { spender: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' },
        primaryType: 'Permit',
        types: {},
      });

      const result = parseTypedDataMessage(typedDataString);
      expect(result).toBeDefined();
      expect(result?.domain?.verifyingContract).toBe(
        '0x1234567890123456789012345678901234567890',
      );
      expect(result?.message?.spender).toBe(
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      );
      expect(result?.primaryType).toBe('Permit');
    });

    it('parses typed data from object', () => {
      const typedDataObject = {
        domain: {
          name: 'Test',
          version: '1',
          chainId: 1,
          verifyingContract: '0x1234567890123456789012345678901234567890',
        },
        message: { spender: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' },
        primaryType: 'Permit',
        types: {},
      };

      const result = parseTypedDataMessage(typedDataObject);
      expect(result).toBeDefined();
      expect(result?.domain?.verifyingContract).toBe(
        '0x1234567890123456789012345678901234567890',
      );
      expect(result?.message?.spender).toBe(
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      );
      expect(result?.primaryType).toBe('Permit');
    });

    it('returns undefined for invalid JSON string', () => {
      const result = parseTypedDataMessage('invalid json');
      expect(result).toBeUndefined();
    });

    it('handles empty object', () => {
      const result = parseTypedDataMessage({});
      expect(result).toBeDefined();
      expect(result?.domain).toBeUndefined();
      expect(result?.message).toBeUndefined();
    });
  });

  describe('extractSpenderFromApprovalData', () => {
    it('returns undefined for empty data', () => {
      expect(extractSpenderFromApprovalData(undefined)).toBeUndefined();
      expect(
        extractSpenderFromApprovalData('0x' as unknown as Hex),
      ).toBeUndefined();
    });

    it('extracts spender from ERC-20 approve transaction', () => {
      // approve(address spender, uint256 amount)
      // Function signature: 0x095ea7b3
      // spender: 0x1234567890123456789012345678901234567890
      // amount: 1000000000000000000 (1 token with 18 decimals)
      const data =
        '0x095ea7b300000000000000000000000012345678901234567890123456789012345678900000000000000000000000000000000000000000000000000de0b6b3a7640000';
      const spender = extractSpenderFromApprovalData(data);
      expect(spender).toBe('0x1234567890123456789012345678901234567890');
    });

    it('returns undefined for non-approval transaction', () => {
      // transfer(address to, uint256 amount)
      // Function signature: 0xa9059cbb
      const data =
        '0xa9059cbb00000000000000000000000012345678901234567890123456789012345678900000000000000000000000000000000000000000000000000de0b6b3a7640000';
      const spender = extractSpenderFromApprovalData(data);
      expect(spender).toBeUndefined();
    });

    it('handles invalid transaction data gracefully', () => {
      const data = '0xinvalid';
      const spender = extractSpenderFromApprovalData(data);
      expect(spender).toBeUndefined();
    });
  });

  describe('extractSpenderFromPermitMessage', () => {
    it('extracts spender from Permit typed data', () => {
      const typedDataMessage = {
        domain: {
          name: 'Test Token',
          version: '1',
          chainId: 1,
          verifyingContract: '0x1234567890123456789012345678901234567890',
        },
        message: {
          owner: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          spender: '0x9876543210987654321098765432109876543210',
          value: '1000000000000000000',
          nonce: 0,
          deadline: 1234567890,
        },
        primaryType: 'Permit',
        types: {},
      };

      const spender = extractSpenderFromPermitMessage(typedDataMessage);
      expect(spender).toBe('0x9876543210987654321098765432109876543210');
    });

    it('extracts spender from PermitSingle typed data', () => {
      const typedDataMessage = {
        domain: {
          name: 'Permit2',
          version: '1',
          chainId: 1,
          verifyingContract: '0x000000000022d473030f116ddee9f6b43ac78ba3',
        },
        message: {
          details: {
            token: '0x1234567890123456789012345678901234567890',
            amount: '1000000000000000000',
            expiration: 1234567890,
            nonce: 0,
          },
          spender: '0x9876543210987654321098765432109876543210',
          sigDeadline: 1234567890,
        },
        primaryType: 'PermitSingle',
        types: {},
      };

      const spender = extractSpenderFromPermitMessage(typedDataMessage);
      expect(spender).toBe('0x9876543210987654321098765432109876543210');
    });

    it('returns undefined for non-permit typed data', () => {
      const typedDataMessage = {
        domain: {
          name: 'Test',
          version: '1',
          chainId: 1,
          verifyingContract: '0x1234567890123456789012345678901234567890',
        },
        message: {
          from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          to: '0x9876543210987654321098765432109876543210',
        },
        primaryType: 'Transfer',
        types: {},
      };

      const spender = extractSpenderFromPermitMessage(typedDataMessage);
      expect(spender).toBeUndefined();
    });

    it('returns undefined if message has no spender', () => {
      const typedDataMessage = {
        domain: {
          name: 'Test Token',
          version: '1',
          chainId: 1,
          verifyingContract: '0x1234567890123456789012345678901234567890',
        },
        message: {
          owner: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          value: '1000000000000000000',
        },
        primaryType: 'Permit',
        types: {},
      };

      const spender = extractSpenderFromPermitMessage(typedDataMessage);
      expect(spender).toBeUndefined();
    });

    it('returns undefined if primaryType is missing', () => {
      const typedDataMessage = {
        domain: {
          name: 'Test Token',
          version: '1',
          chainId: 1,
          verifyingContract: '0x1234567890123456789012345678901234567890',
        },
        message: {
          spender: '0x9876543210987654321098765432109876543210',
        },
        types: {},
      };

      const spender = extractSpenderFromPermitMessage(typedDataMessage);
      expect(spender).toBeUndefined();
    });

    it('returns undefined if message is missing', () => {
      const typedDataMessage = {
        domain: {
          name: 'Test Token',
          version: '1',
          chainId: 1,
          verifyingContract: '0x1234567890123456789012345678901234567890',
        },
        primaryType: 'Permit',
        types: {},
      };

      const spender = extractSpenderFromPermitMessage(typedDataMessage);
      expect(spender).toBeUndefined();
    });
  });

  describe('PRIMARY_TYPES_PERMIT', () => {
    it('contains expected permit types', () => {
      expect(PRIMARY_TYPES_PERMIT).toContain('Permit');
      expect(PRIMARY_TYPES_PERMIT).toContain('PermitSingle');
      expect(PRIMARY_TYPES_PERMIT).toContain('PermitBatch');
    });
  });
});
