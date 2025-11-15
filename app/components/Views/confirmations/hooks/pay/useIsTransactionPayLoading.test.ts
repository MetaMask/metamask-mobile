import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { useIsTransactionPayLoading } from './useIsTransactionPayLoading';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';

function runHook({
  isQuotesLoading,
  isUpdating,
}: {
  isQuotesLoading?: boolean;
  isUpdating?: boolean;
} = {}) {
  const { result } = renderHookWithProvider(useIsTransactionPayLoading, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      {
        confirmationMetrics: {
          isTransactionBridgeQuotesLoadingById: {
            [transactionIdMock]: isQuotesLoading,
          },
          isTransactionUpdating: { [transactionIdMock]: isUpdating },
        },
      },
    ),
  });

  return result;
}

describe('useIsTransactionPayLoading', () => {
  it('returns true if quotes loading', () => {
    const result = runHook({ isQuotesLoading: true });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns true if transaction updating', () => {
    const result = runHook({ isUpdating: true });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns false if neither quotes loading nor transaction updating', () => {
    const result = runHook({ isQuotesLoading: false, isUpdating: false });
    expect(result.current.isLoading).toBe(false);
  });
});
