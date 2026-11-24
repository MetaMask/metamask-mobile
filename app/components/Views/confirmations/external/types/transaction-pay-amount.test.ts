import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { getTransactionPayAmountCalls } from './transaction-pay-amount';
import {
  updateMoneyAccountDepositTokenAmount,
  updateMoneyAccountWithdrawTokenAmount,
} from '../../../../UI/Money/utils/moneyAccountTransactions';

jest.mock('../../../../UI/Money/utils/moneyAccountTransactions');

const AMOUNT_MOCK = '1.23';
const OVERRIDE_ADDRESS_MOCK =
  '0x1111111111111111111111111111111111111111' as Hex;

const DEPOSIT_CALLS_MOCK = [
  { nestedTransactionIndex: 0, transactionData: '0xaaaa' as Hex },
];

const WITHDRAW_CALLS_MOCK = [
  { nestedTransactionIndex: 1, transactionData: '0xbbbb' as Hex },
];

function buildTransactionMeta(type: TransactionType): TransactionMeta {
  return { id: 'test-id', type } as TransactionMeta;
}

describe('getTransactionPayAmountCalls', () => {
  const MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE =
    TransactionType.membershipSubscription;
  const updateMoneyAccountDepositTokenAmountMock = jest.mocked(
    updateMoneyAccountDepositTokenAmount,
  );
  const updateMoneyAccountWithdrawTokenAmountMock = jest.mocked(
    updateMoneyAccountWithdrawTokenAmount,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns undefined for transaction types without bespoke amount handling', async () => {
    const result = await getTransactionPayAmountCalls(
      buildTransactionMeta(TransactionType.simpleSend),
      AMOUNT_MOCK,
    );

    expect(result).toBeUndefined();
    expect(updateMoneyAccountDepositTokenAmountMock).not.toHaveBeenCalled();
    expect(updateMoneyAccountWithdrawTokenAmountMock).not.toHaveBeenCalled();
  });

  describe('money account deposit', () => {
    it.each([
      TransactionType.moneyAccountDeposit,
      MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE,
    ])('returns the calls from the deposit util for %s', async (type) => {
      const transactionMeta = buildTransactionMeta(type);
      updateMoneyAccountDepositTokenAmountMock.mockResolvedValue(
        DEPOSIT_CALLS_MOCK,
      );

      const result = await getTransactionPayAmountCalls(
        transactionMeta,
        AMOUNT_MOCK,
      );

      expect(updateMoneyAccountDepositTokenAmountMock).toHaveBeenCalledWith(
        transactionMeta,
        AMOUNT_MOCK,
      );
      expect(result).toStrictEqual(DEPOSIT_CALLS_MOCK);
    });

    it('returns an empty array when the deposit util produces no calls', async () => {
      const transactionMeta = buildTransactionMeta(
        TransactionType.moneyAccountDeposit,
      );
      updateMoneyAccountDepositTokenAmountMock.mockResolvedValue([]);

      const result = await getTransactionPayAmountCalls(
        transactionMeta,
        AMOUNT_MOCK,
      );

      expect(result).toStrictEqual([]);
    });

    it('prefixes deposit errors', async () => {
      const transactionMeta = buildTransactionMeta(
        TransactionType.moneyAccountDeposit,
      );
      updateMoneyAccountDepositTokenAmountMock.mockRejectedValue(
        new Error('rpc failure'),
      );

      await expect(
        getTransactionPayAmountCalls(transactionMeta, AMOUNT_MOCK),
      ).rejects.toThrow('Money Account Deposit: rpc failure');
    });
  });

  describe('money account withdraw', () => {
    const transactionMeta = buildTransactionMeta(
      TransactionType.moneyAccountWithdraw,
    );

    it('returns the calls from the withdraw util and forwards the account override', async () => {
      updateMoneyAccountWithdrawTokenAmountMock.mockResolvedValue(
        WITHDRAW_CALLS_MOCK,
      );

      const result = await getTransactionPayAmountCalls(
        transactionMeta,
        AMOUNT_MOCK,
        OVERRIDE_ADDRESS_MOCK,
      );

      expect(updateMoneyAccountWithdrawTokenAmountMock).toHaveBeenCalledWith(
        transactionMeta,
        AMOUNT_MOCK,
        OVERRIDE_ADDRESS_MOCK,
      );
      expect(result).toStrictEqual(WITHDRAW_CALLS_MOCK);
    });

    it('prefixes withdraw errors', async () => {
      updateMoneyAccountWithdrawTokenAmountMock.mockRejectedValue(
        new Error('withdraw rpc failure'),
      );

      await expect(
        getTransactionPayAmountCalls(transactionMeta, AMOUNT_MOCK),
      ).rejects.toThrow('Money Account Withdrawal: withdraw rpc failure');
    });
  });
});
