import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { ApprovalControllerState } from '@metamask/approval-controller';

const selectApprovalControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.ApprovalController;

export const selectPendingApprovals = createSelector(
  selectApprovalControllerState,
  (approvalControllerState: ApprovalControllerState) =>
    approvalControllerState?.pendingApprovals,
);

export const selectApprovalFlows = createSelector(
  selectApprovalControllerState,
  (approvalControllerState: ApprovalControllerState) =>
    approvalControllerState?.approvalFlows,
);
