import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useUpdateTransactionPayAmount } from './useUpdateTransactionPayAmount';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { updateAtomicBatchData } from '../../../../../util/transaction-controller';
import { updateMoneyAccountDepositTokenAmount } from '../../../../UI/Money/utils/moneyAccountTransactions';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useUpdateTokenAmount } from '../transactions/useUpdateTokenAmount';
import Logger from '../../../../../util/Logger';

jest.mock('../../../../../util/transaction-controller');
jest.mock('../../../../UI/Money/utils/moneyAccountTransactions');
jest.mock('../transactions/useUpdateTokenAmount');
jest.mock('../../../../../util/Logger');

const moneyAccountDepositMeta: Partial<TransactionMeta> = {
  type: TransactionType.moneyAccountDeposit,
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
  const updateMoneyAccountDepositTokenAmountMock = jest.mocked(
    updateMoneyAccountDepositTokenAmount,
  );
  const useUpdateTokenAmountMock = jest.mocked(useUpdateTokenAmount);
  const updateTokenAmountMock = jest.fn();
  const loggerErrorMock = jest.mocked(Logger.error);

  beforeEach(() => {
    jest.resetAllMocks();
    updateAtomicBatchDataMock.mockResolvedValue('0x0');
    useUpdateTokenAmountMock.mockReturnValue({
      updateTokenAmount: updateTokenAmountMock,
    });
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
    expect(updateAtomicBatchDataMock).not.toHaveBeenCalled();
    expect(updateTokenAmountMock).not.toHaveBeenCalled();
  });

  it('delegates to updateTokenAmount for non-moneyAccountDeposit transactions', () => {
    const { result } = runHook();

    result.current.updateTransactionPayAmount('1.23');

    expect(updateTokenAmountMock).toHaveBeenCalledWith('1.23');
    expect(updateMoneyAccountDepositTokenAmountMock).not.toHaveBeenCalled();
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
});
