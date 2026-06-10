import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import Engine from '../../../../Engine';
import {
  handleTransactionSubmittedForOriginatingAddress,
  type MetamaskPayWithOrigin,
} from './persist-originating-address';

jest.mock('../../../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      TransactionController: {
        state: { transactions: [] as TransactionMeta[] },
        updateTransaction: jest.fn(),
      },
      TransactionPayController: {
        state: { transactionData: {} as Record<string, unknown> },
      },
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock(
  '../../../../../components/Views/confirmations/utils/transaction',
  () => ({
    hasTransactionType: jest.fn(),
  }),
);

import { hasTransactionType } from '../../../../../components/Views/confirmations/utils/transaction';

const hasTransactionTypeMock = jest.mocked(hasTransactionType);

const TRANSACTION_ID = 'tx-1';
const ADDRESS: Hex = '0xabc0000000000000000000000000000000000001';

const updateTransactionMock = jest.mocked(
  Engine.context.TransactionController.updateTransaction,
);

function setTransactions(transactions: Partial<TransactionMeta>[]) {
  Engine.context.TransactionController.state = {
    transactions: transactions as TransactionMeta[],
  } as never;
}

function setTransactionData(data: Record<string, unknown>) {
  Engine.context.TransactionPayController.state = {
    transactionData: data,
  } as never;
}

function makeTransaction(
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta {
  return {
    id: TRANSACTION_ID,
    type: TransactionType.moneyAccountDeposit,
    ...overrides,
  } as TransactionMeta;
}

describe('handleTransactionSubmittedForOriginatingAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setTransactions([]);
    setTransactionData({});
    hasTransactionTypeMock.mockReturnValue(false);
  });

  it('writes originatingAddress from accountOverride onto metamaskPay', () => {
    hasTransactionTypeMock.mockReturnValue(true);
    setTransactions([
      {
        id: TRANSACTION_ID,
        metamaskPay: { chainId: '0x1', totalFiat: '10.00' },
      },
    ]);
    setTransactionData({
      [TRANSACTION_ID]: { accountOverride: ADDRESS },
    });

    handleTransactionSubmittedForOriginatingAddress(makeTransaction());

    expect(updateTransactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: TRANSACTION_ID,
        metamaskPay: expect.objectContaining({
          chainId: '0x1',
          totalFiat: '10.00',
          originatingAddress: ADDRESS,
        }),
      }),
      'Persist originating account for money transaction',
    );
  });

  it('preserves existing metamaskPay fields', () => {
    hasTransactionTypeMock.mockReturnValue(true);
    setTransactions([
      {
        id: TRANSACTION_ID,
        metamaskPay: {
          chainId: '0x89',
          tokenAddress: '0xtoken',
          totalFiat: '50.00',
        },
      },
    ]);
    setTransactionData({
      [TRANSACTION_ID]: { accountOverride: ADDRESS },
    });

    handleTransactionSubmittedForOriginatingAddress(makeTransaction());

    const updatedMeta = updateTransactionMock.mock.calls[0][0];
    const pay = updatedMeta.metamaskPay as MetamaskPayWithOrigin;
    expect(pay.chainId).toBe('0x89');
    expect(pay.tokenAddress).toBe('0xtoken');
    expect(pay.totalFiat).toBe('50.00');
    expect(pay.originatingAddress).toBe(ADDRESS);
  });

  it('skips non-money-account transactions', () => {
    hasTransactionTypeMock.mockReturnValue(false);
    setTransactionData({
      [TRANSACTION_ID]: { accountOverride: ADDRESS },
    });

    handleTransactionSubmittedForOriginatingAddress(
      makeTransaction({ type: TransactionType.simpleSend }),
    );

    expect(updateTransactionMock).not.toHaveBeenCalled();
  });

  it('no-ops when accountOverride is not set', () => {
    hasTransactionTypeMock.mockReturnValue(true);
    setTransactions([{ id: TRANSACTION_ID }]);
    setTransactionData({
      [TRANSACTION_ID]: {},
    });

    handleTransactionSubmittedForOriginatingAddress(makeTransaction());

    expect(updateTransactionMock).not.toHaveBeenCalled();
  });

  it('no-ops when transactionData entry does not exist', () => {
    hasTransactionTypeMock.mockReturnValue(true);
    setTransactions([{ id: TRANSACTION_ID }]);
    setTransactionData({});

    handleTransactionSubmittedForOriginatingAddress(makeTransaction());

    expect(updateTransactionMock).not.toHaveBeenCalled();
  });

  it('no-ops when the transaction is not in TransactionController state', () => {
    hasTransactionTypeMock.mockReturnValue(true);
    setTransactions([{ id: 'other-tx' }]);
    setTransactionData({
      [TRANSACTION_ID]: { accountOverride: ADDRESS },
    });

    handleTransactionSubmittedForOriginatingAddress(makeTransaction());

    expect(updateTransactionMock).not.toHaveBeenCalled();
  });

  it('does not throw when updateTransaction fails', () => {
    hasTransactionTypeMock.mockReturnValue(true);
    setTransactions([{ id: TRANSACTION_ID, metamaskPay: { chainId: '0x1' } }]);
    setTransactionData({
      [TRANSACTION_ID]: { accountOverride: ADDRESS },
    });
    updateTransactionMock.mockImplementation(() => {
      throw new Error('controller error');
    });

    expect(() =>
      handleTransactionSubmittedForOriginatingAddress(makeTransaction()),
    ).not.toThrow();
  });
});
