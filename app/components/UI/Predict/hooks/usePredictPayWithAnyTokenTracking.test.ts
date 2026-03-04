import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { usePredictPayWithAnyTokenTracking } from './usePredictPayWithAnyTokenTracking';

function runHook({
  transactionId,
  onConfirm,
  onFail,
  transactions = [],
}: {
  transactionId?: string;
  onConfirm?: () => void;
  onFail?: (errorMessage?: string) => void;
  transactions?: TransactionMeta[];
}) {
  return renderHookWithProvider(
    () =>
      usePredictPayWithAnyTokenTracking({ transactionId, onConfirm, onFail }),
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

describe('usePredictPayWithAnyTokenTracking', () => {
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
    expect(result.current.isFailed).toBe(false);
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('returns failed state when deposit transaction fails', () => {
    const { result } = runHook({
      transactionId: 'tx-1',
      transactions: [
        {
          id: 'tx-1',
          status: TransactionStatus.failed,
          error: {
            message: 'Transaction failed on-chain',
          },
        } as TransactionMeta,
      ],
    });

    expect(result.current.isConfirmed).toBe(false);
    expect(result.current.isFailed).toBe(true);
    expect(result.current.errorMessage).toBe('Transaction failed on-chain');
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
    expect(result.current.isFailed).toBe(false);
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('calls onConfirm when transaction is confirmed', () => {
    const onConfirm = jest.fn();

    const { rerender } = runHook({
      transactionId: 'tx-1',
      onConfirm,
      transactions: [
        {
          id: 'tx-1',
          status: TransactionStatus.confirmed,
        } as TransactionMeta,
      ],
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);

    rerender();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onFail with error message when transaction fails', () => {
    const onFail = jest.fn();

    const { rerender } = runHook({
      transactionId: 'tx-1',
      onFail,
      transactions: [
        {
          id: 'tx-1',
          status: TransactionStatus.failed,
          error: {
            message: 'Transaction failed on-chain',
          },
        } as TransactionMeta,
      ],
    });

    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onFail).toHaveBeenCalledWith('Transaction failed on-chain');

    rerender();

    expect(onFail).toHaveBeenCalledTimes(1);
  });
});
