import { createSelector } from 'reselect';
import { EngineState } from './types';
import { ApprovalControllerState } from '@metamask/approval-controller';

const selectApprovalControllerState = (state: EngineState) =>
  state?.engine?.backgroundState?.ApprovalController;

// eslint-disable-next-line import/prefer-default-export
export const selectPendingApprovals = createSelector(
  selectApprovalControllerState,
  (approvalControllerState: ApprovalControllerState) =>
    approvalControllerState?.pendingApprovals,
);
