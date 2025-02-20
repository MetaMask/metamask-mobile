import { TransactionMeta } from '@metamask/transaction-controller';

import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';
import { useEIP1559TxFees } from './useEIP1559TxFees';

describe('useEIP1559TxFees', () => {
  it('returns transaction fees', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useEIP1559TxFees(
          stakingDepositConfirmationState.engine.backgroundState
            .TransactionController.transactions[0],
        ),
      {
        state: stakingDepositConfirmationState,
      },
    );
    expect(result.current.maxFeePerGas).toBe('1952008992');
    expect(result.current.maxPriorityFeePerGas).toBe('500000000');
  });

  it('returns 0 if no transaction meta present', async () => {
    const { result } = renderHookWithProvider(
      () => useEIP1559TxFees(undefined as unknown as TransactionMeta),
      {
        state: stakingDepositConfirmationState,
      },
    );

    expect(result.current.maxFeePerGas).toBe('0');
    expect(result.current.maxPriorityFeePerGas).toBe('0');
  });
});
