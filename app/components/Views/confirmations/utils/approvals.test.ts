import BigNumber from 'bignumber.js';

import {
  buildApproveTransactionData,
  buildIncreaseAllowanceTransactionData,
  buildPermit2ApproveTransactionData,
  buildSetApproveForAllTransactionData,
} from '../../../../util/test/confirm-data-helpers';
import {
  calculateApprovalTokenAmount,
  calculateTokenBalance,
  parseApprovalTransactionData,
  updateApprovalAmount,
} from './approvals';

const SPENDER_MOCK = '0x0c54FcCd2e384b4BB6f2E405Bf5Cbc15a017AaFb';
const TOKEN_ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const AMOUNT_MOCK = 123;
const EXPIRATION_MOCK = 456;
const DATA_MOCK = '0x12345678';
const ADDRESS_MOCK = '0x1234567890123456789012345678901234567890';
const ADDRESS_2_MOCK = '0x1234567890123456789012345678901234567891';

describe('Approvals Utils', () => {
  describe('updateApprovalAmount', () => {
    it('updates legacy approval amount', () => {
      expect(
        updateApprovalAmount(
          buildApproveTransactionData(SPENDER_MOCK, AMOUNT_MOCK),
          1.23,
          5,
        ),
      ).toStrictEqual(buildApproveTransactionData(SPENDER_MOCK, 123000));
    });

    it('updates increaseAllowance amount', () => {
      expect(
        updateApprovalAmount(
          buildIncreaseAllowanceTransactionData(SPENDER_MOCK, AMOUNT_MOCK),
          1.23,
          5,
        ),
      ).toStrictEqual(
        buildIncreaseAllowanceTransactionData(SPENDER_MOCK, 123000),
      );
    });

    it('updates Permit2 approval amount', () => {
      expect(
        updateApprovalAmount(
          buildPermit2ApproveTransactionData(
            SPENDER_MOCK,
            TOKEN_ADDRESS_MOCK,
            AMOUNT_MOCK,
            EXPIRATION_MOCK,
          ),
          1.23,
          5,
        ),
      ).toStrictEqual(
        buildPermit2ApproveTransactionData(
          SPENDER_MOCK,
          TOKEN_ADDRESS_MOCK,
          123000,
          EXPIRATION_MOCK,
        ),
      );
    });
  });

  describe('parseApprovalTransactionData', () => {
    it('returns undefined if function does not match', () => {
      expect(parseApprovalTransactionData(DATA_MOCK)).toBeUndefined();
    });

    it('returns parsed data if approve', () => {
      expect(
        parseApprovalTransactionData(
          buildApproveTransactionData(ADDRESS_MOCK, AMOUNT_MOCK),
        ),
      ).toStrictEqual({
        amountOrTokenId: new BigNumber(AMOUNT_MOCK),
        isApproveAll: false,
        isRevokeAll: false,
        name: 'approve',
        tokenAddress: undefined,
      });
    });

    it('returns parsed data if increaseAllowance', () => {
      expect(
        parseApprovalTransactionData(
          buildIncreaseAllowanceTransactionData(ADDRESS_MOCK, AMOUNT_MOCK),
        ),
      ).toStrictEqual({
        amountOrTokenId: new BigNumber(AMOUNT_MOCK),
        isApproveAll: false,
        isRevokeAll: false,
        name: 'increaseAllowance',
        tokenAddress: undefined,
      });
    });

    it('returns parsed data if approved setApproveForAll', () => {
      expect(
        parseApprovalTransactionData(
          buildSetApproveForAllTransactionData(ADDRESS_MOCK, true),
        ),
      ).toStrictEqual({
        amountOrTokenId: undefined,
        isApproveAll: true,
        isRevokeAll: false,
        name: 'setApprovalForAll',
        tokenAddress: undefined,
      });
    });

    it('returns parsed data if revoked setApproveForAll', () => {
      expect(
        parseApprovalTransactionData(
          buildSetApproveForAllTransactionData(ADDRESS_MOCK, false),
        ),
      ).toStrictEqual({
        amountOrTokenId: undefined,
        isApproveAll: false,
        isRevokeAll: true,
        name: 'setApprovalForAll',
        tokenAddress: undefined,
      });
    });

    it('returns parsed data if Permit2 approve', () => {
      expect(
        parseApprovalTransactionData(
          buildPermit2ApproveTransactionData(
            ADDRESS_MOCK,
            ADDRESS_2_MOCK,
            AMOUNT_MOCK,
            EXPIRATION_MOCK,
          ),
        ),
      ).toStrictEqual({
        amountOrTokenId: new BigNumber(AMOUNT_MOCK),
        isApproveAll: false,
        isRevokeAll: false,
        name: 'approve',
        tokenAddress: ADDRESS_MOCK,
      });
    });
  });

  describe('calculateApprovalTokenAmount', () => {
    it('returns unlimited for amounts above threshold with custom decimals', () => {
      const unlimitedAmount = '1000000000000001';
      expect(calculateApprovalTokenAmount(unlimitedAmount, 0).amount).toBe(
        'Unlimited',
      );
      expect(calculateApprovalTokenAmount(unlimitedAmount, 0).rawAmount).toBe(
        unlimitedAmount,
      );
    });

    it('returns calculated amount for amounts equal to threshold', () => {
      const thresholdAmount = (10 ** 33).toString();
      expect(calculateApprovalTokenAmount(thresholdAmount).amount).toBe(
        '1000000000000000',
      );
    });

    it('returns calculated amount for amounts below threshold with default decimals', () => {
      const amount = '1000000000000000000'; // 1 token with 18 decimals
      expect(calculateApprovalTokenAmount(amount).amount).toBe('1');
    });

    it('returns calculated amount for amounts below threshold with custom decimals', () => {
      const amount = '123456'; // 1.23456 tokens with 5 decimals
      expect(calculateApprovalTokenAmount(amount, 5).amount).toBe('1.23456');
    });

    it('returns zero for zero amount with default decimals', () => {
      expect(calculateApprovalTokenAmount('0').amount).toBe('0');
    });

    it('returns zero for zero amount with custom decimals', () => {
      expect(calculateApprovalTokenAmount('0', 6).amount).toBe('0');
    });

    it('returns zero for undefined amount', () => {
      expect(
        calculateApprovalTokenAmount(undefined as unknown as string).amount,
      ).toBe('0');
    });

    it('returns zero for null amount', () => {
      expect(
        calculateApprovalTokenAmount(null as unknown as string).amount,
      ).toBe('0');
    });

    it('returns NaN for empty string amount', () => {
      expect(calculateApprovalTokenAmount('').amount).toBe('NaN');
    });

    it('handles very small amounts correctly', () => {
      const smallAmount = '1'; // 0.000000000000000001 with 18 decimals
      expect(calculateApprovalTokenAmount(smallAmount).amount).toBe('1e-18');
    });

    it('handles large amounts below threshold correctly', () => {
      // For 18 decimals, just below threshold: 10^33 - 1
      const largeAmount = (10 ** 33 - 1).toString();
      expect(calculateApprovalTokenAmount(largeAmount).amount).toBe(
        '1000000000000000',
      );
    });

    it('handles decimal amounts with custom precision', () => {
      const amount = '123456789'; // 1.23456789 tokens with 8 decimals
      expect(calculateApprovalTokenAmount(amount, 8).amount).toBe('1.23456789');
    });

    it('handles amounts just below threshold with custom decimals', () => {
      // For 6 decimals, just below threshold: 10^21 - 1
      const largeAmount = (10 ** 21 - 1).toString();
      expect(calculateApprovalTokenAmount(largeAmount, 6).amount).toBe(
        '1000000000000000',
      );
    });

    it('handles amounts exactly at threshold with custom decimals', () => {
      // For 6 decimals, exactly at threshold: 10^21
      const thresholdAmount = (10 ** 21).toString();
      expect(calculateApprovalTokenAmount(thresholdAmount, 6).amount).toBe(
        '1000000000000000',
      );
    });

    it('handles moderate amounts correctly', () => {
      const amount = '500000000000000000'; // 0.5 tokens with 18 decimals
      expect(calculateApprovalTokenAmount(amount).amount).toBe('0.5');
    });

    it('handles moderate amounts with custom decimals', () => {
      const amount = '500000'; // 0.5 tokens with 6 decimals
      expect(calculateApprovalTokenAmount(amount, 6).amount).toBe('0.5');
    });
  });

  describe('calculateTokenBalance', () => {
    it('calculates undefined tokenBalance', () => {
      expect(calculateTokenBalance(undefined)).toBe('0');
    });

    it('calculates null tokenBalance', () => {
      expect(calculateTokenBalance(null as unknown as string)).toBe('0');
    });

    it('calculates zero string tokenBalance', () => {
      expect(calculateTokenBalance('0')).toBe('0');
    });

    it('calculates undefined decimals', () => {
      expect(calculateTokenBalance('100', undefined)).toBe('100');
    });

    it('calculates null decimals', () => {
      expect(calculateTokenBalance('100', null as unknown as number)).toBe(
        '100',
      );
    });

    it('calculates zero decimals', () => {
      expect(calculateTokenBalance('100', 0)).toBe('100');
    });

    it('calculates positive decimals', () => {
      expect(calculateTokenBalance('100000', 5)).toBe('1');
    });

    it('calculates both undefined parameters', () => {
      expect(calculateTokenBalance(undefined, undefined)).toBe('0');
    });

    it('calculates undefined tokenBalance with defined decimals', () => {
      expect(calculateTokenBalance(undefined, 6)).toBe('0');
    });

    it('calculates defined tokenBalance with undefined decimals', () => {
      expect(calculateTokenBalance('1000000000000000000', undefined)).toBe(
        '1000000000000000000',
      );
    });

    it('calculates both defined parameters', () => {
      expect(calculateTokenBalance('1000000000000000000', 18)).toBe('1');
    });

    it('calculates negative tokenBalance', () => {
      expect(calculateTokenBalance('-1000000000000000000')).toBe(
        '-1000000000000000000',
      );
    });

    it('calculates negative decimals', () => {
      expect(calculateTokenBalance('100', -2)).toBe('10000');
    });

    it('calculates fractional tokenBalance with custom decimals', () => {
      expect(calculateTokenBalance('150000', 5)).toBe('1.5');
    });
  });
});
