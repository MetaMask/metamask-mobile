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
import { toHex } from 'viem';
import { setTransactionUpdating } from '../../../../../core/redux/slices/confirmationMetrics';
import { act } from '@testing-library/react-native';

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
  const setTransactionUpdatingMock = jest.mocked(setTransactionUpdating);

  beforeEach(() => {
    jest.resetAllMocks();

    updateAtomicBatchDataMock.mockResolvedValue('0x0');
    setTransactionUpdatingMock.mockReturnValue({ type: 'test' } as never);
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

  it('sets updating', async () => {
    const { result } = runHook({
      transactionMeta: {
        txParams: {
          data: TOKEN_TRANSFER_DATA_MOCK,
          from: '0x13',
          to: tokenAddress1Mock,
        },
      },
    });

    await act(async () => {
      result.current.updateTokenAmount('1.5');
    });

    expect(setTransactionUpdatingMock).toHaveBeenCalledWith({
      transactionId: expect.any(String),
      isUpdating: true,
    });
  });
});
