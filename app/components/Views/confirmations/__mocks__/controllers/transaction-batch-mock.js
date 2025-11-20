import { ApprovalType } from '@metamask/controller-utils';
import {
  contractInteractionBaseState,
  mockApprovalRequest,
  mockTransaction,
  mockTxId,
} from '../../../../../util/test/confirm-data-helpers';

export const generateStablecoinLendingDepositConfirmationState = {
  ...contractInteractionBaseState,
  engine: {
    ...contractInteractionBaseState.engine,
    backgroundState: {
      ...contractInteractionBaseState.engine.backgroundState,
      // Set a completely new ApprovalController to reject the approval in
      // stakingConfirmationBaseState
      ApprovalController: {
        pendingApprovals: {
          [mockTxId]: {
            ...mockApprovalRequest,
            type: ApprovalType.TransactionBatch,
            origin: 'metamask',
          },
        },
        pendingApprovalCount: 1,
        approvalFlows: [],
      },
      TransactionController: {
        transactions: [
          {
            ...mockTransaction,
            origin: 'metamask',
            from: mockTransaction.txParams.from,
          },
        ],
        transactionBatches: [
          {
            ...mockTransaction,
            origin: 'metamask',
            from: mockTransaction.txParams.from,
          },
        ],
      },
    },
  },
};
