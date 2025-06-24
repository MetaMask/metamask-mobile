import BigNumber from 'bignumber.js';

import {
  buildApproveTransactionData,
  buildIncreaseAllowanceTransactionData,
  buildPermit2ApproveTransactionData,
  buildSetApproveForAllTransactionData,
} from '../../../../util/test/confirm-data-helpers';
import {
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
});
