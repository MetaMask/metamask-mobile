import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { usePredictPayWithAnyTokenTracking } from './usePredictPayWithAnyTokenTracking';
import { PREDICTION_ERROR_TRANSACTION_BATCH_ID } from '../../../constants/transactions';

let mockActiveOrder: { batchId?: string; error?: string } | null = null;
let mockRouteParams: Record<string, unknown> = { isConfirmation: false };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('../../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    activeOrder: mockActiveOrder,
  }),
}));

function runHook(params: {
  onConfirm?: () => void;
  onFail?: (errorMessage?: string) => void;
  transactions?: TransactionMeta[];
}) {
  return renderHookWithProvider(
    () =>
      usePredictPayWithAnyTokenTracking({
        onConfirm: params.onConfirm,
        onFail: params.onFail,
      }),
    {
      state: {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: params.transactions ?? [],
            },
          },
        },
      },
    },
  );
}

describe('usePredictPayWithAnyTokenTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveOrder = null;
    mockRouteParams = { isConfirmation: false };
  });

  describe('status detection', () => {
    it('returns isConfirmed true when transaction with matching batchId is confirmed', () => {
      mockActiveOrder = { batchId: 'batch-1' };

      const { result } = runHook({
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.confirmed,
          } as TransactionMeta,
        ],
      });

      expect(result.current.isConfirmed).toBe(true);
      expect(result.current.isFailed).toBe(false);
      expect(result.current.isProcessing).toBe(false);
    });

    it('returns isFailed true when transaction with matching batchId failed', () => {
      mockActiveOrder = { batchId: 'batch-1' };

      const { result } = runHook({
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.failed,
          } as TransactionMeta,
        ],
      });

      expect(result.current.isFailed).toBe(true);
      expect(result.current.isConfirmed).toBe(false);
    });

    it('returns isFailed true when transaction is rejected', () => {
      mockActiveOrder = { batchId: 'batch-1' };

      const { result } = runHook({
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.rejected,
          } as TransactionMeta,
        ],
      });

      expect(result.current.isFailed).toBe(true);
      expect(result.current.isConfirmed).toBe(false);
    });

    it('returns neutral state when batchId is undefined', () => {
      mockActiveOrder = {};

      const { result } = runHook({
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.confirmed,
          } as TransactionMeta,
        ],
      });

      expect(result.current.isConfirmed).toBe(false);
      expect(result.current.isFailed).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.errorMessage).toBeUndefined();
    });

    it('returns isProcessing true when transaction is signed', () => {
      mockActiveOrder = { batchId: 'batch-1' };

      const { result } = runHook({
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.signed,
          } as TransactionMeta,
        ],
      });

      expect(result.current.isProcessing).toBe(true);
      expect(result.current.isConfirmed).toBe(false);
      expect(result.current.isFailed).toBe(false);
    });

    it('returns isProcessing true when transaction is submitted', () => {
      mockActiveOrder = { batchId: 'batch-1' };

      const { result } = runHook({
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.submitted,
          } as TransactionMeta,
        ],
      });

      expect(result.current.isProcessing).toBe(true);
      expect(result.current.isConfirmed).toBe(false);
      expect(result.current.isFailed).toBe(false);
    });

    it('returns error message from transaction.error.message', () => {
      mockActiveOrder = { batchId: 'batch-1' };

      const { result } = runHook({
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.failed,
            error: { message: 'Transaction reverted' },
          } as TransactionMeta,
        ],
      });

      expect(result.current.errorMessage).toBe('Transaction reverted');
    });

    it('returns error message from transaction.errormsg as fallback', () => {
      mockActiveOrder = { batchId: 'batch-1' };

      const { result } = runHook({
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.failed,
            errormsg: 'Fallback error message',
          } as unknown as TransactionMeta,
        ],
      });

      expect(result.current.errorMessage).toBe('Fallback error message');
    });
  });

  describe('controller error handling', () => {
    it('returns isFailed true when activeOrder has error and batchId is PREDICTION_ERROR_TRANSACTION_BATCH_ID', () => {
      mockActiveOrder = {
        batchId: PREDICTION_ERROR_TRANSACTION_BATCH_ID,
        error: 'Controller error occurred',
      };

      const { result } = runHook({
        transactions: [],
      });

      expect(result.current.isFailed).toBe(true);
    });
  });

  describe('onConfirm callback', () => {
    it('calls onConfirm when transaction becomes confirmed', () => {
      mockActiveOrder = { batchId: 'batch-1' };
      const onConfirm = jest.fn();

      runHook({
        onConfirm,
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.confirmed,
          } as TransactionMeta,
        ],
      });

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm only once across rerenders', () => {
      mockActiveOrder = { batchId: 'batch-1' };
      const onConfirm = jest.fn();

      const { rerender } = runHook({
        onConfirm,
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.confirmed,
          } as TransactionMeta,
        ],
      });

      rerender(undefined);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('onFail callback', () => {
    it('calls onFail with error message when transaction fails', () => {
      mockActiveOrder = { batchId: 'batch-1' };
      const onFail = jest.fn();

      runHook({
        onFail,
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.failed,
            error: { message: 'Transaction failed on-chain' },
          } as TransactionMeta,
        ],
      });

      expect(onFail).toHaveBeenCalledTimes(1);
      expect(onFail).toHaveBeenCalledWith('Transaction failed on-chain');
    });

    it('calls onFail only once across rerenders', () => {
      mockActiveOrder = { batchId: 'batch-1' };
      const onFail = jest.fn();

      const { rerender } = runHook({
        onFail,
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.failed,
            error: { message: 'fail' },
          } as TransactionMeta,
        ],
      });

      rerender(undefined);

      expect(onFail).toHaveBeenCalledTimes(1);
    });

    it('calls onFail with activeOrder.error when controller error occurs', () => {
      mockActiveOrder = {
        batchId: PREDICTION_ERROR_TRANSACTION_BATCH_ID,
        error: 'Controller error occurred',
      };
      const onFail = jest.fn();

      runHook({
        onFail,
        transactions: [],
      });

      expect(onFail).toHaveBeenCalledTimes(1);
      expect(onFail).toHaveBeenCalledWith('Controller error occurred');
    });
  });

  describe('batchId change tracking', () => {
    it('resets callback dedup refs when batchId changes', () => {
      mockActiveOrder = { batchId: 'batch-1' };
      const onConfirm = jest.fn();

      const { rerender } = runHook({
        onConfirm,
        transactions: [
          {
            id: 'tx-1',
            batchId: 'batch-1',
            status: TransactionStatus.confirmed,
          } as TransactionMeta,
          {
            id: 'tx-2',
            batchId: 'batch-2',
            status: TransactionStatus.confirmed,
          } as TransactionMeta,
        ],
      });

      expect(onConfirm).toHaveBeenCalledTimes(1);

      mockActiveOrder = { batchId: 'batch-2' };
      rerender(undefined);

      expect(onConfirm).toHaveBeenCalledTimes(2);
    });
  });
});
