import { act } from 'react';
import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useUpdateTokenAmount } from './useUpdateTokenAmount';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import {
  updateAtomicBatchData,
  updateEditableParams,
} from '../../../../../util/transaction-controller';
import {
  otherControllersMock,
  tokenAddress1Mock,
} from '../../__mocks__/controllers/other-controllers-mock';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { toHex } from 'viem';
import Logger from '../../../../../util/Logger';

jest.mock('../../../../../util/transaction-controller');

jest.mock('../../../../../core/redux/slices/confirmationMetrics', () => ({
  ...(jest.requireActual(
    '../../../../../core/redux/slices/confirmationMetrics',
  ) as object),
  setTransactionUpdating: jest.fn(),
}));

const TOKEN_TRANSFER_DATA_MOCK =
  '0xa9059cbb0000000000000000000000005aeda56215b167893e80b4fe645ba6d5bab767de0000000000000000000000000000000000000000000000000000000000000001';

function runHook({
  transactionMeta,
}: {
  transactionMeta?: Partial<TransactionMeta>;
} = {}) {
  return renderHookWithProvider(useUpdateTokenAmount, {
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

describe('useUpdateTokenAmount', () => {
  const updateEditableParamsMock = jest.mocked(updateEditableParams);
  const updateAtomicBatchDataMock = jest.mocked(updateAtomicBatchData);

  beforeEach(() => {
    jest.resetAllMocks();

    updateAtomicBatchDataMock.mockResolvedValue('0x0');
  });

  it('updates all transaction data with new amount', () => {
    const { result } = runHook({
      transactionMeta: {
        txParams: {
          data: TOKEN_TRANSFER_DATA_MOCK,
          from: '0x13',
          to: tokenAddress1Mock,
        },
      },
    });

    result.current.updateTokenAmount('1.5');

    expect(updateEditableParamsMock).toHaveBeenCalledWith(expect.any(String), {
      data:
        TOKEN_TRANSFER_DATA_MOCK.substring(
          0,
          TOKEN_TRANSFER_DATA_MOCK.length - 4,
        ) + toHex(15000).substring(2),
      updateType: false,
    });
  });

  it('updates nested call data with new amount', () => {
    const { result } = runHook({
      transactionMeta: {
        nestedTransactions: [
          {
            data: '0x1234',
          },
          {
            data: TOKEN_TRANSFER_DATA_MOCK,
            to: tokenAddress1Mock,
          },
        ],
      },
    });

    result.current.updateTokenAmount('1.5');

    expect(updateAtomicBatchDataMock).toHaveBeenCalledWith({
      transactionId: expect.any(String),
      transactionIndex: 1,
      transactionData:
        TOKEN_TRANSFER_DATA_MOCK.substring(
          0,
          TOKEN_TRANSFER_DATA_MOCK.length - 4,
        ) + toHex(15000).substring(2),
    });
  });

  it('returns the nested update promise', async () => {
    let resolveUpdate: () => void = () => undefined;
    const updatePromise = new Promise<Hex>((resolve) => {
      resolveUpdate = () => resolve('0x0');
    });
    updateAtomicBatchDataMock.mockReturnValue(updatePromise);
    const { result } = runHook({
      transactionMeta: {
        nestedTransactions: [
          {
            data: '0x1234',
          },
          {
            data: TOKEN_TRANSFER_DATA_MOCK,
            to: tokenAddress1Mock,
          },
        ],
      },
    });

    let resultPromise: Promise<unknown> = Promise.resolve();
    act(() => {
      resultPromise = Promise.resolve(result.current.updateTokenAmount('1.5'));
    });
    let isSettled = false;
    resultPromise.then(() => {
      isSettled = true;
    });
    await Promise.resolve();

    expect(isSettled).toBe(false);

    resolveUpdate();
    await resultPromise;

    expect(isSettled).toBe(true);
  });

  it('logs and rejects nested update failures', async () => {
    const error = new Error('update failed');
    const loggerErrorSpy = jest.spyOn(Logger, 'error').mockImplementation();
    updateAtomicBatchDataMock.mockRejectedValue(error);
    const { result } = runHook({
      transactionMeta: {
        nestedTransactions: [
          {
            data: '0x1234',
          },
          {
            data: TOKEN_TRANSFER_DATA_MOCK,
            to: tokenAddress1Mock,
          },
        ],
      },
    });

    let updatePromise: Promise<unknown> = Promise.resolve();
    act(() => {
      updatePromise = Promise.resolve(result.current.updateTokenAmount('1.5'));
    });

    await expect(updatePromise).rejects.toThrow('update failed');
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      error,
      'Failed to update token amount in nested transaction',
    );
  });

  it('does not update amount if new amount is equal to current amount', () => {
    const { result } = runHook({
      transactionMeta: {
        txParams: {
          data: TOKEN_TRANSFER_DATA_MOCK,
          from: '0x13',
          to: tokenAddress1Mock,
        },
      },
    });

    result.current.updateTokenAmount('0.000000000000000001');

    expect(updateEditableParamsMock).not.toHaveBeenCalled();
    expect(updateAtomicBatchDataMock).not.toHaveBeenCalled();
  });

  it('does not throw when transaction has no token transfer data', () => {
    expect(() =>
      runHook({
        transactionMeta: {
          txParams: {
            data: '0x',
            from: '0x13',
            to: tokenAddress1Mock,
          },
        },
      }),
    ).not.toThrow();
  });
});
