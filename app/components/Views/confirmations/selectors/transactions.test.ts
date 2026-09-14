import { merge } from 'lodash';
import type { RootState } from '../../../../reducers';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import { selectCurrentTransaction } from './transactions';

const TRANSACTION =
  stakingDepositConfirmationState.engine.backgroundState.TransactionController
    .transactions[0];

describe('selectCurrentTransaction', () => {
  it('returns the transaction for the first pending approval', () => {
    const state = stakingDepositConfirmationState as unknown as RootState;

    const transaction = selectCurrentTransaction(state);

    expect(transaction).toBe(TRANSACTION);
  });

  it('returns undefined when there are no pending approvals', () => {
    const state = merge(
      {},
      stakingDepositConfirmationState,
    ) as unknown as RootState;
    state.engine.backgroundState.ApprovalController.pendingApprovals = {};

    const transaction = selectCurrentTransaction(state);

    expect(transaction).toBeUndefined();
  });

  it('returns undefined when the pending approval has no transaction', () => {
    const state = personalSignatureConfirmationState as unknown as RootState;

    const transaction = selectCurrentTransaction(state);

    expect(transaction).toBeUndefined();
  });

  it('returns the override transaction without a pending approval', () => {
    const state = merge(
      {},
      stakingDepositConfirmationState,
    ) as unknown as RootState;
    state.engine.backgroundState.ApprovalController.pendingApprovals = {};

    const transaction = selectCurrentTransaction(state, TRANSACTION.id);

    expect(transaction).toBe(
      state.engine.backgroundState.TransactionController.transactions[0],
    );
  });

  it('prioritizes the override over the pending approval', () => {
    const override = { ...TRANSACTION, id: 'override' };
    const state = merge(
      {},
      stakingDepositConfirmationState,
    ) as unknown as RootState;
    state.engine.backgroundState.TransactionController.transactions.push(
      override,
    );

    const transaction = selectCurrentTransaction(state, override.id);

    expect(transaction).toBe(override);
  });

  it('does not fall back to the pending transaction for a missing override', () => {
    const state = stakingDepositConfirmationState as unknown as RootState;

    const transaction = selectCurrentTransaction(state, 'missing');

    expect(transaction).toBeUndefined();
  });

  it('uses the pending approval when the gas modal override is null', () => {
    const state = stakingDepositConfirmationState as unknown as RootState;

    const transaction = selectCurrentTransaction(state, null);

    expect(transaction).toBe(TRANSACTION);
  });

  it('reuses the lookup when approval details change without changing its ID', () => {
    const state = stakingDepositConfirmationState as unknown as RootState;
    const initial = selectCurrentTransaction(state);
    const recomputations = selectCurrentTransaction.recomputations();
    const approvalController = state.engine.backgroundState.ApprovalController;
    const approval = approvalController.pendingApprovals[TRANSACTION.id];
    const nextState: RootState = {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: {
          ...state.engine.backgroundState,
          ApprovalController: {
            ...approvalController,
            pendingApprovals: {
              ...approvalController.pendingApprovals,
              [TRANSACTION.id]: {
                ...approval,
                requestData: { ...approval.requestData, name: 'Updated' },
              },
            },
          },
        },
      },
    };

    const updated = selectCurrentTransaction(nextState);

    expect(updated).toBe(initial);
    expect(selectCurrentTransaction.recomputations()).toBe(recomputations);
  });
});
