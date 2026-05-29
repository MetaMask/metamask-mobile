import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useUpdateTransactionPayAmount } from './useUpdateTransactionPayAmount';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import {
  updateAtomicBatchData,
  updateTransaction,
} from '../../../../../util/transaction-controller';
import {
  updateMoneyAccountDepositTokenAmount,
  updateMoneyAccountWithdrawTokenAmount,
} from '../../../../UI/Money/utils/moneyAccountTransactions';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useUpdateTokenAmount } from '../transactions/useUpdateTokenAmount';
import Logger from '../../../../../util/Logger';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import { TransactionPayRequiredToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';

jest.mock('../../../../../util/transaction-controller');
jest.mock('../../../../UI/Money/utils/moneyAccountTransactions');
jest.mock('../transactions/useUpdateTokenAmount');
jest.mock('../../../../../util/Logger');
jest.mock('./useTransactionPayData');

const moneyAccountDepositMeta: Partial<TransactionMeta> = {
  type: TransactionType.moneyAccountDeposit,
};

const moneyAccountWithdrawMeta: Partial<TransactionMeta> = {
  type: TransactionType.moneyAccountWithdraw,
};

function runHook({
  transactionMeta,
}: {
  transactionMeta?: Partial<TransactionMeta>;
} = {}) {
  return renderHookWithProvider(useUpdateTransactionPayAmount, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      transactionMeta
        ? {
            engine: {
              backgroundState: {
                TransactionController: {
                  transactions: [transactionMeta],
                },
              },
            },
          }
        : {},
    ),
  });
}

describe('useUpdateTransactionPayAmount', () => {
  const updateAtomicBatchDataMock = jest.mocked(updateAtomicBatchData);
  const updateTransactionMock = jest.mocked(updateTransaction);
  const updateMoneyAccountDepositTokenAmountMock = jest.mocked(
    updateMoneyAccountDepositTokenAmount,
  );
  const updateMoneyAccountWithdrawTokenAmountMock = jest.mocked(
    updateMoneyAccountWithdrawTokenAmount,
  );
  const useUpdateTokenAmountMock = jest.mocked(useUpdateTokenAmount);
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );
  const updateTokenAmountMock = jest.fn();
  const loggerErrorMock = jest.mocked(Logger.error);

  beforeEach(() => {
    jest.resetAllMocks();
    updateAtomicBatchDataMock.mockResolvedValue('0x0');
    useUpdateTokenAmountMock.mockReturnValue({
      updateTokenAmount: updateTokenAmountMock,
    });
    useTransactionPayRequiredTokensMock.mockReturnValue([]);
  });

  async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('calls updateAtomicBatchData for each update returned from updateMoneyAccountDepositTokenAmount', async () => {
    updateMoneyAccountDepositTokenAmountMock.mockResolvedValue([
      { nestedTransactionIndex: 0, transactionData: '0xaaaa' },
      { nestedTransactionIndex: 2, transactionData: '0xbbbb' },
    ]);

    const { result } = runHook({ transactionMeta: moneyAccountDepositMeta });

    result.current.updateTransactionPayAmount('1.23');

    await flushPromises();

    expect(updateMoneyAccountDepositTokenAmountMock).toHaveBeenCalledTimes(1);
    expect(updateMoneyAccountDepositTokenAmountMock).toHaveBeenCalledWith(
      expect.any(Object),
      '1.23',
    );
    expect(updateAtomicBatchDataMock).toHaveBeenCalledTimes(2);
    expect(updateAtomicBatchDataMock).toHaveBeenNthCalledWith(1, {
      transactionId: expect.any(String),
      transactionIndex: 0,
      transactionData: '0xaaaa',
    });
    expect(updateAtomicBatchDataMock).toHaveBeenNthCalledWith(2, {
      transactionId: expect.any(String),
      transactionIndex: 2,
      transactionData: '0xbbbb',
    });
    expect(updateTokenAmountMock).not.toHaveBeenCalled();
  });

  it('does not call updateAtomicBatchData when no updates are returned', async () => {
    updateMoneyAccountDepositTokenAmountMock.mockResolvedValue([]);

    const { result } = runHook({ transactionMeta: moneyAccountDepositMeta });

    result.current.updateTransactionPayAmount('1.23');

    await flushPromises();

    expect(updateAtomicBatchDataMock).not.toHaveBeenCalled();
  });

  it('does not call updateMoneyAccountDepositTokenAmount when there is no transaction meta', async () => {
    const { result } = renderHookWithProvider(useUpdateTransactionPayAmount, {
      state: merge(
        {},
        transactionApprovalControllerMock,
        otherControllersMock,
        {
          engine: {
            backgroundState: {
              TransactionController: { transactions: [] },
            },
          },
        },
      ),
    });

    result.current.updateTransactionPayAmount('1.23');

    await flushPromises();

    expect(updateMoneyAccountDepositTokenAmountMock).not.toHaveBeenCalled();
    expect(updateMoneyAccountWithdrawTokenAmountMock).not.toHaveBeenCalled();
    expect(updateAtomicBatchDataMock).not.toHaveBeenCalled();
    expect(updateTokenAmountMock).not.toHaveBeenCalled();
  });

  it('delegates to updateTokenAmount for transactions that are neither money account deposit nor withdraw', () => {
    const { result } = runHook();

    result.current.updateTransactionPayAmount('1.23');

    expect(updateTokenAmountMock).toHaveBeenCalledWith('1.23');
    expect(updateMoneyAccountDepositTokenAmountMock).not.toHaveBeenCalled();
    expect(updateMoneyAccountWithdrawTokenAmountMock).not.toHaveBeenCalled();
    expect(updateAtomicBatchDataMock).not.toHaveBeenCalled();
  });

  it('logs an error when updateAtomicBatchData rejects', async () => {
    const error = new Error('boom');
    updateAtomicBatchDataMock.mockRejectedValue(error);
    updateMoneyAccountDepositTokenAmountMock.mockResolvedValue([
      { nestedTransactionIndex: 0, transactionData: '0xaaaa' },
    ]);

    const { result } = runHook({ transactionMeta: moneyAccountDepositMeta });

    result.current.updateTransactionPayAmount('1.23');

    await flushPromises();

    expect(loggerErrorMock).toHaveBeenCalledWith(
      error,
      expect.stringContaining(
        'Failed to update transaction pay amount in nested transaction',
      ),
    );
  });

  it('logs an error when updateMoneyAccountDepositTokenAmount rejects', async () => {
    const error = new Error('rpc failure');
    updateMoneyAccountDepositTokenAmountMock.mockRejectedValue(error);

    const { result } = runHook({ transactionMeta: moneyAccountDepositMeta });

    result.current.updateTransactionPayAmount('1.23');

    await flushPromises();

    expect(updateAtomicBatchDataMock).not.toHaveBeenCalled();
    expect(loggerErrorMock).toHaveBeenCalledWith(
      error,
      expect.stringContaining('Failed to prepare Money Account deposit'),
    );
  });

  it('calls updateAtomicBatchData for each update returned from updateMoneyAccountWithdrawTokenAmount', async () => {
    updateMoneyAccountWithdrawTokenAmountMock.mockResolvedValue([
      { nestedTransactionIndex: 0, transactionData: '0xcccc' },
      { nestedTransactionIndex: 1, transactionData: '0xdddd' },
    ]);

    const { result } = runHook({ transactionMeta: moneyAccountWithdrawMeta });

    result.current.updateTransactionPayAmount('4.56');

    await flushPromises();

    expect(updateMoneyAccountWithdrawTokenAmountMock).toHaveBeenCalledTimes(1);
    expect(updateMoneyAccountWithdrawTokenAmountMock).toHaveBeenCalledWith(
      expect.any(Object),
      '4.56',
    );
    expect(updateAtomicBatchDataMock).toHaveBeenCalledTimes(2);
    expect(updateAtomicBatchDataMock).toHaveBeenNthCalledWith(1, {
      transactionId: expect.any(String),
      transactionIndex: 0,
      transactionData: '0xcccc',
    });
    expect(updateAtomicBatchDataMock).toHaveBeenNthCalledWith(2, {
      transactionId: expect.any(String),
      transactionIndex: 1,
      transactionData: '0xdddd',
    });
    expect(updateMoneyAccountDepositTokenAmountMock).not.toHaveBeenCalled();
    expect(updateTokenAmountMock).not.toHaveBeenCalled();
  });

  it('does not call updateAtomicBatchData when withdraw updater returns no updates', async () => {
    updateMoneyAccountWithdrawTokenAmountMock.mockResolvedValue([]);

    const { result } = runHook({ transactionMeta: moneyAccountWithdrawMeta });

    result.current.updateTransactionPayAmount('4.56');

    await flushPromises();

    expect(updateMoneyAccountWithdrawTokenAmountMock).toHaveBeenCalledTimes(1);
    expect(updateAtomicBatchDataMock).not.toHaveBeenCalled();
  });

  it('logs an error when updateMoneyAccountWithdrawTokenAmount rejects', async () => {
    const error = new Error('withdraw rpc failure');
    updateMoneyAccountWithdrawTokenAmountMock.mockRejectedValue(error);

    const { result } = runHook({ transactionMeta: moneyAccountWithdrawMeta });

    result.current.updateTransactionPayAmount('4.56');

    await flushPromises();

    expect(updateAtomicBatchDataMock).not.toHaveBeenCalled();
    expect(loggerErrorMock).toHaveBeenCalledWith(
      error,
      expect.stringContaining('Failed to prepare Money Account withdraw'),
    );
  });

  describe('syncMoneyAccountDepositRequiredAssets', () => {
    const TOKEN_ADDRESS_MOCK = '0xToken' as Hex;
    const existingRequiredAsset = {
      address: TOKEN_ADDRESS_MOCK,
      amount: '0x0' as Hex,
      standard: 'erc20',
    };
    const moneyAccountDepositMetaWithRequiredAssets = {
      ...moneyAccountDepositMeta,
      requiredAssets: [existingRequiredAsset],
    };

    beforeEach(() => {
      updateMoneyAccountDepositTokenAmountMock.mockResolvedValue([]);
      useTransactionPayRequiredTokensMock.mockReturnValue([
        { decimals: 6 } as TransactionPayRequiredToken,
      ]);
    });

    it('calls updateTransaction with hex-encoded amount when requiredAssets exist', async () => {
      const { result } = runHook({
        transactionMeta: moneyAccountDepositMetaWithRequiredAssets,
      });

      result.current.updateTransactionPayAmount('1');

      await flushPromises();

      expect(updateTransactionMock).toHaveBeenCalledTimes(1);
      expect(updateTransactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredAssets: [{ ...existingRequiredAsset, amount: '0xf4240' }],
        }),
        'Money Account deposit: sync requiredAssets amount',
      );
    });

    it('rounds fractional atomic amounts up before encoding', async () => {
      const { result } = runHook({
        transactionMeta: moneyAccountDepositMetaWithRequiredAssets,
      });

      result.current.updateTransactionPayAmount('1.0000005');

      await flushPromises();

      expect(updateTransactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredAssets: [{ ...existingRequiredAsset, amount: '0xf4241' }],
        }),
        expect.any(String),
      );
    });

    it('does not call updateTransaction when transactionMeta has no requiredAssets', async () => {
      const { result } = runHook({ transactionMeta: moneyAccountDepositMeta });

      result.current.updateTransactionPayAmount('1');

      await flushPromises();

      expect(updateTransactionMock).not.toHaveBeenCalled();
    });

    it('does not call updateTransaction when no required tokens are available', async () => {
      useTransactionPayRequiredTokensMock.mockReturnValue([]);

      const { result } = runHook({
        transactionMeta: moneyAccountDepositMetaWithRequiredAssets,
      });

      result.current.updateTransactionPayAmount('1');

      await flushPromises();

      expect(updateTransactionMock).not.toHaveBeenCalled();
    });

    it('does not call updateTransaction when computed amount matches existing amount', async () => {
      const { result } = runHook({
        transactionMeta: {
          ...moneyAccountDepositMeta,
          requiredAssets: [{ ...existingRequiredAsset, amount: '0xf4240' }],
        },
      });

      result.current.updateTransactionPayAmount('1');

      await flushPromises();

      expect(updateTransactionMock).not.toHaveBeenCalled();
    });

    it('does not run sync logic for non-deposit transaction types', async () => {
      updateMoneyAccountWithdrawTokenAmountMock.mockResolvedValue([]);

      const { result } = runHook({
        transactionMeta: {
          ...moneyAccountWithdrawMeta,
          requiredAssets: [existingRequiredAsset],
        },
      });

      result.current.updateTransactionPayAmount('1');

      await flushPromises();

      expect(updateTransactionMock).not.toHaveBeenCalled();
    });

    it('logs an error when updateTransaction throws', async () => {
      const error = new Error('updateTransaction failed');
      updateTransactionMock.mockImplementation(() => {
        throw error;
      });

      const { result } = runHook({
        transactionMeta: moneyAccountDepositMetaWithRequiredAssets,
      });

      result.current.updateTransactionPayAmount('1');

      await flushPromises();

      expect(loggerErrorMock).toHaveBeenCalledWith(
        error,
        'Failed to sync Money Account deposit requiredAssets amount',
      );
    });

    it('still applies money account deposit updates after syncing requiredAssets', async () => {
      updateMoneyAccountDepositTokenAmountMock.mockResolvedValue([
        { nestedTransactionIndex: 0, transactionData: '0xaaaa' },
      ]);

      const { result } = runHook({
        transactionMeta: moneyAccountDepositMetaWithRequiredAssets,
      });

      result.current.updateTransactionPayAmount('1');

      await flushPromises();

      expect(updateTransactionMock).toHaveBeenCalledTimes(1);
      expect(updateAtomicBatchDataMock).toHaveBeenCalledTimes(1);
    });
  });
});
