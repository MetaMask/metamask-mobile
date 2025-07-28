import { merge } from 'lodash';

const approvalIdMock = '699ca2f0-e459-11ef-b6f6-d182277cf5e1';

const baseApprovalMock = {
  expectsResult: true,
  id: approvalIdMock,
  origin: 'metamask',
  requestData: {},
  requestState: null,
  time: 1738825814816,
  type: 'transaction',
};

const transactionApproval = merge(baseApprovalMock, {
  requestData: { txId: approvalIdMock },
});

const baseApprovalControllerMock = {
  engine: {
    backgroundState: {
      ApprovalController: {
        pendingApprovals: {},
        pendingApprovalCount: 1,
        approvalFlows: [],
      },
    },
  },
};

export const transactionApprovalControllerMock = merge(
  {},
  baseApprovalControllerMock,
  {
    engine: {
      backgroundState: {
        ApprovalController: {
          pendingApprovals: {
            [approvalIdMock]: transactionApproval,
          },
        },
      },
    },
  },
);
