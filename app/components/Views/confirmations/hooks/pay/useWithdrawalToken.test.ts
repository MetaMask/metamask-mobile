import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useWithdrawalToken } from './useWithdrawalToken';
import { cloneDeep, merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { RootState } from '../../../../../reducers';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { TransactionType } from '@metamask/transaction-controller';

const STATE_MOCK = merge(
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
) as unknown as RootState;

function runHook({ type }: { type?: TransactionType } = {}) {
  const mockState = cloneDeep(STATE_MOCK);

  if (type) {
    mockState.engine.backgroundState.TransactionController.transactions[0].type =
      type;
  }

  return renderHookWithProvider(useWithdrawalToken, {
    state: mockState,
  });
}

describe('useWithdrawalToken', () => {
  describe('isWithdrawal', () => {
    it('returns false for non-withdrawal transaction types', () => {
      const { result } = runHook({ type: TransactionType.simpleSend });
      expect(result.current.isWithdrawal).toBe(false);
    });

    it('returns true for predictWithdraw transaction type', () => {
      const { result } = runHook({ type: TransactionType.predictWithdraw });
      expect(result.current.isWithdrawal).toBe(true);
    });
  });

  describe('canSelectWithdrawalToken', () => {
    it('returns false for non-withdrawal transactions regardless of feature flag', () => {
      const { result } = runHook({ type: TransactionType.simpleSend });
      expect(result.current.canSelectWithdrawalToken).toBe(false);
    });
  });
});
