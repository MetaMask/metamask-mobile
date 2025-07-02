import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { updateEditableParams } from '../../../../util/transaction-controller';
import { approveERC20TransactionStateMock } from '../__mocks__/approve-transaction-mock';
import { useApproveTransactionActions } from './useApproveTransactionActions';

jest.mock('../../../../util/transaction-controller', () => ({
  updateEditableParams: jest.fn(),
}));

describe('useApproveTransactionActions', () => {
  const mockUpdateEditableParams = jest.mocked(updateEditableParams);

  it('updates transaction data via updateEditableParams', async () => {
    const { result } = renderHookWithProvider(
      () => useApproveTransactionActions(),
      {
        state: approveERC20TransactionStateMock,
      },
    );
    await result.current.onSpendingCapUpdate('100');
    expect(mockUpdateEditableParams).toHaveBeenCalledTimes(1);
  });
});
