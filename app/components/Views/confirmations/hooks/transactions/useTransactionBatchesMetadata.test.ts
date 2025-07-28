import { personalSignatureConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { generateStablecoinLendingDepositConfirmationState } from '../../__mocks__/controllers/transaction-batch-mock';
import { useTransactionBatchesMetadata } from './useTransactionBatchesMetadata';

describe('useTransactionBatchesMetadata', () => {
  it('returns transaction metadata', () => {
    const { result } = renderHookWithProvider(useTransactionBatchesMetadata, {
      state: generateStablecoinLendingDepositConfirmationState,
    });

    expect(result.current).toEqual(
      generateStablecoinLendingDepositConfirmationState.engine.backgroundState
        .TransactionController.transactionBatches[0],
    );
  });

  it('returns undefined when approval type is not Transaction', () => {
    const { result } = renderHookWithProvider(useTransactionBatchesMetadata, {
      state: personalSignatureConfirmationState,
    });

    expect(result.current).toBeUndefined();
  });
});
