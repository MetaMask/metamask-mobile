import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { ApprovalControllerState } from '@metamask/approval-controller';

const DEFAULT_APPROVALS = {};

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

export const selectFirstPendingApproval = createSelector(
  selectPendingApprovals,
  (pendingApprovals) => Object.values(pendingApprovals ?? DEFAULT_APPROVALS)[0],
);
