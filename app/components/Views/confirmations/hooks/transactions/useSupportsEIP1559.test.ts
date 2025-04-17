import { TransactionEnvelopeType } from '@metamask/transaction-controller';
import { cloneDeep, merge } from 'lodash';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { useSupportsEIP1559 } from './useSupportsEIP1559';

describe('useEIP1559TxFees', () => {
  it('returns true for EIP1559 transaction', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useSupportsEIP1559(
          stakingDepositConfirmationState.engine.backgroundState
            .TransactionController.transactions[0],
        ),
      {
        state: stakingDepositConfirmationState,
      },
    );

    expect(result.current.supportsEIP1559).toBe(true);
  });
  it('returns false for legacy transaction', async () => {
    const clonedTransactionMeta = cloneDeep(
      stakingDepositConfirmationState.engine.backgroundState
        .TransactionController.transactions[0],
    );
    clonedTransactionMeta.txParams.type = TransactionEnvelopeType.legacy;

    const { result } = renderHookWithProvider(
      () => useSupportsEIP1559(clonedTransactionMeta),
      {
        state: stakingDepositConfirmationState,
      },
    );

    expect(result.current.supportsEIP1559).toBe(false);
  });

  it('returns false for non-EIP1559 network', async () => {
    const state = merge({}, stakingDepositConfirmationState, {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: '0x123456',
            networksMetadata: {
              '0x123456': {
                EIPS: { 1559: false },
              },
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(
      () =>
        useSupportsEIP1559(
          state.engine.backgroundState.TransactionController.transactions[0],
        ),
      {
        state,
      },
    );
    expect(result.current.supportsEIP1559).toBe(false);
  });
});
