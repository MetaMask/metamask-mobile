import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { usePredictOrderDepositTracking } from './usePredictOrderDepositTracking';

function runHook({
  transactionId,
  transactions = [],
}: {
  transactionId?: string;
  transactions?: TransactionMeta[];
}) {
  return renderHookWithProvider(
    () => usePredictOrderDepositTracking({ transactionId }),
    {
      state: {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions,
            },
          },
        },
      },
    },
  );
}

describe('usePredictOrderDepositTracking', () => {
  it('returns confirmed state when deposit transaction is confirmed', () => {
    const { result } = runHook({
      transactionId: 'tx-1',
      transactions: [
        {
          id: 'tx-1',
          status: TransactionStatus.confirmed,
        } as TransactionMeta,
      ],
    });

    expect(result.current.isConfirmed).toBe(true);
    expect(result.current.hasFailed).toBe(false);
  });

  it('returns failed state when deposit transaction fails', () => {
    const { result } = runHook({
      transactionId: 'tx-1',
      transactions: [
        {
          id: 'tx-1',
          status: TransactionStatus.failed,
        } as TransactionMeta,
      ],
    });

    expect(result.current.isConfirmed).toBe(false);
    expect(result.current.hasFailed).toBe(true);
  });

  it('returns neutral state when transaction id is missing', () => {
    const { result } = runHook({
      transactionId: undefined,
      transactions: [
        {
          id: 'tx-1',
          status: TransactionStatus.confirmed,
        } as TransactionMeta,
      ],
    });

    expect(result.current.isConfirmed).toBe(false);
    expect(result.current.hasFailed).toBe(false);
  });
});
