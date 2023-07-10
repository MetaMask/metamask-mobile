import { createSelector } from 'reselect';
import { EngineState } from './types';
import { ApprovalControllerState } from '@metamask/approval-controller';

const selectApprovalControllerState = (state: EngineState) =>
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
